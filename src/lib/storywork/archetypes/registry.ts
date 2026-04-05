/**
 * Archetype Registry
 *
 * Central registry for all story archetypes. Provides lookup functions
 * and validation for archetype data.
 */

import type {
  StoryArchetype,
  StoryArchetypeId,
  ContentPillarId,
  ArchetypeSummary,
  ContentPillar,
} from './types'
import { CONTENT_PILLARS, getPillarById } from './pillars'

// Import all archetype data files
import againstTheOdds from './data/against-the-odds.json'
import firstSteps from './data/first-steps.json'
import theReturn from './data/the-return.json'
import freshDrop from './data/fresh-drop.json'
import hiddenGem from './data/hidden-gem.json'
import marketPulse from './data/market-pulse.json'
import battleTested from './data/battle-tested.json'
import behindTheDeal from './data/behind-the-deal.json'
import theBreakdown from './data/the-breakdown.json'
import localLegend from './data/local-legend.json'
import dayInTheLife from './data/day-in-the-life.json'
import lifestyleSpotlight from './data/lifestyle-spotlight.json'
import neighborhoodGuide from './data/neighborhood-guide.json'
import lessonsLearned from './data/lessons-learned.json'
import whyIDoThis from './data/why-i-do-this.json'
import theGrind from './data/the-grind.json'

// Build the archetype map
const ARCHETYPES_MAP = new Map<StoryArchetypeId, StoryArchetype>([
  ['against_the_odds', againstTheOdds as StoryArchetype],
  ['first_steps', firstSteps as StoryArchetype],
  ['the_return', theReturn as StoryArchetype],
  ['fresh_drop', freshDrop as StoryArchetype],
  ['hidden_gem', hiddenGem as StoryArchetype],
  ['market_pulse', marketPulse as StoryArchetype],
  ['battle_tested', battleTested as StoryArchetype],
  ['behind_the_deal', behindTheDeal as StoryArchetype],
  ['the_breakdown', theBreakdown as StoryArchetype],
  ['local_legend', localLegend as StoryArchetype],
  ['day_in_the_life', dayInTheLife as StoryArchetype],
  ['lifestyle_spotlight', lifestyleSpotlight as StoryArchetype],
  ['neighborhood_guide', neighborhoodGuide as StoryArchetype],
  ['lessons_learned', lessonsLearned as StoryArchetype],
  ['why_i_do_this', whyIDoThis as StoryArchetype],
  ['the_grind', theGrind as StoryArchetype],
])

// All archetype IDs for validation
export const ALL_ARCHETYPE_IDS: StoryArchetypeId[] = [
  'against_the_odds',
  'first_steps',
  'the_return',
  'fresh_drop',
  'hidden_gem',
  'market_pulse',
  'battle_tested',
  'behind_the_deal',
  'the_breakdown',
  'local_legend',
  'day_in_the_life',
  'lifestyle_spotlight',
  'neighborhood_guide',
  'lessons_learned',
  'why_i_do_this',
  'the_grind',
]

// Legacy story types for backward compatibility
export const LEGACY_STORY_TYPES = [
  'against_the_odds',
  'fresh_drop',
  'behind_the_deal',
] as const

/**
 * Get archetype by ID
 */
export function getArchetypeById(
  id: StoryArchetypeId
): StoryArchetype | undefined {
  return ARCHETYPES_MAP.get(id)
}

/**
 * Get all archetypes
 */
export function getAllArchetypes(): StoryArchetype[] {
  return Array.from(ARCHETYPES_MAP.values())
}

/**
 * Get all active archetypes
 */
export function getActiveArchetypes(): StoryArchetype[] {
  return getAllArchetypes().filter((a) => a.isActive)
}

/**
 * Get archetypes by pillar
 */
export function getArchetypesByPillar(
  pillarId: ContentPillarId
): StoryArchetype[] {
  return getAllArchetypes().filter((a) => a.pillarId === pillarId)
}

/**
 * Get archetype summaries for UI display
 */
export function getArchetypeSummaries(): ArchetypeSummary[] {
  return getAllArchetypes().map((a) => ({
    id: a.id,
    name: a.name,
    pillarId: a.pillarId,
    pillarName: a.pillarName,
    controllingIdea: a.controllingIdea,
    emotionalCore: a.emotionalCore,
  }))
}

