import { createAdminClient } from '@/lib/supabase/server'

/**
 * RPC result types for credit operations.
 *
 * TYPE GENERATION NOTE:
 * These types are manually defined to match the PostgreSQL RPC functions.
 * For full type safety, generate types from your Supabase schema:
 *
 * ```bash
 * npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/database.types.ts
 * ```
 *
 * Then update createAdminClient to use the generated types:
 * ```ts
 * import { Database } from './database.types'
 * createClient<Database>(...)
 * ```
 */

/** Result from spend_storywork_credits RPC function */
interface SpendCreditsResult {
  success: boolean
  new_balance: number
  error?: string
}

/** Result from add_storywork_credits RPC function */
interface AddCreditsResult {
  success: boolean
  new_balance: number
}

/** Result from reserve_credits RPC function */
interface ReserveCreditsResult {
  success: boolean
  reservation_id?: string
  error?: string
}

/**
 * Type helper for Supabase RPC calls.
 * This approximates the RPC signature until proper types are generated.
 */
interface SupabaseRpc<T = unknown> {
  (fn: string, args: Record<string, unknown>): Promise<{
    data: T[] | null
    error: { message: string } | null
  }>
}

/**
 * Type helper for Supabase table queries.
 * This approximates the query builder until proper types are generated.
 */
type SupabaseFrom = (table: string) => {
  select: (columns: string) => {
    eq: (column: string, value: unknown) => {
      single: () => Promise<{ data: unknown; error: unknown }>
    }
  }
}

export type CreditTransactionType =
  | 'storywork_basic_story'
  | 'storywork_voice_story'
  | 'storywork_carousel'
  | 'storywork_slide_regen'
  | 'subscription_credit'
  | 'subscription_bonus'
  | 'adjustment'
  | 'refund'

export interface CreditBalance {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
  unifiedBalance?: number // Balance from unified credits system
}

export interface StoryworkUser {
  id: string
  clerk_id: string
  email: string
  credit_balance: number
  lifetime_credits: number
  asm_agent_id: string | null
  stripe_customer_id: string | null
  subscription_status: string | null
  subscription_tier: string | null
  created_at: string
}

export interface UnifiedUser {
  id: string
  email: string
  asm_agent_id: string | null
  storywork_user_id: string | null
  storywork_clerk_id: string | null
  credit_balance: number
  lifetime_credits: number
}

/**
 * Get or create a Storywork user from Clerk authentication.
 * If a user with matching email exists (from ASM Portal), it will be linked to the Clerk ID.
 *
 * @param clerkId - Clerk user ID from authentication
 * @param email - User's email address
 * @returns The Storywork user record
 * @throws Error if user creation fails
 *
 * @example
 * ```ts
 * const user = await getOrCreateUser(userId, email)
 * console.log(`User ${user.id} has ${user.credit_balance} credits`)
 * ```
 */
