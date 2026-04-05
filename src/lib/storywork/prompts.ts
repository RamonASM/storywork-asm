// Storywork story types and prompts
// Now uses the modular archetype system

import {
  getArchetypeById,
  getAllArchetypes,
  getActiveArchetypes,
  ALL_ARCHETYPE_IDS,
  LEGACY_STORY_TYPES,
  detectArchetypeFromText,
} from './archetypes/registry'
import { getPillarsWithArchetypes } from './archetypes/registry'
import type { StoryArchetype, StoryArchetypeId } from './archetypes/types'
import type { LifeHereData } from '@/lib/location/types'
import { buildLocationContext } from '@/lib/location/life-here-client'

// Re-export for convenience
export { ALL_ARCHETYPE_IDS, LEGACY_STORY_TYPES }

// Legacy export for backward compatibility
export const storyTypes = {
  against_the_odds: {
    name: 'Against the Odds',
    description: 'Difficult transactions, bidding wars, challenges overcome',
    arc: 'Challenge → Obstacles → Strategy → Victory',
    questions: [
      'What was the initial challenge or obstacle your client faced?',
      'What made this situation particularly difficult or competitive?',
      'What strategy or approach did you take to overcome it?',
      'What was the outcome? How did it feel to win?',
      'What lesson or takeaway would you share with other buyers/sellers?',
    ],
  },
  fresh_drop: {
    name: 'Fresh Drop',
    description: 'New listings, coming soon properties, market reveals',
    arc: 'Reveal → Features → Neighborhood → CTA',
    questions: [
      'What makes this property special or unique?',
      'What are the top 3 features buyers will love?',
      'Describe the neighborhood and lifestyle it offers.',
      'Who is the ideal buyer for this home?',
      'What would you say to someone considering this property?',
    ],
  },
  behind_the_deal: {
    name: 'Behind the Deal',
    description: 'Just closed, testimonials, success stories',
    arc: 'Surface → Hidden Challenge → Resolution → Lesson',
    questions: [
      'Tell us about the client and their initial goals.',
      'What hidden challenge or surprise came up during the transaction?',
      'How did you navigate and resolve the challenge?',
      'What was the final outcome for your client?',
      'What insight would you share from this experience?',
    ],
  },
}

/**
 * Get story type info from archetype registry
 * Falls back to legacy storyTypes for backward compatibility
 */
export function getStoryTypeInfo(storyType: string): {
  name: string
  description: string
  arc: string
  questions: string[]
} | null {
  // First try the new archetype registry
  const archetype = getArchetypeById(storyType as StoryArchetypeId)
  if (archetype) {
    return {
      name: archetype.name,
      description: archetype.controllingIdea,
      arc: `${archetype.narrativeArc.incitingIncident} → ${archetype.narrativeArc.climax} → ${archetype.narrativeArc.resolution}`,
      questions: archetype.questions.map((q) => q.question),
    }
  }

  // Fall back to legacy
  const legacy = storyTypes[storyType as keyof typeof storyTypes]
  if (legacy) {
    return legacy
  }

  return null
}

/**
 * Build the enhanced detection prompt for all archetypes
 */
export const detectStoryTypePrompt = (input: string) => {
  const archetypes = getActiveArchetypes()
  const archetypeDescriptions = archetypes
    .map(
      (a, i) =>
        `${i + 1}. ${a.id.toUpperCase()} - ${a.controllingIdea} (Triggers: ${a.triggerKeywords.slice(0, 5).join(', ')})`
    )
    .join('\n')

  return `You are a real estate storytelling expert. Analyze this real estate story and determine which narrative archetype fits best.

Story Input:
"""
${input}
"""

Story Archetypes:
${archetypeDescriptions}

Analyze the story and respond with ONLY a JSON object:
{
  "detected_type": "${ALL_ARCHETYPE_IDS.map((id) => id).join('" | "')}",
  "confidence": 0.0-1.0,
  "pillar_id": "the_hunt" | "the_stage" | "the_arena" | "the_craft" | "the_neighborhood" | "the_mirror",
  "reasoning": "Brief explanation of why this archetype fits",
  "alternative_type": "optional second-best match",
  "alternative_confidence": 0.0-1.0
}`
}

/**
 * Build the generation prompt with archetype-specific guidance
 */
