import { createAdminClient } from '@/lib/supabase/server'

export type CreditTransactionType =
  | 'storywork_basic_story'
  | 'storywork_voice_story'
  | 'storywork_carousel'
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

export async function spendCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = createAdminClient()

  // Get current balance
  const { data: user, error: userError } = await supabase
    .from('storywork_users')
    .select('credit_balance, asm_agent_id')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return { success: false, newBalance: 0, error: 'User not found' }
  }

  // If user is linked to ASM, try to spend from ASM Portal credits first
  if (user.asm_agent_id) {
    try {
      const response = await fetch(`${process.env.ASM_PORTAL_URL}/api/credits/spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': process.env.SERVICE_API_KEY!,
        },
        body: JSON.stringify({
          agent_id: user.asm_agent_id,
          amount,
          type,
          description,
          source_platform: 'storywork',
        }),
      })

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
      // If ASM credits insufficient, fall through to local credits
    } catch (error) {
      console.error('Failed to spend ASM credits:', error)
    }
  }

  // Spend from local Storywork credits
  if ((user.credit_balance || 0) < amount) {
    return {
      success: false,
      newBalance: user.credit_balance || 0,
      error: 'Insufficient credits',
    }
  }

  const newBalance = (user.credit_balance || 0) - amount

  // Update balance and log transaction
  const [updateResult, insertResult] = await Promise.all([
    supabase.from('storywork_users').update({ credit_balance: newBalance }).eq('id', userId),
    supabase.from('storywork_credit_transactions').insert({
      user_id: userId,
      amount: -amount,
      type,
      description,
      source: 'storywork_credits',
    }),
  ])

  if (updateResult.error || insertResult.error) {
    return {
      success: false,
      newBalance: user.credit_balance || 0,
      error: 'Failed to update credits',
    }
  }

  return { success: true, newBalance }
}

export async function addCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string
): Promise<{ success: boolean; newBalance: number }> {
  const supabase = createAdminClient()

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
    return { success: false, error: 'No ASM account found with that email' }
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

// Link or create unified user
export async function linkUnifiedUser(
  email: string,
  asmAgentId?: string,
  storyworkUserId?: string,
  storyworkClerkId?: string
): Promise<UnifiedUser | null> {
  const supabase = createAdminClient()

  // Use the database function (cast to any since RPC types aren't generated yet)
  const { data: unifiedUserId, error } = await (supabase.rpc as Function)('get_or_create_unified_user', {
    p_email: email,
    p_asm_agent_id: asmAgentId || null,
    p_storywork_user_id: storyworkUserId || null,
    p_storywork_clerk_id: storyworkClerkId || null,
  })

  if (error) {
    console.error('Failed to link unified user:', error)
    return null
  }

  // Fetch the full user record (cast to any since table types aren't generated yet)
  const { data: user } = await (supabase.from as Function)('unified_users')
    .select('*')
    .eq('id', unifiedUserId)
    .single()

  return user as UnifiedUser | null
}

// Get unified user by Clerk ID
export async function getUnifiedUserByClerkId(clerkId: string): Promise<UnifiedUser | null> {
  const supabase = createAdminClient()

  const { data } = await (supabase.from as Function)('unified_users')
    .select('*')
    .eq('storywork_clerk_id', clerkId)
    .single()

  return data as UnifiedUser | null
}

// Get unified balance (combines local + unified)
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

// Spend from unified credits (with fallback to local)
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
    const { data, error } = await (supabase.rpc as Function)('spend_unified_credits', {
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

// Reserve credits in unified system
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

  const { data, error } = await (supabase.rpc as Function)('reserve_credits', {
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

// Commit a credit reservation
export async function commitReservation(
  reservationId: string,
  idempotencyKey?: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase.rpc as Function)('commit_reservation', {
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

// Release a credit reservation
export async function releaseReservation(reservationId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await (supabase.rpc as Function)('release_reservation', {
    p_reservation_id: reservationId,
  })

  if (error) {
    return false
  }

  return data === true
}