export async function getOrCreateUser(clerkId: string, email: string): Promise<StoryworkUser> {
  const supabase = createAdminClient()

  // Try to find existing user
  const { data: existingUser } = await supabase
    .from('storywork_users')
    .select('*')
    .eq('clerk_id', clerkId)
    .single()

  if (existingUser) {
    return existingUser as StoryworkUser
  }

  // Check if there's a user with matching email (might be linked from ASM)
  const { data: emailUser } = await supabase
    .from('storywork_users')
    .select('*')
    .eq('email', email)
    .single()

  if (emailUser) {
    // Update with Clerk ID
    const { data: updated } = await supabase
      .from('storywork_users')
      .update({ clerk_id: clerkId })
      .eq('id', emailUser.id)
      .select()
      .single()
    return updated as StoryworkUser
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('storywork_users')
    .insert({
      clerk_id: clerkId,
      email,
      credit_balance: 0,
      lifetime_credits: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`)
  }

  return newUser as StoryworkUser
}

/**
 * Get the credit balance for a user.
 * Includes current balance, lifetime earned, and lifetime spent.
 *
 * @param userId - The Storywork user ID
 * @returns Credit balance information
 */
export async function getBalance(userId: string): Promise<CreditBalance> {
  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from('storywork_users')
    .select('credit_balance, lifetime_credits')
    .eq('id', userId)
    .single()

  // Get lifetime spent from transactions
  const { data: transactions } = await supabase
    .from('storywork_credit_transactions')
    .select('amount')
    .eq('user_id', userId)
    .lt('amount', 0)

  const lifetimeSpent = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

  return {
    balance: user?.credit_balance || 0,
    lifetimeEarned: user?.lifetime_credits || 0,
    lifetimeSpent,
  }
}

/**
 * Spend credits from a user's balance.
 * First tries ASM Portal credits if the user is linked, then falls back to local credits.
 * Uses atomic database operations to prevent race conditions.
 *
 * @param userId - The Storywork user ID
 * @param amount - Number of credits to spend (positive integer)
 * @param type - Transaction type for categorization
 * @param description - Human-readable description of the transaction
 * @param idempotencyKey - Optional key to prevent duplicate transactions
 * @returns Result with success status and new balance
 */
export async function spendCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string,
  idempotencyKey?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = createAdminClient()

  // Get user to check for ASM linking
  const { data: user, error: userError } = await supabase
    .from('storywork_users')
    .select('credit_balance, asm_agent_id')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return { success: false, newBalance: 0, error: 'User not found' }
  }

  // If user is linked to ASM, try to spend from ASM Portal credits first
  if (user.asm_agent_id && process.env.ASM_PORTAL_URL && process.env.SERVICE_API_KEY) {
    try {
      const response = await fetch(`${process.env.ASM_PORTAL_URL}/api/credits/spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': process.env.SERVICE_API_KEY,
        },
        body: JSON.stringify({
          agent_id: user.asm_agent_id,
          amount,
          type,
          description,
          source_platform: 'storywork',
        }),
        signal: AbortSignal.timeout(15000), // 15 second timeout for ASM Portal
      })

      // Check HTTP status before parsing JSON
      if (!response.ok) {
        console.warn(`ASM Portal returned ${response.status}: ${response.statusText}`)
        // Fall through to local credits
      } else {
        const result = await response.json()
        if (result.success) {
          // Log locally for tracking
          await supabase.from('storywork_credit_transactions').insert({
            user_id: userId,
            amount: -amount,
            type,
            description,
            source: 'asm_credits',
          })
          return { success: true, newBalance: result.newBalance }
        }
        // result.success is false - insufficient ASM credits, fall through to local
        console.log('ASM credits insufficient, falling back to local credits')
      }
    } catch (error) {
      // Network error or JSON parse error - fall through to local credits
      console.error('Failed to spend ASM credits:', error)
    }
  }

  // Use atomic RPC function to spend credits (prevents race conditions)
  const { data, error } = await (supabase.rpc as unknown as SupabaseRpc<SpendCreditsResult>)('spend_storywork_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_source: 'storywork_credits',
    p_idempotency_key: idempotencyKey || null,
  })

  if (error) {
    console.error('RPC spend_storywork_credits error:', error)
    return {
      success: false,
      newBalance: user.credit_balance || 0,
      error: 'Failed to update credits',
    }
  }

  const result = data?.[0]
  if (!result?.success) {
    return {
      success: false,
      newBalance: result?.new_balance || user.credit_balance || 0,
      error: result?.error || 'Failed to spend credits',
    }
  }

  return { success: true, newBalance: result.new_balance }
}

/**
 * Add credits to a user's balance.
 * Used for subscription credit allocations, bonuses, and refunds.
 * Falls back to legacy approach if RPC function is not deployed.
 *
 * @param userId - The Storywork user ID
 * @param amount - Number of credits to add (positive integer)
 * @param type - Transaction type for categorization
 * @param description - Human-readable description of the transaction
 * @param idempotencyKey - Optional key to prevent duplicate transactions
 * @returns Result with success status and new balance
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string,
  idempotencyKey?: string
): Promise<{ success: boolean; newBalance: number }> {
  const supabase = createAdminClient()

  // Use atomic RPC function to add credits (prevents race conditions)
  const { data, error } = await (supabase.rpc as unknown as SupabaseRpc<AddCreditsResult>)('add_storywork_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description,
    p_source: 'storywork_subscription',
    p_idempotency_key: idempotencyKey || null,
  })

  if (error) {
    console.error('RPC add_storywork_credits error:', error)
    // Fallback to legacy approach if RPC not yet deployed
    const { data: user } = await supabase
      .from('storywork_users')
      .select('credit_balance, lifetime_credits')
      .eq('id', userId)
      .single()

    const newBalance = (user?.credit_balance || 0) + amount
    const newLifetime = (user?.lifetime_credits || 0) + amount

    await Promise.all([
      supabase
        .from('storywork_users')
        .update({
          credit_balance: newBalance,
          lifetime_credits: newLifetime,
        })
        .eq('id', userId),
      supabase.from('storywork_credit_transactions').insert({
        user_id: userId,
        amount,
        type,
        description,
        source: 'storywork_subscription',
      }),
    ])

    return { success: true, newBalance }
  }

  const result = data?.[0]
  return { success: result?.success || false, newBalance: result?.new_balance || 0 }
}

/**
 * Link a Storywork user to an ASM Portal agent account.
 * This enables cross-platform credit sharing.
 *
 * @param userId - The Storywork user ID
 * @param asmEmail - Email address of the ASM Portal agent account
 * @returns Result with success status and optional error message
 */
