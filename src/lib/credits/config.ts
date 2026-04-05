/**
 * Credit cost configuration for Storywork operations.
 * Costs can be overridden via environment variables.
 */

// Parse int with fallback
const parseIntEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Credit costs for different operations.
 * These values can be adjusted via environment variables:
 * - CREDIT_COST_STORY_DETECTION
 * - CREDIT_COST_STORY_GENERATION
 * - CREDIT_COST_VOICE_TRANSCRIPTION
 */
export const CREDIT_COSTS = {
  /** Cost for AI story type detection */
  storyDetection: parseIntEnv(process.env.CREDIT_COST_STORY_DETECTION, 50),

  /** Cost for full carousel content generation */
  storyGeneration: parseIntEnv(process.env.CREDIT_COST_STORY_GENERATION, 75),

  /** Cost for voice transcription */
  voiceTranscription: parseIntEnv(process.env.CREDIT_COST_VOICE_TRANSCRIPTION, 60),

  /** Cost for single slide regeneration */
  slideRegeneration: parseIntEnv(process.env.CREDIT_COST_SLIDE_REGENERATION, 15),
} as const

/**
 * Credit amounts for subscription tiers (monthly).
 */
export const SUBSCRIPTION_CREDITS = {
  starter: 750,
  pro: 2250,
  team: Infinity, // Unlimited
} as const

/**
 * Get the display name for a credit operation type.
 */
export function getCreditOperationName(type: string): string {
  switch (type) {
    case 'storywork_basic_story':
      return 'Story Detection'
    case 'storywork_voice_story':
      return 'Voice Transcription'
    case 'storywork_carousel':
      return 'Carousel Generation'
    case 'subscription_credit':
      return 'Subscription Credit'
    case 'subscription_bonus':
      return 'Bonus Credit'
    case 'adjustment':
      return 'Credit Adjustment'
    case 'storywork_slide_regen':
      return 'Slide Regeneration'
    case 'refund':
      return 'Refund'
    default:
      return 'Credit Operation'
  }
}
