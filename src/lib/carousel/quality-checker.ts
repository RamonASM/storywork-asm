/**
 * Quality Checker - Carousel Content Quality Gate
 *
 * Scores carousel content on 5 dimensions:
 * - Readability (25%) - Flesch-Kincaid grade level
 * - Conciseness (25%) - Headline/body word counts
 * - Authenticity (25%) - AI detection (inverted)
 * - Hook Strength (15%) - First 3 slides engagement
 * - Brand Compliance (10%) - Valid colors, name, font
 *
 * Pure function, no side effects.
 */

import { fleschKincaidGradeLevel, readabilityScore } from './readability'
import { analyzeAIScore } from '@/lib/voice/humanizer'
import type { BrandKit } from './types'

export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export type QualityDimension = {
  score: number
  weight: number
  flags: string[]
}

export type SlideFlag = {
  slideIndex: number
  issues: string[]
}

export type QualityReport = {
  overallScore: number
  grade: QualityGrade
  dimensions: {
    readability: QualityDimension
    conciseness: QualityDimension
    authenticity: QualityDimension
    hookStrength: QualityDimension
    brandCompliance: QualityDimension
  }
  slideFlags: SlideFlag[]
  suggestions: string[]
}

type SlideInput = { headline: string; body: string; visual_suggestion: string }

const FILLER_OPENERS = [
  /^in today/i,
  /^let me/i,
  /^i want to/i,
  /^i would like/i,
  /^it is important/i,
  /^it's important/i,
  /^as we all know/i,
  /^furthermore/i,
  /^additionally/i,
  /^moreover/i,
]

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length
}

function scoreReadability(slides: SlideInput[]): QualityDimension {
  const flags: string[] = []

  if (slides.length === 0) {
    return { score: 100, weight: 0.25, flags: [] }
  }

  const allText = slides.map((s) => `${s.headline}. ${s.body}`).join(' ')
  const gradeLevel = fleschKincaidGradeLevel(allText)
  const score = readabilityScore(gradeLevel)

  if (gradeLevel > 10) {
    flags.push(`Grade level ${gradeLevel.toFixed(1)} is too high (target: 6-8)`)
  }

  return { score, weight: 0.25, flags }
}

function scoreConciseness(slides: SlideInput[]): { dimension: QualityDimension; slideFlags: SlideFlag[] } {
  const flags: string[] = []
  const slideFlags: SlideFlag[] = []

  if (slides.length === 0) {
    return { dimension: { score: 100, weight: 0.25, flags: [] }, slideFlags: [] }
  }

  let conciseCount = 0

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const headlineWords = wordCount(slide.headline)
    const bodyWords = wordCount(slide.body)
    const issues: string[] = []

    const headlineOk = headlineWords <= 8
    const bodyOk = bodyWords <= 40

    if (!headlineOk) {
      issues.push(`Headline has ${headlineWords} words (max 8)`)
    }
    if (!bodyOk) {
      issues.push(`Body has ${bodyWords} words (max 40)`)
    }

    if (headlineOk && bodyOk) {
      conciseCount++
    }

    if (issues.length > 0) {
      slideFlags.push({ slideIndex: i, issues })
    }
  }

  const score = (conciseCount / slides.length) * 100

  if (score < 100) {
    flags.push(`${slides.length - conciseCount} of ${slides.length} slides exceed word limits`)
  }

  return { dimension: { score, weight: 0.25, flags }, slideFlags }
}

function scoreAuthenticity(slides: SlideInput[]): QualityDimension {
  const flags: string[] = []

  if (slides.length === 0) {
    return { score: 100, weight: 0.25, flags: [] }
  }

  const allText = slides.map((s) => `${s.headline}. ${s.body}`).join(' ')
  const { score: aiScore, flags: aiFlags } = analyzeAIScore(allText)
  const score = (1 - aiScore) * 100

  if (aiScore > 0.5) {
    flags.push('Content reads as AI-generated')
  }
  flags.push(...aiFlags)

  return { score, weight: 0.25, flags }
}

