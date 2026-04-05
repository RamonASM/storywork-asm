/**
 * Humanizer - Anti-AI Post-Processing
 *
 * Removes common AI-tell phrases and patterns, applies natural language
 * transformations, and injects authentic voice characteristics.
 */

import type { VoiceProfile } from './types'

/**
 * Common AI-tell phrases that should be removed or replaced
 */
const AI_TELL_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string | null }> = [
  // Generic AI opener phrases
  { pattern: /^(It's worth noting that|It is worth noting that)/gi, replacement: null },
  { pattern: /^(Interestingly,|Interestingly enough,)/gi, replacement: null },
  { pattern: /^(Notably,)/gi, replacement: null },
  { pattern: /^(Indeed,)/gi, replacement: null },
  { pattern: /^(Certainly,)/gi, replacement: null },
  { pattern: /^(Absolutely,)/gi, replacement: null },
  { pattern: /^(As you may know,)/gi, replacement: null },
  { pattern: /^(In today's market,)/gi, replacement: "Right now," },

  // Overused real estate AI phrases
  { pattern: /nestled (in|among|between)/gi, replacement: 'located' },
  { pattern: /boasts/gi, replacement: 'has' },
  { pattern: /stunning views/gi, replacement: 'great views' },
  { pattern: /breathtaking views/gi, replacement: 'incredible views' },
  { pattern: /a true gem/gi, replacement: 'a great find' },
  { pattern: /dream home/gi, replacement: 'perfect home' },
  { pattern: /turn-key/gi, replacement: 'move-in ready' },
  { pattern: /sought-after/gi, replacement: 'popular' },
  { pattern: /highly desirable/gi, replacement: 'popular' },
  { pattern: /in the heart of/gi, replacement: 'in' },
  { pattern: /this property offers/gi, replacement: 'you get' },
  { pattern: /this home offers/gi, replacement: 'this home has' },

  // AI hedging language
  { pattern: /It's important to note that/gi, replacement: null },
  { pattern: /It should be noted that/gi, replacement: null },
  { pattern: /One might say that/gi, replacement: null },
  { pattern: /It could be argued that/gi, replacement: null },
  { pattern: /This goes without saying, but/gi, replacement: null },

  // Overly formal transitions
  { pattern: /Furthermore,/gi, replacement: 'Also,' },
  { pattern: /Moreover,/gi, replacement: 'Plus,' },
  { pattern: /Additionally,/gi, replacement: 'And' },
  { pattern: /In conclusion,/gi, replacement: null },
  { pattern: /To summarize,/gi, replacement: null },

  // Generic superlatives
  { pattern: /absolutely stunning/gi, replacement: 'beautiful' },
  { pattern: /truly exceptional/gi, replacement: 'exceptional' },
  { pattern: /incredibly unique/gi, replacement: 'unique' },
  { pattern: /extremely rare/gi, replacement: 'rare' },

  // Filler phrases
  { pattern: /at the end of the day,/gi, replacement: null },
  { pattern: /when all is said and done,/gi, replacement: null },
  { pattern: /the fact of the matter is/gi, replacement: null },
  { pattern: /needless to say,/gi, replacement: null },
]

/**
 * Contraction rules for more natural language
 */
const CONTRACTION_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(I am)\b/g, replacement: "I'm" },
  { pattern: /\b(you are)\b/gi, replacement: "you're" },
  { pattern: /\b(we are)\b/gi, replacement: "we're" },
  { pattern: /\b(they are)\b/gi, replacement: "they're" },
  { pattern: /\b(it is)\b/gi, replacement: "it's" },
  { pattern: /\b(that is)\b/gi, replacement: "that's" },
  { pattern: /\b(what is)\b/gi, replacement: "what's" },
  { pattern: /\b(there is)\b/gi, replacement: "there's" },
  { pattern: /\b(here is)\b/gi, replacement: "here's" },
  { pattern: /\b(do not)\b/gi, replacement: "don't" },
  { pattern: /\b(does not)\b/gi, replacement: "doesn't" },
  { pattern: /\b(did not)\b/gi, replacement: "didn't" },
  { pattern: /\b(will not)\b/gi, replacement: "won't" },
  { pattern: /\b(would not)\b/gi, replacement: "wouldn't" },
  { pattern: /\b(could not)\b/gi, replacement: "couldn't" },
  { pattern: /\b(should not)\b/gi, replacement: "shouldn't" },
  { pattern: /\b(can not|cannot)\b/gi, replacement: "can't" },
  { pattern: /\b(have not)\b/gi, replacement: "haven't" },
  { pattern: /\b(has not)\b/gi, replacement: "hasn't" },
  { pattern: /\b(is not)\b/gi, replacement: "isn't" },
  { pattern: /\b(are not)\b/gi, replacement: "aren't" },
  { pattern: /\b(was not)\b/gi, replacement: "wasn't" },
  { pattern: /\b(were not)\b/gi, replacement: "weren't" },
  { pattern: /\b(I will)\b/g, replacement: "I'll" },
  { pattern: /\b(you will)\b/gi, replacement: "you'll" },
  { pattern: /\b(we will)\b/gi, replacement: "we'll" },
  { pattern: /\b(they will)\b/gi, replacement: "they'll" },
  { pattern: /\b(I would)\b/g, replacement: "I'd" },
  { pattern: /\b(you would)\b/gi, replacement: "you'd" },
  { pattern: /\b(we would)\b/gi, replacement: "we'd" },
  { pattern: /\b(they would)\b/gi, replacement: "they'd" },
  { pattern: /\b(I have)\b/g, replacement: "I've" },
  { pattern: /\b(you have)\b/gi, replacement: "you've" },
  { pattern: /\b(we have)\b/gi, replacement: "we've" },
  { pattern: /\b(they have)\b/gi, replacement: "they've" },
  { pattern: /\b(let us)\b/gi, replacement: "let's" },
]

/**
 * Remove AI-tell phrases from text
 */
export function removeAITells(text: string): string {
  let result = text

  for (const rule of AI_TELL_REPLACEMENTS) {
    if (rule.replacement === null) {
      // Remove the phrase entirely and clean up any resulting issues
      result = result.replace(rule.pattern, '')
    } else {
      result = result.replace(rule.pattern, rule.replacement)
    }
  }

  // Clean up any double spaces or leading spaces
  result = result.replace(/\s+/g, ' ').trim()

  // Capitalize first letter if we removed a leading phrase
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1)
  }

  return result
}

/**
 * Apply contractions for more casual/natural language
 * Skip if formality is high
 */
export function applyContractions(text: string, formality: number): string {
  // If formality is above 70, don't apply contractions
  if (formality > 70) {
    return text
  }

  let result = text

  for (const rule of CONTRACTION_RULES) {
    result = result.replace(rule.pattern, rule.replacement)
  }

  return result
}

/**
 * Inject signature phrases where appropriate
 * This is a simple implementation - more sophisticated would use NLP
 */
export function injectSignaturePhrases(
  text: string,
  signaturePhrases: VoiceProfile['signaturePhrases'],
  maxInjections: number = 1
): string {
  if (signaturePhrases.length === 0 || maxInjections === 0) {
    return text
  }

  // Find phrases marked for different contexts
  const closingPhrases = signaturePhrases.filter((p) => p.context === 'closing')
  const hookPhrases = signaturePhrases.filter((p) => p.context === 'hook')

  // For now, just inject a closing phrase if we have one and text doesn't end with CTA
  if (closingPhrases.length > 0) {
    const randomPhrase = closingPhrases[Math.floor(Math.random() * closingPhrases.length)]

    // Check if text already ends with a question or CTA
    const endsWithQuestion = text.trim().endsWith('?')
    const hasCallToAction = /\b(call|contact|reach out|dm|message)\b/i.test(text)

    if (!endsWithQuestion && !hasCallToAction) {
      // Add the signature phrase as a closing
      return `${text.trim()} ${randomPhrase.phrase}`
    }
  }

  return text
}

/**
 * Vary sentence lengths for more natural flow
 * AI tends to produce uniform sentence lengths
 */
export function varySentenceLengths(text: string): string {
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  if (sentences.length < 3) {
    return text // Not enough sentences to vary
  }

  // Check if all sentences are roughly the same length
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((sum, l) => sum + Math.abs(l - avgLength), 0) / lengths.length

  // If variance is low (sentences are uniform), we might want to flag this
  // For now, just return as-is. Future: could break up or combine sentences
  if (variance < 3) {
    // Sentences are very uniform - this is a sign of AI
    // Future: implement sentence combining/splitting
  }

  return text
}

/**
 * Remove or reduce excessive punctuation
 */
export function normalizeExclamations(text: string, energy: number): string {
  // Count exclamation points
  const exclamationCount = (text.match(/!/g) || []).length

  // For low energy profiles, remove most exclamations
  if (energy < 30) {
    // Replace all ! with . except the last one if any
    return text.replace(/!+/g, '.')
  }

  // For medium energy, limit to 2 max
  if (energy < 70 && exclamationCount > 2) {
    let count = 0
    return text.replace(/!+/g, (match) => {
      count++
      return count <= 2 ? '!' : '.'
    })
  }

  // For high energy, just normalize multiple !! to single !
  return text.replace(/!{2,}/g, '!')
}

/**
 * Main humanizer function - applies all transformations
 */
export function humanizeContent(
  text: string,
  profile: VoiceProfile
): string {
  let result = text

  // Step 1: Remove AI-tell phrases
  result = removeAITells(result)

  // Step 2: Apply contractions based on formality
  result = applyContractions(result, profile.toneFormality)

  // Step 3: Normalize exclamations based on energy
  result = normalizeExclamations(result, profile.toneEnergy)

  // Step 4: Inject signature phrases
  result = injectSignaturePhrases(result, profile.signaturePhrases)

  // Step 5: Vary sentence lengths (analysis, minimal changes for now)
  result = varySentenceLengths(result)

  // Final cleanup
  result = result.replace(/\s+/g, ' ').trim()

  return result
}

/**
 * Humanize carousel slides
 */
export function humanizeCarouselSlides(
  slides: Array<{ headline: string; body: string; visual_suggestion: string }>,
  profile: VoiceProfile
): Array<{ headline: string; body: string; visual_suggestion: string }> {
  return slides.map((slide) => ({
    ...slide,
    headline: humanizeContent(slide.headline, profile),
    body: humanizeContent(slide.body, profile),
  }))
}

/**
 * Get a list of avoided words/phrases including defaults and user-specific
 */
export function getAvoidedPhrases(profile: VoiceProfile): string[] {
  // Start with common AI tells
  const defaultAvoid = [
    "It's worth noting",
    "Nestled in",
    "Boasts",
    "Stunning",
    "Dream home",
    "Turn-key",
    "Sought-after",
    "Furthermore",
    "Moreover",
    "In conclusion",
    "At the end of the day",
    "Needless to say",
  ]

  // Add user's custom avoided words
  const userAvoid = profile.avoidedWords.map((w) => w.word)

  return [...new Set([...defaultAvoid, ...userAvoid])]
}

/**
 * Analyze text for AI-tell presence
 * Returns a score from 0 (very human) to 1 (very AI-like)
 */
export function analyzeAIScore(text: string): {
  score: number
  flags: string[]
} {
  const flags: string[] = []
  let aiIndicators = 0

  // Check for AI-tell phrases
  for (const rule of AI_TELL_REPLACEMENTS) {
    const freshPattern = new RegExp(rule.pattern.source, rule.pattern.flags)
    if (freshPattern.test(text)) {
      flags.push(`Contains AI phrase: ${rule.pattern.source.slice(0, 30)}...`)
      aiIndicators++
    }
  }

  // Check for lack of contractions (formal AI style)
  const contractionlessCount = (text.match(/\b(do not|does not|is not|are not|will not|would not|could not|should not|can not|cannot|have not|has not)\b/gi) || []).length
  if (contractionlessCount > 2) {
    flags.push('Unusually few contractions')
    aiIndicators++
  }

  // Check for uniform sentence lengths
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  if (sentences.length >= 3) {
    const lengths = sentences.map((s) => s.trim().split(/\s+/).length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, l) => sum + Math.abs(l - avgLength), 0) / lengths.length
    if (variance < 3) {
      flags.push('Uniform sentence lengths')
      aiIndicators++
    }
  }

  // Check for excessive hedging
  const hedgeCount = (text.match(/\b(might|could|perhaps|possibly|potentially|arguably)\b/gi) || []).length
  if (hedgeCount > 3) {
    flags.push('Excessive hedging language')
    aiIndicators++
  }

  // Calculate score (max reasonable indicators is about 10)
  const score = Math.min(1, aiIndicators / 5)

  return { score, flags }
}
