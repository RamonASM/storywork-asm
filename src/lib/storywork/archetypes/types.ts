/**
 * Story Archetype System Types
 *
 * A modular, data-driven archetype system inspired by Robert McKee's
 * storytelling principles. Each archetype follows a 5-phase narrative arc.
 */

// Content Pillars - High-level categories for organizing story types
export type ContentPillarId =
  | 'the_hunt'
  | 'the_stage'
  | 'the_arena'
  | 'the_craft'
  | 'the_neighborhood'
  | 'the_mirror'

// All available story archetypes
export type StoryArchetypeId =
  // THE HUNT - Client Journeys
  | 'against_the_odds'
  | 'first_steps'
  | 'the_return'
  // THE STAGE - Property Showcase
  | 'fresh_drop'
  | 'hidden_gem'
  // THE ARENA - Market & Competition
  | 'market_pulse'
  | 'battle_tested'
  // THE CRAFT - Professional Expertise
  | 'behind_the_deal'
  | 'the_breakdown'
  // THE NEIGHBORHOOD - Community & Lifestyle
  | 'local_legend'
  | 'day_in_the_life'
  | 'lifestyle_spotlight'
  | 'neighborhood_guide'
  // THE MIRROR - Personal Growth
  | 'lessons_learned'
  | 'why_i_do_this'
  | 'the_grind'

/**
 * Content Pillar Definition
 * High-level category that groups related story archetypes
 */
export interface ContentPillar {
  id: ContentPillarId
  name: string
  displayName: string // e.g., "THE HUNT"
  subtitle: string // e.g., "Client Journeys"
  description: string
  icon: string // Lucide icon name
  color: string // Tailwind color class
  archetypeIds: StoryArchetypeId[]
  isActive: boolean
}

/**
 * McKee-inspired Narrative Arc
 * Every story follows this 5-phase structure
 */
export interface NarrativeArc {
  incitingIncident: string // What starts the story
  risingAction: string // Complications and stakes
  crisis: string // The pivotal moment
  climax: string // The breakthrough/decision
  resolution: string // The new equilibrium + lesson
}

/**
 * Trigger Moment - When this story naturally occurs
 */
export interface TriggerMoment {
  moment: string // e.g., "Just won a bidding war"
  contextClues: string[] // Words/phrases that indicate this
  urgency: 'immediate' | 'same_day' | 'this_week' | 'anytime'
}

/**
 * Guided Question for story input
 */
export interface ArchetypeQuestion {
  id: string
  question: string
  purpose: string // What narrative element this captures
  narrativeMapping: keyof NarrativeArc
  placeholder?: string
  optional: boolean
  followUpTriggers?: {
    keyword: string
    followUpQuestion: string
  }[]
}

/**
 * Slide-specific guidance for carousel generation
 */
export interface SlideGuidance {
  slideNumber: number
  purpose: string // e.g., "Hook", "Build tension", "Reveal"
  contentFocus: string
  suggestedFormat: 'bold_statement' | 'question' | 'data_point' | 'quote' | 'cta'
  emotionalBeat: string
}

/**
 * AI Prompt Configuration for this archetype
 */
export interface PromptConfig {
  systemContext: string // Additional context for AI
  toneGuidance: string // How to write for this archetype
  slideStructure: SlideGuidance[]
  avoidPhrases: string[] // Phrases to never use
  emphasize: string[] // Themes to emphasize
}

/**
 * Example scenario for this archetype
 */
export interface ExampleScenario {
  title: string
  situation: string
  sampleInput: string
  expectedOutput: {
    hook: string
    keyMoment: string
  }
}

/**
 * Story Archetype - Complete definition
 */
export interface StoryArchetype {
  // Identification
  id: StoryArchetypeId
  name: string // Display name: "Against the Odds"
  version: number // Schema version for migrations

  // Pillar Association
  pillarId: ContentPillarId
  pillarName: string // For display

  // Core Narrative Elements (McKee-informed)
  controllingIdea: string // The central truth/theme
  emotionalCore: string[] // Primary emotions: ["triumph", "perseverance"]

  // Narrative Structure
  narrativeArc: NarrativeArc

  // Discovery Triggers
  triggerMoments: TriggerMoment[]
  triggerKeywords: string[] // Words that suggest this archetype

  // Guided Questions (for text input flow)
  questions: ArchetypeQuestion[]

  // AI Prompt Configuration
  promptConfig: PromptConfig

  // Visual Suggestions
  visualThemes: string[]

  // Metadata
  isActive: boolean
  isSeasonal: boolean
  seasonalConfig?: {
    activeMonths: number[] // 1-12
    specialEvents?: string[] // "new_year", "spring_market"
  }

  // Usage hints and examples
  usageHints: string[]
  exampleScenarios: ExampleScenario[]
}

/**
 * Minimal archetype data for UI selection
 */
export interface ArchetypeSummary {
  id: StoryArchetypeId
  name: string
  pillarId: ContentPillarId
  pillarName: string
  controllingIdea: string
  emotionalCore: string[]
  icon?: string
}

/**
 * Registry of all archetypes
 */
export interface ArchetypeRegistry {
  version: string
  pillars: ContentPillar[]
  archetypes: Map<StoryArchetypeId, StoryArchetype>
}

/**
 * Story with archetype metadata
 */
export interface StoryWithArchetype {
  storyId: string
  archetypeId: StoryArchetypeId
  pillarId: ContentPillarId
  archetypeVersion: number
  detectedConfidence?: number
}