function scoreHookStrength(slides: SlideInput[]): QualityDimension {
  const flags: string[] = []

  if (slides.length === 0) {
    return { score: 100, weight: 0.15, flags: [] }
  }

  // Check first 3 slides (or fewer if less available)
  const hookSlides = slides.slice(0, 3)
  let totalChecks = 0
  let passedChecks = 0

  for (const slide of hookSlides) {
    const text = `${slide.headline} ${slide.body}`

    // Check 1: No filler openers
    totalChecks++
    const hasFiller = FILLER_OPENERS.some((pattern) => pattern.test(slide.headline))
    if (!hasFiller) {
      passedChecks++
    } else {
      flags.push('Hook slide starts with filler phrase')
    }

    // Check 2: Contains question or bold statement (short, punchy)
    totalChecks++
    const hasQuestion = slide.headline.includes('?')
    const isBoldStatement = wordCount(slide.headline) <= 5
    if (hasQuestion || isBoldStatement) {
      passedChecks++
    }

    // Check 3: Headline under 6 words preferred
    totalChecks++
    if (wordCount(slide.headline) <= 6) {
      passedChecks++
    } else {
      flags.push('Hook headline exceeds 6 words')
    }
  }

  const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100

  return { score, weight: 0.15, flags }
}

function scoreBrandCompliance(brandKit: BrandKit): QualityDimension {
  const flags: string[] = []
  let checks = 0
  let passed = 0

  // Check 1: Valid primary hex color
  checks++
  if (HEX_COLOR_REGEX.test(brandKit.primary_color)) {
    passed++
  } else {
    flags.push('Primary color is not a valid hex color')
  }

  // Check 2: Valid secondary hex color
  checks++
  if (HEX_COLOR_REGEX.test(brandKit.secondary_color)) {
    passed++
  } else {
    flags.push('Secondary color is not a valid hex color')
  }

  // Check 3: Agent name present (brand kit name)
  checks++
  if (brandKit.name && brandKit.name.trim().length > 0) {
    passed++
  } else {
    flags.push('Brand kit name is missing')
  }

  // Check 4: Font family set
  checks++
  if (brandKit.font_family && brandKit.font_family.trim().length > 0) {
    passed++
  } else {
    flags.push('Font family is not set')
  }

  const score = checks > 0 ? (passed / checks) * 100 : 100

  return { score, weight: 0.10, flags }
}

function assignGrade(score: number): QualityGrade {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function generateSuggestions(dimensions: QualityReport['dimensions']): string[] {
  const suggestions: Array<{ priority: number; text: string }> = []

  const { readability, conciseness, authenticity, hookStrength, brandCompliance } = dimensions

  if (readability.score < 70) {
    suggestions.push({
      priority: readability.weight * (100 - readability.score),
      text: 'Simplify your language. Use shorter words and sentences for better readability.',
    })
  }

  if (conciseness.score < 70) {
    suggestions.push({
      priority: conciseness.weight * (100 - conciseness.score),
      text: 'Trim slide content. Keep headlines under 8 words and body text under 40 words.',
    })
  }

  if (authenticity.score < 70) {
    suggestions.push({
      priority: authenticity.weight * (100 - authenticity.score),
      text: 'Rewrite to sound more natural. Avoid AI-sounding phrases and use contractions.',
    })
  }

  if (hookStrength.score < 70) {
    suggestions.push({
      priority: hookStrength.weight * (100 - hookStrength.score),
      text: 'Strengthen your hooks. Use short, punchy headlines or questions in the first 3 slides.',
    })
  }

  if (brandCompliance.score < 70) {
    suggestions.push({
      priority: brandCompliance.weight * (100 - brandCompliance.score),
      text: 'Fix brand kit issues. Ensure valid hex colors and font family are set.',
    })
  }

  // Sort by priority (highest impact first) and return top 3
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((s) => s.text)
}

/**
 * Validate carousel quality across 5 dimensions.
 * Pure function, no side effects.
 */
export function validateCarouselQuality(
  slides: SlideInput[],
  brandKit: BrandKit
): QualityReport {
  const readability = scoreReadability(slides)
  const { dimension: conciseness, slideFlags } = scoreConciseness(slides)
  const authenticity = scoreAuthenticity(slides)
  const hookStrength = scoreHookStrength(slides)
  const brandCompliance = scoreBrandCompliance(brandKit)

  const dimensions = { readability, conciseness, authenticity, hookStrength, brandCompliance }

  // Weighted overall score
  const overallScore =
    readability.score * readability.weight +
    conciseness.score * conciseness.weight +
    authenticity.score * authenticity.weight +
    hookStrength.score * hookStrength.weight +
    brandCompliance.score * brandCompliance.weight

  const grade = assignGrade(overallScore)
  const suggestions = generateSuggestions(dimensions)

  return {
    overallScore,
    grade,
    dimensions,
    slideFlags,
    suggestions,
  }
}