/**
 * Get summaries grouped by pillar
 */
export function getArchetypesByPillarGrouped(): Map<
  ContentPillarId,
  ArchetypeSummary[]
> {
  const grouped = new Map<ContentPillarId, ArchetypeSummary[]>()

  for (const pillar of CONTENT_PILLARS) {
    const archetypes = getArchetypesByPillar(pillar.id).map((a) => ({
      id: a.id,
      name: a.name,
      pillarId: a.pillarId,
      pillarName: a.pillarName,
      controllingIdea: a.controllingIdea,
      emotionalCore: a.emotionalCore,
    }))
    grouped.set(pillar.id, archetypes)
  }

  return grouped
}

/**
 * Get pillars with their archetypes for UI
 */
export function getPillarsWithArchetypes(): Array<{
  pillar: ContentPillar
  archetypes: ArchetypeSummary[]
}> {
  return CONTENT_PILLARS.filter((p) => p.isActive).map((pillar) => ({
    pillar,
    archetypes: getArchetypesByPillar(pillar.id).map((a) => ({
      id: a.id,
      name: a.name,
      pillarId: a.pillarId,
      pillarName: a.pillarName,
      controllingIdea: a.controllingIdea,
      emotionalCore: a.emotionalCore,
    })),
  }))
}

/**
 * Check if an archetype ID is valid
 */
export function isValidArchetypeId(id: string): id is StoryArchetypeId {
  return ALL_ARCHETYPE_IDS.includes(id as StoryArchetypeId)
}

/**
 * Check if this is a legacy story type
 */
export function isLegacyStoryType(
  id: string
): id is (typeof LEGACY_STORY_TYPES)[number] {
  return LEGACY_STORY_TYPES.includes(id as (typeof LEGACY_STORY_TYPES)[number])
}

/**
 * Get trigger keywords for all archetypes (for detection)
 */
export function getAllTriggerKeywords(): Map<StoryArchetypeId, string[]> {
  const keywords = new Map<StoryArchetypeId, string[]>()

  for (const archetype of getAllArchetypes()) {
    keywords.set(archetype.id, archetype.triggerKeywords)
  }

  return keywords
}

/**
 * Detect potential archetype from text input
 * Returns archetypes sorted by confidence
 */
export function detectArchetypeFromText(
  text: string
): Array<{ id: StoryArchetypeId; confidence: number; matches: string[] }> {
  const lowerText = text.toLowerCase()
  const results: Array<{
    id: StoryArchetypeId
    confidence: number
    matches: string[]
  }> = []

  for (const archetype of getActiveArchetypes()) {
    const matches: string[] = []
    let score = 0

    // Check trigger keywords
    for (const keyword of archetype.triggerKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches.push(keyword)
        score += 10
      }
    }

    // Check trigger moments
    for (const trigger of archetype.triggerMoments) {
      if (lowerText.includes(trigger.moment.toLowerCase())) {
        matches.push(trigger.moment)
        score += 15
      }

      for (const clue of trigger.contextClues) {
        if (lowerText.includes(clue.toLowerCase())) {
          matches.push(clue)
          score += 5
        }
      }
    }

    if (matches.length > 0) {
      // Normalize confidence to 0-1 range
      const confidence = Math.min(score / 50, 1)
      results.push({
        id: archetype.id,
        confidence,
        matches: [...new Set(matches)], // Deduplicate
      })
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Get questions for an archetype
 */
export function getArchetypeQuestions(
  id: StoryArchetypeId
): StoryArchetype['questions'] {
  const archetype = getArchetypeById(id)
  return archetype?.questions ?? []
}

/**
 * Get prompt config for an archetype
 */
export function getArchetypePromptConfig(
  id: StoryArchetypeId
): StoryArchetype['promptConfig'] | undefined {
  const archetype = getArchetypeById(id)
  return archetype?.promptConfig
}

/**
 * Get narrative arc for an archetype
 */
export function getArchetypeNarrativeArc(
  id: StoryArchetypeId
): StoryArchetype['narrativeArc'] | undefined {
  const archetype = getArchetypeById(id)
  return archetype?.narrativeArc
}