export async function linkAsmAccount(
  userId: string,
  asmEmail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Look up agent by email in ASM Portal
  const { data: agent } = await supabase
    .from('agents')
    .select('id, email')
    .eq('email', asmEmail)
    .single()

  if (!agent) {
    // Return generic error to prevent user enumeration
    return { success: false, error: 'Failed to link account' }
  }

  // Update storywork user with ASM agent ID
  const { error } = await supabase
    .from('storywork_users')
    .update({ asm_agent_id: agent.id })
    .eq('id', userId)

  if (error) {
    return { success: false, error: 'Failed to link account' }
  }

  // Also link in unified_users table
  const { data: storyworkUser } = await supabase
    .from('storywork_users')
    .select('clerk_id, email')
    .eq('id', userId)
    .single()

  if (storyworkUser) {
    await linkUnifiedUser(storyworkUser.email, agent.id, userId, storyworkUser.clerk_id)
  }

  return { success: true }
}

// =====================
// UNIFIED CREDITS FUNCTIONS
// =====================

/**
 * Link or create a unified user across ASM platforms.
 * Merges accounts from different platforms into a single unified identity.
 *
 * @param email - User's email address (primary identifier)
 * @param asmAgentId - Optional ASM Portal agent ID
 * @param storyworkUserId - Optional Storywork user ID
 * @param storyworkClerkId - Optional Clerk authentication ID
 * @returns The unified user record or null if creation failed
 */
export async function linkUnifiedUser(
  email: string,
  asmAgentId?: string,
  storyworkUserId?: string,
  storyworkClerkId?: string
): Promise<UnifiedUser | null> {
  const supabase = createAdminClient()

  // Use the database function (types not yet generated)
  const { data: unifiedUserId, error } = await (supabase.rpc as unknown as SupabaseRpc<string>)('get_or_create_unified_user', {
    p_email: email,
    p_asm_agent_id: asmAgentId || null,
    p_storywork_user_id: storyworkUserId || null,
    p_storywork_clerk_id: storyworkClerkId || null,
  })

  if (error) {
    console.error('Failed to link unified user:', error)
    return null
  }

  // Fetch the full user record (types not yet generated)
  const { data: user } = await (supabase.from as unknown as SupabaseFrom)('unified_users')
    .select('*')
    .eq('id', unifiedUserId)
    .single()

  return user as UnifiedUser | null
}

/**
 * Get a unified user by their Clerk authentication ID.
 *
 * @param clerkId - Clerk user ID
 * @returns The unified user record or null if not found
 */
export async function getUnifiedUserByClerkId(clerkId: string): Promise<UnifiedUser | null> {
  const supabase = createAdminClient()

  const { data } = await (supabase.from as unknown as SupabaseFrom)('unified_users')
    .select('*')
    .eq('storywork_clerk_id', clerkId)
    .single()

  return data as UnifiedUser | null
}

/**
 * Get combined credit balance from local and unified credits systems.
 * Returns the sum of both balances when a user is linked to unified credits.
 *
 * @param userId - The Storywork user ID
 * @returns Combined credit balance including unified credits if linked
 */
export async function getUnifiedBalance(userId: string): Promise<CreditBalance> {
  const supabase = createAdminClient()

  // Get local storywork balance
  const localBalance = await getBalance(userId)

  // Try to get unified balance
  const { data: storyworkUser } = await supabase
    .from('storywork_users')
    .select('clerk_id, email')
    .eq('id', userId)
    .single()

  if (!storyworkUser?.clerk_id) {
    return localBalance
  }

  const unifiedUser = await getUnifiedUserByClerkId(storyworkUser.clerk_id)

  if (unifiedUser) {
    return {
      ...localBalance,
      balance: localBalance.balance + unifiedUser.credit_balance,
      unifiedBalance: unifiedUser.credit_balance,
    }
  }

  return localBalance
}

