/**
 * Readability Scorer - Flesch-Kincaid Grade Level
 *
 * Scores carousel text readability on a 0-100 scale where
 * 6th grade = 100 (most readable) and 12th grade = 0.
 */

/**
 * Count syllables in a word using vowel-group heuristic with silent-e adjustment.
 * Returns minimum of 1.
 */
export function countSyllables(word: string): number {
  if (!word || word.length === 0) return 1

  const lower = word.toLowerCase().trim()
  if (lower.length === 0) return 1

  // Count vowel groups (consecutive vowels count as one syllable)
  const vowelGroups = lower.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 0

  // Silent-e adjustment: if word ends in 'e', subtract one syllable
  if (lower.endsWith('e') && count > 1) {
    count -= 1
  }

  // Minimum 1 syllable
  return Math.max(1, count)
}

/**
 * Calculate Flesch-Kincaid Grade Level for a block of text.
 * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 *
 * Returns 0 for empty text.
 */
export function fleschKincaidGradeLevel(text: string): number {
  if (!text || text.trim().length === 0) return 0

  const cleaned = text.trim()

  // Split into words (non-empty tokens)
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) return 0

  // Count sentences (split by sentence-ending punctuation)
  const sentenceEnders = cleaned.match(/[.!?]+/g)
  const sentenceCount = sentenceEnders ? sentenceEnders.length : 1

  // Count total syllables
  const totalSyllables = words.reduce((sum, word) => {
    // Strip punctuation from word before counting
    const cleanWord = word.replace(/[^a-zA-Z]/g, '')
    return sum + countSyllables(cleanWord)
  }, 0)

  const wordsPerSentence = words.length / sentenceCount
  const syllablesPerWord = totalSyllables / words.length

  const grade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59

  return grade
}

/**
 * Convert Flesch-Kincaid grade level to a 0-100 readability score.
 * Linear scale: grade 6 = 100, grade 12 = 0, clamped to [0, 100].
 */
export function readabilityScore(gradeLevel: number): number {
  // Linear interpolation: score = (12 - grade) / (12 - 6) * 100
  const score = ((12 - gradeLevel) / 6) * 100
  return Math.max(0, Math.min(100, score))
}
