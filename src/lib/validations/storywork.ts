import { z } from 'zod'

// Constants for validation
// Legacy story types (backward compatibility)
export const LEGACY_STORY_TYPES = ['against_the_odds', 'fresh_drop', 'behind_the_deal'] as const

// All story archetypes organized by content pillar
export const STORY_ARCHETYPES = [
  // THE HUNT - Client Journeys
  'against_the_odds',
  'first_steps',
  'the_return',
  // THE STAGE - Property Showcase
  'fresh_drop',
  'hidden_gem',
  // THE ARENA - Market & Competition
  'market_pulse',
  'battle_tested',
  // THE CRAFT - Professional Expertise
  'behind_the_deal',
  'the_breakdown',
  // THE NEIGHBORHOOD - Community & Lifestyle
  'local_legend',
  'day_in_the_life',
  'lifestyle_spotlight',
  'neighborhood_guide',
  // THE MIRROR - Personal Growth
  'lessons_learned',
  'why_i_do_this',
  'the_grind',
] as const

// Content pillars
export const CONTENT_PILLARS = [
  'the_hunt',
  'the_stage',
  'the_arena',
  'the_craft',
  'the_neighborhood',
  'the_mirror',
] as const

// Combined story types (includes all archetypes for backward compatibility)
export const STORY_TYPES = STORY_ARCHETYPES

export const CAROUSEL_FORMATS = ['instagram-feed', 'instagram-story', 'linkedin'] as const

// Hex color validation regex (supports #RGB and #RRGGBB)
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

// Story Detection Schema
export const storyDetectSchema = z.object({
  input: z
    .string()
    .trim()
    .min(20, 'Story input must be at least 20 characters')
    .max(15000, 'Story input must not exceed 15000 characters'),
})

export type StoryDetectInput = z.infer<typeof storyDetectSchema>

// Story Generation Schema (text-based)
export const storyGenerateSchema = z.object({
  storyId: z.string().uuid('Invalid story ID format'),
  storyType: z.enum(STORY_TYPES, {
    errorMap: () => ({ message: `Story type must be one of: ${STORY_TYPES.join(', ')}` }),
  }),
  answers: z
    .record(z.string(), z.string())
    .refine((obj) => Object.keys(obj).length > 0, 'At least one answer is required'),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

export type StoryGenerateInput = z.infer<typeof storyGenerateSchema>

// Voice Story Generation Schema
export const voiceStoryGenerateSchema = z.object({
  storyId: z.string().uuid('Invalid story ID format'),
  transcript: z
    .string()
    .trim()
    .min(50, 'Transcript must be at least 50 characters')
    .max(20000, 'Transcript must not exceed 20000 characters'),
  storyType: z
    .enum(STORY_TYPES, {
      errorMap: () => ({ message: `Story type must be one of: ${STORY_TYPES.join(', ')}` }),
    })
    .optional(), // Optional - will be auto-detected if not provided
})

export type VoiceStoryGenerateInput = z.infer<typeof voiceStoryGenerateSchema>

// Slide Content Schema
export const slideContentSchema = z
  .object({
    headline: z.string().min(1, 'Headline is required'),
    body: z.string().min(1, 'Body is required'),
    visual_suggestion: z.string().min(1, 'Visual suggestion is required'),
    slideNumber: z.number().int().min(1, 'Slide number must be positive'),
    totalSlides: z.number().int().min(1, 'Total slides must be positive'),
  })
  .refine((data) => data.slideNumber <= data.totalSlides, {
    message: 'Slide number cannot be greater than total slides',
    path: ['slideNumber'],
  })

export type SlideContent = z.infer<typeof slideContentSchema>

// Brand Kit Schema
export const brandKitSchema = z.object({
  id: z.string().min(1, 'Brand kit ID is required'),
  name: z.string(),
  primary_color: z.string().regex(hexColorRegex, 'Invalid hex color format'),
  secondary_color: z.string().regex(hexColorRegex, 'Invalid hex color format'),
  font_family: z.string().min(1, 'Font family is required'),
  logo_url: z.string().url('Invalid logo URL').nullable(),
  headshot_url: z.string().url('Invalid headshot URL').nullable(),
})

export type BrandKit = z.infer<typeof brandKitSchema>

// Carousel Render Schema (single slide)
export const carouselRenderSchema = z.object({
  slide: slideContentSchema,
  brandKit: brandKitSchema,
  format: z.enum(CAROUSEL_FORMATS, {
    errorMap: () => ({ message: `Format must be one of: ${CAROUSEL_FORMATS.join(', ')}` }),
  }),
})

export type CarouselRenderInput = z.infer<typeof carouselRenderSchema>

// Carousel Export Schema (batch)
export const carouselExportSchema = z.object({
  storyId: z.string().uuid('Invalid story ID format'),
  storyTitle: z.string().min(1, 'Story title is required'),
  slides: z
    .array(slideContentSchema)
    .min(1, 'At least one slide is required')
    .max(10, 'Maximum 10 slides allowed'),
  brandKit: brandKitSchema,
  format: z.enum(CAROUSEL_FORMATS),
})

export type CarouselExportInput = z.infer<typeof carouselExportSchema>

// Transcription Schema (for voice input)
export const transcriptionSchema = z.object({
  audio: z.instanceof(Blob).or(z.instanceof(File)),
  language: z.string().optional().default('en'),
})

export type TranscriptionInput = z.infer<typeof transcriptionSchema>

// Credit spending schema
export const creditSpendSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  amount: z.number().int().positive('Amount must be positive'),
  type: z.enum([
    'storywork_basic_story',
    'storywork_voice_story',
    'storywork_carousel',
    'subscription_credit',
    'subscription_bonus',
    'adjustment',
    'refund',
  ]),
  description: z.string().min(1, 'Description is required'),
  idempotencyKey: z.string().optional(),
})