/**
 * Spend credits from the unified credits system with fallback to local credits.
 * Prioritizes unified credits when available and sufficient.
 *
 * @param userId - The Storywork user ID
 * @param amount - Number of credits to spend
 * @param type - Transaction type for categorization
 * @param description - Human-readable description
 * @param referenceId - Optional reference to associated resource (e.g., story ID)
 * @returns Result with success status and new balance
 */
export async function spendUnifiedCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string,
  referenceId?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = createAdminClient()

  // Get storywork user
  const { data: storyworkUser } = await supabase
    .from('storywork_users')
    .select('clerk_id, email, credit_balance')
    .eq('id', userId)
    .single()

  if (!storyworkUser) {
    return { success: false, newBalance: 0, error: 'User not found' }
  }

  // Try unified credits first
  const unifiedUser = storyworkUser.clerk_id
    ? await getUnifiedUserByClerkId(storyworkUser.clerk_id)
    : null

  if (unifiedUser && unifiedUser.credit_balance >= amount) {
    // Spend from unified
    const { data, error } = await (supabase.rpc as unknown as SupabaseRpc<SpendCreditsResult>)('spend_unified_credits', {
      p_unified_user_id: unifiedUser.id,
      p_amount: amount,
      p_transaction_type: type,
      p_source_platform: 'storywork',
      p_description: description,
      p_idempotency_key: `storywork_${userId}_${Date.now()}`,
      p_reference_id: referenceId || null,
      p_reference_type: referenceId ? 'story' : null,
    })

    if (!error && data?.[0]?.success) {
      // Log locally for tracking
      await supabase.from('storywork_credit_transactions').insert({
        user_id: userId,
        amount: -amount,
        type,
        description,
        source: 'unified_credits',
      })

      return { success: true, newBalance: data[0].new_balance }
    }
  }

  // Fall back to local credits
  return spendCredits(userId, amount, type, description)
}

/**
 * Reserve credits in the unified system for a pending operation.
 * Reservations hold credits temporarily until committed or released.
 *
 * @param userId - The Storywork user ID
 * @param amount - Number of credits to reserve
 * @param purpose - Description of what the reservation is for
 * @param referenceId - Optional reference to associated resource
 * @returns Result with reservation ID if successful
 */
export async function reserveUnifiedCredits(
  userId: string,
  amount: number,
  purpose: string,
  referenceId?: string
): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  const supabase = createAdminClient()

  const { data: storyworkUser } = await supabase
    .from('storywork_users')
    .select('clerk_id')
    .eq('id', userId)
    .single()

  if (!storyworkUser?.clerk_id) {
    return { success: false, error: 'User not linked to unified system' }
  }

  const unifiedUser = await getUnifiedUserByClerkId(storyworkUser.clerk_id)

  if (!unifiedUser) {
    return { success: false, error: 'Unified user not found' }
  }

  const { data, error } = await (supabase.rpc as unknown as SupabaseRpc<ReserveCreditsResult>)('reserve_credits', {
    p_unified_user_id: unifiedUser.id,
    p_amount: amount,
    p_purpose: purpose,
    p_reference_id: referenceId || null,
    p_reference_type: referenceId ? 'story' : null,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = data?.[0]
  if (!result?.success) {
    return { success: false, error: result?.error || 'Unknown error' }
  }

  return { success: true, reservationId: result.reservation_id }
}

/**
 * Commit a credit reservation, permanently deducting the reserved credits.
 * Call this after the associated operation completes successfully.
 *
 * @param reservationId - The reservation ID from reserveUnifiedCredits
 * @param idempotencyKey - Optional key to prevent duplicate commits
 * @returns Result with success status and new balance
 */
export async function commitReservation(
  reservationId: string,
  idempotencyKey?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase.rpc as unknown as SupabaseRpc<SpendCreditsResult>)('commit_reservation', {
    p_reservation_id: reservationId,
    p_idempotency_key: idempotencyKey || null,
  })

  if (error) {
    return { success: false, newBalance: 0, error: error.message }
  }

  const result = data?.[0]
  if (!result?.success) {
    return { success: false, newBalance: 0, error: result?.error || 'Unknown error' }
  }

  return { success: true, newBalance: result.new_balance }
}

/**
 * Release a credit reservation, returning the credits to the user's balance.
 * Call this if the associated operation fails or is cancelled.
 *
 * @param reservationId - The reservation ID from reserveUnifiedCredits
 * @returns True if the reservation was successfully released
 */
export async function releaseReservation(reservationId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase.rpc as unknown as SupabaseRpc<boolean>)('release_reservation', {
    p_reservation_id: reservationId,
  })

  if (error) {
    return false
  }

  return data?.[0] === true
}