export const generateStoryContentPrompt = (
  storyType: string,
  answers: Record<string, string>,
  agentName: string,
  locationData?: LifeHereData | null
) => {
  const archetype = getArchetypeById(storyType as StoryArchetypeId)

  // Fall back to legacy if archetype not found
  if (!archetype) {
    const legacyType = storyTypes[storyType as keyof typeof storyTypes]
    if (!legacyType) {
      return ''
    }

    const answersFormatted = legacyType.questions
      .map((q, i) => `Q: ${q}\nA: ${answers[`q${i}`] || 'Not provided'}`)
      .join('\n\n')

    return `You are an expert real estate social media content creator. Create carousel content for this "${legacyType.name}" story.

Agent Name: ${agentName}
Story Type: ${legacyType.name}
Narrative Arc: ${legacyType.arc}

Story Details:
${answersFormatted}

Create carousel slide content following this structure:
- Slide 1: Hook (attention-grabbing opening, pose a question or bold statement)
- Slide 2: Setup (introduce the situation/property)
- Slide 3-5: Story beats (key moments following the ${legacyType.arc} arc)
- Slide 6: Resolution/Outcome
- Slide 7: CTA (call-to-action, soft sell)

For each slide provide:
1. Headline (max 8 words, punchy)
2. Body text (max 40 words, conversational)
3. Visual suggestion (what image/graphic would work)

Respond with ONLY a JSON object:
{
  "slides": [
    {
      "headline": "...",
      "body": "...",
      "visual_suggestion": "..."
    }
  ],
  "hashtags": ["#relevant", "#hashtags"],
  "caption": "Instagram caption for the carousel post (max 150 words)"
}`
  }

  // Use the new archetype system
  const { promptConfig, narrativeArc, questions } = archetype

  const answersFormatted = questions
    .map((q, i) => `Q: ${q.question}\nA: ${answers[`q${i}`] || answers[q.id] || 'Not provided'}`)
    .join('\n\n')

  const slideGuidance = promptConfig.slideStructure
    .map(
      (s) =>
        `- Slide ${s.slideNumber}: ${s.purpose} - ${s.contentFocus} (Format: ${s.suggestedFormat}, Emotion: ${s.emotionalBeat})`
    )
    .join('\n')

  const avoidList = promptConfig.avoidPhrases.join(', ')
  const emphasizeList = promptConfig.emphasize.join(', ')

  return `You are an expert real estate social media content creator. Create carousel content for this "${archetype.name}" story.

Agent Name: ${agentName}
Story Archetype: ${archetype.name}
Pillar: ${archetype.pillarName}
Controlling Idea: ${archetype.controllingIdea}
Emotional Core: ${archetype.emotionalCore.join(', ')}

Narrative Arc:
- Inciting Incident: ${narrativeArc.incitingIncident}
- Rising Action: ${narrativeArc.risingAction}
- Crisis: ${narrativeArc.crisis}
- Climax: ${narrativeArc.climax}
- Resolution: ${narrativeArc.resolution}

${promptConfig.systemContext}

Story Details:
${answersFormatted}

TONE GUIDANCE:
${promptConfig.toneGuidance}

SLIDE STRUCTURE:
${slideGuidance}

MUST EMPHASIZE: ${emphasizeList}
MUST AVOID: ${avoidList}

CRITICAL RULES:
1. Use conversational language - sound like a person, not a brochure
2. Headlines must be punchy (max 8 words)
3. Body text must be concise (max 40 words per slide)
4. Follow the emotional beats for each slide
5. Connect to the controlling idea throughout
6. End with a natural, non-pushy CTA
${locationData ? `\n${buildLocationContext(locationData)}\n\nIMPORTANT: Weave the location data naturally into the slides. Use real numbers (scores, restaurant counts, commute times) as proof points. Do not just list stats - tell the story they reveal.` : ''}

For each slide provide:
1. Headline (max 8 words, punchy, no cliches)
2. Body text (max 40 words, conversational, authentic)
3. Visual suggestion (what image/graphic would work)

Respond with ONLY a JSON object:
{
  "slides": [
    {
      "headline": "...",
      "body": "...",
      "visual_suggestion": "..."
    }
  ],
  "hashtags": ["#relevant", "#hashtags"],
  "caption": "Instagram caption for the carousel post (max 150 words)",
  "archetype_id": "${archetype.id}",
  "pillar_id": "${archetype.pillarId}"
}`
}

/**
 * Prompt for extracting story from voice transcription
 */
export const transcribeToStoryPrompt = (transcription: string) => {
  const archetypes = getActiveArchetypes()
  const archetypeList = archetypes.map((a) => a.id).join('" | "')

  return `You are a real estate story extractor. Take this raw transcription from a real estate agent and extract the key story elements.

Transcription:
"""
${transcription}
"""

Extract and organize the story into clear narrative elements. Clean up any filler words, repetition, or rambling.

Respond with a JSON object:
{
  "summary": "2-3 sentence summary of the story",
  "story_type_suggestion": "${archetypeList}",
  "pillar_suggestion": "the_hunt" | "the_stage" | "the_arena" | "the_craft" | "the_neighborhood" | "the_mirror",
  "confidence": 0.0-1.0,
  "key_elements": {
    "inciting_incident": "What started this story",
    "rising_action": "How stakes or complications built",
    "crisis": "The pivotal moment or challenge",
    "climax": "The breakthrough or turning point",
    "resolution": "The outcome and lesson"
  },
  "characters": ["Client name/type", "Other parties involved"],
  "emotional_beats": ["Key emotional moments in the story"],
  "authentic_phrases": ["Exact phrases from the agent that should be preserved"]
}`
}

/**
 * Get all story types with their questions for the UI
 */
export function getAllStoryTypesForUI() {
  return getPillarsWithArchetypes()
}

/**
 * Get questions for a specific story type
 */
export function getQuestionsForStoryType(storyType: string): string[] {
  const archetype = getArchetypeById(storyType as StoryArchetypeId)
  if (archetype) {
    return archetype.questions.map((q) => q.question)
  }

  const legacy = storyTypes[storyType as keyof typeof storyTypes]
  if (legacy) {
    return legacy.questions
  }

  return []
}

/**
 * Quick detection using trigger keywords (faster than AI)
 */
export function quickDetectArchetype(input: string) {
  return detectArchetypeFromText(input)
}