export type CreditSpendInput = z.infer<typeof creditSpendSchema>

// Helper function to validate and return typed data or throw
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errorMessages = result.error.issues.map((i) => i.message).join(', ')
    throw new Error(`Validation failed: ${errorMessages}`)
  }
  return result.data
}

// Helper to create API error response
export function createValidationError(error: z.ZodError) {
  return {
    success: false,
    error: 'Validation failed',
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  }
}

// Archetype and Pillar Types
export type StoryArchetypeId = (typeof STORY_ARCHETYPES)[number]
export type ContentPillarId = (typeof CONTENT_PILLARS)[number]
export type LegacyStoryType = (typeof LEGACY_STORY_TYPES)[number]

// Story Archetype Schema (for API responses)
export const storyArchetypeSchema = z.enum(STORY_ARCHETYPES, {
  errorMap: () => ({ message: `Story archetype must be one of: ${STORY_ARCHETYPES.join(', ')}` }),
})

// Content Pillar Schema
export const contentPillarSchema = z.enum(CONTENT_PILLARS, {
  errorMap: () => ({ message: `Content pillar must be one of: ${CONTENT_PILLARS.join(', ')}` }),
})

// Story Detection Response Schema
export const storyDetectResponseSchema = z.object({
  detected_type: storyArchetypeSchema,
  confidence: z.number().min(0).max(1),
  pillar_id: contentPillarSchema,
  reasoning: z.string(),
  alternative_type: storyArchetypeSchema.optional(),
  alternative_confidence: z.number().min(0).max(1).optional(),
})

export type StoryDetectResponse = z.infer<typeof storyDetectResponseSchema>

// Extended Story Generation Schema (with pillar support)
export const storyGenerateExtendedSchema = z.object({
  storyId: z.string().uuid('Invalid story ID format'),
  storyType: storyArchetypeSchema,
  pillarId: contentPillarSchema.optional(),
  answers: z
    .record(z.string(), z.string())
    .refine((obj) => Object.keys(obj).length > 0, 'At least one answer is required'),
})

export type StoryGenerateExtendedInput = z.infer<typeof storyGenerateExtendedSchema>

// Story Generation Response Schema (with archetype metadata)
export const storyGenerateResponseSchema = z.object({
  slides: z.array(
    z.object({
      headline: z.string(),
      body: z.string(),
      visual_suggestion: z.string(),
    })
  ),
  hashtags: z.array(z.string()),
  caption: z.string(),
  archetype_id: storyArchetypeSchema.optional(),
  pillar_id: contentPillarSchema.optional(),
})

export type StoryGenerateResponse = z.infer<typeof storyGenerateResponseSchema>
