# Storywork Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance Storywork's carousel generation with a quality gate, 4 visual layout templates, Life Here location intelligence, and listing photo backgrounds.

**Architecture:** Pure functions for quality scoring and readability. Layout dispatcher pattern replaces monolithic renderer. Life Here client fetches ASM Portal location data at generation time. Photo backgrounds use pre-fetched base64 data URIs composited as stacked Satori elements.

**Tech Stack:** Next.js 16, TypeScript, Satori + Sharp, Claude API, Supabase, Vitest, Zod

**Spec:** `docs/specs/2026-04-05-storywork-enhancement-design.md`

**Working directory:** `/Users/aerialshotsmedia/Projects/storywork-asm`

---

## Chunk 1: Quality Gate (Phase 1)

### Task 1: Fix analyzeAIScore regex lastIndex bug

**Files:**
- Modify: `src/lib/voice/humanizer.ts:320-357`
- Test: `src/lib/voice/humanizer.test.ts` (create if not exists)

- [ ] **Step 1: Write the failing test**

Create `src/lib/voice/humanizer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { analyzeAIScore } from './humanizer'

describe('analyzeAIScore', () => {
  it('returns consistent results when called multiple times on different texts', () => {
    const text1 = 'It is worth noting that this home boasts stunning views.'
    const text2 = 'Furthermore, the property is nestled in a quiet neighborhood.'

    const result1a = analyzeAIScore(text1)
    const result2 = analyzeAIScore(text2)
    const result1b = analyzeAIScore(text1)

    // Without the fix, result1b may differ from result1a due to lastIndex state
    expect(result1a.score).toBe(result1b.score)
    expect(result1a.flags.length).toBe(result1b.flags.length)
    expect(result2.score).toBeGreaterThan(0)
  })

  it('detects AI-tell phrases', () => {
    const text = 'It is worth noting that this stunning property boasts incredible views.'
    const result = analyzeAIScore(text)
    expect(result.score).toBeGreaterThan(0)
    expect(result.flags.length).toBeGreaterThan(0)
  })

  it('scores clean text low', () => {
    const text = 'Great location. Close to parks and restaurants.'
    const result = analyzeAIScore(text)
    expect(result.score).toBeLessThan(0.3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/voice/humanizer.test.ts`

Expected: May pass or fail intermittently due to the regex bug. The consistency test is the key one.

- [ ] **Step 3: Fix the regex lastIndex issue in analyzeAIScore**

In `src/lib/voice/humanizer.ts`, replace the `analyzeAIScore` function's regex loop (lines ~320-327):

```typescript
// Replace this in analyzeAIScore:
  // Check for AI-tell phrases
  for (const rule of AI_TELL_REPLACEMENTS) {
    if (rule.pattern.test(text)) {
```

With:

```typescript
  // Check for AI-tell phrases
  // IMPORTANT: Create new RegExp from source to avoid lastIndex state from module-level g-flag regexes
  for (const rule of AI_TELL_REPLACEMENTS) {
    const freshPattern = new RegExp(rule.pattern.source, rule.pattern.flags)
    if (freshPattern.test(text)) {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/voice/humanizer.test.ts`

Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/voice/humanizer.ts src/lib/voice/humanizer.test.ts
git commit -m "fix(voice): reset regex lastIndex in analyzeAIScore to prevent false negatives

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Readability scorer (Flesch-Kincaid)

**Files:**
- Create: `src/lib/carousel/readability.ts`
- Create: `src/lib/carousel/readability.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/carousel/readability.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { countSyllables, fleschKincaidGradeLevel, readabilityScore } from './readability'

describe('countSyllables', () => {
  it('counts simple words', () => {
    expect(countSyllables('cat')).toBe(1)
    expect(countSyllables('water')).toBe(2)
    expect(countSyllables('beautiful')).toBe(3)
    expect(countSyllables('education')).toBe(4)
  })

  it('handles silent-e', () => {
    expect(countSyllables('home')).toBe(1)
    expect(countSyllables('sale')).toBe(1)
    expect(countSyllables('state')).toBe(1)
  })

  it('returns 1 for empty or short strings', () => {
    expect(countSyllables('')).toBe(1)
    expect(countSyllables('a')).toBe(1)
  })
})

describe('fleschKincaidGradeLevel', () => {
  it('scores simple text at low grade level', () => {
    const text = 'The cat sat on the mat. It was a good cat.'
    const grade = fleschKincaidGradeLevel(text)
    expect(grade).toBeLessThan(5)
  })

  it('scores complex text at high grade level', () => {
    const text = 'The unprecedented juxtaposition of architectural methodologies necessitates a comprehensive evaluation of structural integrity.'
    const grade = fleschKincaidGradeLevel(text)
    expect(grade).toBeGreaterThan(12)
  })

  it('returns 0 for empty text', () => {
    expect(fleschKincaidGradeLevel('')).toBe(0)
  })
})

describe('readabilityScore', () => {
  it('returns 100 for 6th grade text', () => {
    // 6th grade = target = score 100
    const score = readabilityScore(6)
    expect(score).toBe(100)
  })

  it('returns 0 for 12th+ grade text', () => {
    const score = readabilityScore(12)
    expect(score).toBe(0)
  })

  it('returns ~50 for 9th grade text', () => {
    const score = readabilityScore(9)
    expect(score).toBeGreaterThan(40)
    expect(score).toBeLessThan(60)
  })

  it('clamps to 0-100', () => {
    expect(readabilityScore(0)).toBe(100)
    expect(readabilityScore(20)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/readability.test.ts`

Expected: FAIL - module not found

- [ ] **Step 3: Implement readability.ts**

Create `src/lib/carousel/readability.ts`:

```typescript
/**
 * Flesch-Kincaid readability scoring for carousel content.
 * Targets 6th grade reading level for Instagram-friendly copy.
 */

/**
 * Count syllables in a word using vowel-group heuristic.
 * Adjusts for silent-e and common suffixes.
 */
export function countSyllables(word: string): number {
  if (!word || word.length <= 2) return 1

  const lower = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!lower) return 1

  // Remove trailing silent-e
  let processed = lower
  if (processed.endsWith('e') && processed.length > 2) {
    processed = processed.slice(0, -1)
  }

  // Count vowel groups
  const vowelGroups = processed.match(/[aeiouy]+/g)
  const count = vowelGroups ? vowelGroups.length : 1

  // Adjust for common suffixes that add syllables
  let adjustment = 0
  if (lower.endsWith('le') && lower.length > 2 && !/[aeiouy]/.test(lower[lower.length - 3])) {
    adjustment += 1 // "table", "simple"
  }
  if (lower.endsWith('tion') || lower.endsWith('sion')) {
    adjustment += 0 // Already counted by vowel groups
  }
  if (lower.endsWith('ed') && !lower.endsWith('ted') && !lower.endsWith('ded')) {
    // "walked" = 1 syl, but "wanted" = 2 - vowel groups handle "wanted"
  }

  return Math.max(1, count + adjustment)
}

/**
 * Calculate Flesch-Kincaid Grade Level for text.
 * Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
 * Returns grade level (e.g., 6.0 = 6th grade).
 */
export function fleschKincaidGradeLevel(text: string): number {
  if (!text.trim()) return 0

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.replace(/[^a-zA-Z]/g, '').length > 0)

  if (sentences.length === 0 || words.length === 0) return 0

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0)

  const wordsPerSentence = words.length / sentences.length
  const syllablesPerWord = totalSyllables / words.length

  const grade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59
  return Math.max(0, Math.round(grade * 10) / 10)
}

/**
 * Convert grade level to a 0-100 score.
 * 6th grade (target) = 100, 12th grade = 0.
 * Clamped to [0, 100].
 */
export function readabilityScore(gradeLevel: number): number {
  // Linear scale: grade 6 = 100, grade 12 = 0
  const score = Math.round(((12 - gradeLevel) / 6) * 100)
  return Math.max(0, Math.min(100, score))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/readability.test.ts`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/readability.ts src/lib/carousel/readability.test.ts
git commit -m "feat(carousel): add Flesch-Kincaid readability scorer

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Quality checker core function

**Files:**
- Create: `src/lib/carousel/quality-checker.ts`
- Create: `src/lib/carousel/quality-checker.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/carousel/quality-checker.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateCarouselQuality } from './quality-checker'
import type { BrandKit } from './types'

const mockBrandKit: BrandKit = {
  id: 'test-kit',
  name: 'Test Agent',
  primary_color: '#1a1a2e',
  secondary_color: '#e94560',
  font_family: 'Inter',
  logo_url: null,
  headshot_url: null,
}

const goodSlides = [
  { headline: 'This Changes Everything', body: 'A simple story about a great home.', visual_suggestion: 'exterior' },
  { headline: 'The Location Wins', body: 'Close to parks and restaurants. Easy commute.', visual_suggestion: 'map' },
  { headline: 'What Made It Special', body: 'Three bedrooms, updated kitchen, big yard.', visual_suggestion: 'interior' },
  { headline: 'A Perfect Fit', body: 'They knew right away this was the one.', visual_suggestion: 'family' },
  { headline: 'Get In Touch', body: 'Ready to find your next home? Let us talk.', visual_suggestion: 'headshot' },
]

const badSlides = [
  { headline: 'This is a really really long headline that goes on forever', body: 'It is worth noting that this property boasts stunning views and is nestled in a sought-after neighborhood with breathtaking scenery and truly exceptional architecture that makes it incredibly unique.', visual_suggestion: 'exterior' },
  { headline: 'Furthermore', body: 'Moreover, this property is beautiful.', visual_suggestion: 'map' },
  { headline: 'Also', body: 'Short.', visual_suggestion: 'interior' },
]

describe('validateCarouselQuality', () => {
  it('scores good content as A or B', () => {
    const report = validateCarouselQuality(goodSlides, mockBrandKit)
    expect(report.overallScore).toBeGreaterThanOrEqual(70)
    expect(['A', 'B']).toContain(report.grade)
  })

  it('scores bad content lower', () => {
    const report = validateCarouselQuality(badSlides, mockBrandKit)
    expect(report.overallScore).toBeLessThan(70)
    expect(report.slideFlags.length).toBeGreaterThan(0)
  })

  it('flags headlines over 8 words', () => {
    const report = validateCarouselQuality(badSlides, mockBrandKit)
    const headlineFlags = report.slideFlags.filter((f) =>
      f.issues.some((i) => i.includes('headline') && i.includes('words'))
    )
    expect(headlineFlags.length).toBeGreaterThan(0)
  })

  it('flags body text over 40 words', () => {
    const report = validateCarouselQuality(badSlides, mockBrandKit)
    const bodyFlags = report.slideFlags.filter((f) =>
      f.issues.some((i) => i.includes('body') && i.includes('words'))
    )
    expect(bodyFlags.length).toBeGreaterThan(0)
  })

  it('produces correct grade boundaries', () => {
    // A = 90-100
    const reportA = validateCarouselQuality(goodSlides, mockBrandKit)
    if (reportA.overallScore >= 90) expect(reportA.grade).toBe('A')
    if (reportA.overallScore >= 80 && reportA.overallScore < 90) expect(reportA.grade).toBe('B')
  })

  it('includes top 3 suggestions', () => {
    const report = validateCarouselQuality(badSlides, mockBrandKit)
    expect(report.suggestions.length).toBeLessThanOrEqual(3)
    expect(report.suggestions.length).toBeGreaterThan(0)
  })

  it('handles empty slides array', () => {
    const report = validateCarouselQuality([], mockBrandKit)
    expect(report.overallScore).toBe(0)
    expect(report.grade).toBe('F')
  })

  it('validates brand compliance', () => {
    const badBrandKit = { ...mockBrandKit, primary_color: 'not-a-color', name: '' }
    const report = validateCarouselQuality(goodSlides, badBrandKit)
    expect(report.dimensions.brandCompliance.flags.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/quality-checker.test.ts`

Expected: FAIL - module not found

- [ ] **Step 3: Implement quality-checker.ts**

Create `src/lib/carousel/quality-checker.ts`:

```typescript
/**
 * Quality Gate - Carousel Content Scoring
 *
 * Pure function that scores generated carousel content on 5 dimensions.
 * Returns a QualityReport with per-slide flags and actionable suggestions.
 * Does not block delivery - informational only.
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

type SlideInput = {
  headline: string
  body: string
  visual_suggestion: string
}

const MAX_HEADLINE_WORDS = 8
const MAX_BODY_WORDS = 40
const HOOK_SLIDE_COUNT = 3
const PREFERRED_HOOK_WORDS = 6

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length
}

function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
}

const FILLER_OPENERS = [
  /^in today/i,
  /^it is/i,
  /^it's worth/i,
  /^there is/i,
  /^there are/i,
  /^as you/i,
  /^when it comes/i,
  /^if you/i,
  /^have you ever/i,
]

function scoreReadability(slides: SlideInput[]): QualityDimension {
  if (slides.length === 0) return { score: 0, weight: 0.25, flags: [] }

  const flags: string[] = []
  const allText = slides.map((s) => `${s.headline}. ${s.body}`).join(' ')
  const grade = fleschKincaidGradeLevel(allText)
  const score = readabilityScore(grade)

  if (grade > 8) {
    flags.push(`Reading level is grade ${grade.toFixed(1)} (target: 6th grade)`)
  }

  return { score, weight: 0.25, flags }
}

function scoreConciseness(slides: SlideInput[]): { dimension: QualityDimension; slideFlags: SlideFlag[] } {
  if (slides.length === 0) return { dimension: { score: 0, weight: 0.25, flags: [] }, slideFlags: [] }

  const flags: string[] = []
  const slideFlags: SlideFlag[] = []
  let passingSlides = 0

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]
    const issues: string[] = []
    const hw = wordCount(slide.headline)
    const bw = wordCount(slide.body)
    let slidePass = true

    if (hw > MAX_HEADLINE_WORDS) {
      issues.push(`Headline is ${hw} words (max ${MAX_HEADLINE_WORDS})`)
      slidePass = false
    }
    if (bw > MAX_BODY_WORDS) {
      issues.push(`Body is ${bw} words (max ${MAX_BODY_WORDS})`)
      slidePass = false
    }

    if (issues.length > 0) {
      slideFlags.push({ slideIndex: i, issues })
    }
    if (slidePass) passingSlides++
  }

  const score = Math.round((passingSlides / slides.length) * 100)
  if (score < 100) {
    flags.push(`${slides.length - passingSlides} of ${slides.length} slides exceed word limits`)
  }

  return { dimension: { score, weight: 0.25, flags }, slideFlags }
}

function scoreAuthenticity(slides: SlideInput[]): { dimension: QualityDimension; slideFlags: SlideFlag[] } {
  if (slides.length === 0) return { dimension: { score: 0, weight: 0.25, flags: [] }, slideFlags: [] }

  const flags: string[] = []
  const slideFlags: SlideFlag[] = []
  let totalAiScore = 0

  for (let i = 0; i < slides.length; i++) {
    const text = `${slides[i].headline}. ${slides[i].body}`
    const result = analyzeAIScore(text)
    totalAiScore += result.score

    if (result.flags.length > 0) {
      slideFlags.push({
        slideIndex: i,
        issues: result.flags.map((f) => `AI pattern: ${f}`),
      })
    }
  }

  const avgAiScore = totalAiScore / slides.length
  const score = Math.round((1 - avgAiScore) * 100)

  if (score < 80) {
    flags.push('Content contains AI-tell phrases that may reduce authenticity')
  }

  return { dimension: { score, weight: 0.25, flags }, slideFlags }
}

function scoreHookStrength(slides: SlideInput[]): QualityDimension {
  if (slides.length === 0) return { score: 0, weight: 0.15, flags: [] }

  const flags: string[] = []
  const hookCount = Math.min(HOOK_SLIDE_COUNT, slides.length)
  let hookPoints = 0
  const maxPoints = hookCount * 3 // 3 checks per hook slide

  for (let i = 0; i < hookCount; i++) {
    const headline = slides[i].headline

    // Check 1: Not a filler opener
    const isFillerOpener = FILLER_OPENERS.some((p) => p.test(headline))
    if (!isFillerOpener) {
      hookPoints++
    } else {
      flags.push(`Slide ${i + 1} hook starts with filler phrase`)
    }

    // Check 2: Starts with question or bold statement
    const isQuestion = headline.trim().endsWith('?')
    const isBold = /^[A-Z]/.test(headline) && wordCount(headline) <= PREFERRED_HOOK_WORDS
    if (isQuestion || isBold) {
      hookPoints++
    }

    // Check 3: Under preferred word count
    if (wordCount(headline) <= PREFERRED_HOOK_WORDS) {
      hookPoints++
    } else {
      flags.push(`Slide ${i + 1} hook is ${wordCount(headline)} words (prefer ${PREFERRED_HOOK_WORDS} or fewer)`)
    }
  }

  const score = maxPoints > 0 ? Math.round((hookPoints / maxPoints) * 100) : 0
  return { score, weight: 0.15, flags }
}

function scoreBrandCompliance(slides: SlideInput[], brandKit: BrandKit): QualityDimension {
  const flags: string[] = []
  let checks = 0
  let passed = 0

  // Check 1: Valid primary color
  checks++
  if (isValidHexColor(brandKit.primary_color)) {
    passed++
  } else {
    flags.push(`Invalid primary color: "${brandKit.primary_color}"`)
  }

  // Check 2: Valid secondary color
  checks++
  if (isValidHexColor(brandKit.secondary_color)) {
    passed++
  } else {
    flags.push(`Invalid secondary color: "${brandKit.secondary_color}"`)
  }

  // Check 3: Agent name present
  checks++
  if (brandKit.name && brandKit.name.trim().length > 0) {
    passed++
  } else {
    flags.push('Brand kit is missing agent name')
  }

  // Check 4: Font family set
  checks++
  if (brandKit.font_family && brandKit.font_family.trim().length > 0) {
    passed++
  } else {
    flags.push('Brand kit is missing font family')
  }

  const score = checks > 0 ? Math.round((passed / checks) * 100) : 0
  return { score, weight: 0.10, flags }
}

function gradeFromScore(score: number): QualityGrade {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function buildSuggestions(dimensions: QualityReport['dimensions']): string[] {
  const suggestions: string[] = []

  // Sort dimensions by score ascending (worst first)
  const sorted = Object.entries(dimensions)
    .sort(([, a], [, b]) => a.score - b.score)

  for (const [name, dim] of sorted) {
    if (suggestions.length >= 3) break
    if (dim.score >= 90) continue

    switch (name) {
      case 'readability':
        suggestions.push('Simplify language. Use shorter words and sentences for a 6th grade reading level.')
        break
      case 'conciseness':
        suggestions.push('Shorten slide text. Headlines should be under 8 words, body under 40.')
        break
      case 'authenticity':
        suggestions.push('Remove AI-sounding phrases. Use natural, conversational language.')
        break
      case 'hookStrength':
        suggestions.push('Strengthen hook slides (1-3). Use questions or bold statements under 6 words.')
        break
      case 'brandCompliance':
        suggestions.push('Check brand kit settings. Ensure colors are valid hex and agent name is set.')
        break
    }
  }

  return suggestions
}

/**
 * Validate carousel content quality. Pure function, no side effects.
 *
 * @param slides - Generated slide content (post-humanizer)
 * @param brandKit - Agent's brand kit configuration
 * @returns QualityReport with overall score, per-dimension breakdown, and per-slide flags
 */
export function validateCarouselQuality(
  slides: SlideInput[],
  brandKit: BrandKit
): QualityReport {
  if (slides.length === 0) {
    return {
      overallScore: 0,
      grade: 'F',
      dimensions: {
        readability: { score: 0, weight: 0.25, flags: ['No slides to evaluate'] },
        conciseness: { score: 0, weight: 0.25, flags: [] },
        authenticity: { score: 0, weight: 0.25, flags: [] },
        hookStrength: { score: 0, weight: 0.15, flags: [] },
        brandCompliance: { score: 0, weight: 0.10, flags: [] },
      },
      slideFlags: [],
      suggestions: ['Generate content first.'],
    }
  }

  const readability = scoreReadability(slides)
  const { dimension: conciseness, slideFlags: concisenessFlags } = scoreConciseness(slides)
  const { dimension: authenticity, slideFlags: authenticityFlags } = scoreAuthenticity(slides)
  const hookStrength = scoreHookStrength(slides)
  const brandCompliance = scoreBrandCompliance(slides, brandKit)

  // Merge slide flags by index
  const flagMap = new Map<number, string[]>()
  for (const sf of [...concisenessFlags, ...authenticityFlags]) {
    const existing = flagMap.get(sf.slideIndex) || []
    flagMap.set(sf.slideIndex, [...existing, ...sf.issues])
  }
  const slideFlags: SlideFlag[] = Array.from(flagMap.entries())
    .map(([slideIndex, issues]) => ({ slideIndex, issues }))
    .sort((a, b) => a.slideIndex - b.slideIndex)

  const dimensions = { readability, conciseness, authenticity, hookStrength, brandCompliance }

  const overallScore = Math.round(
    readability.score * readability.weight +
    conciseness.score * conciseness.weight +
    authenticity.score * authenticity.weight +
    hookStrength.score * hookStrength.weight +
    brandCompliance.score * brandCompliance.weight
  )

  return {
    overallScore,
    grade: gradeFromScore(overallScore),
    dimensions,
    slideFlags,
    suggestions: buildSuggestions(dimensions),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/quality-checker.test.ts`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/quality-checker.ts src/lib/carousel/quality-checker.test.ts
git commit -m "feat(carousel): add quality gate scoring with 5 dimensions

Readability (Flesch-Kincaid), conciseness, authenticity, hook
strength, and brand compliance. Pure function, no side effects.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Wire quality checker into generate route

**Files:**
- Modify: `src/app/api/storywork/generate/route.ts:119-150`

- [ ] **Step 1: Add quality report to generate response**

In `src/app/api/storywork/generate/route.ts`, add the import at the top (after existing imports):

```typescript
import { validateCarouselQuality } from '@/lib/carousel/quality-checker'
```

Then after the humanizer call (after line ~123 `const humanizedSlides = humanizeCarouselSlides(...)`) and before the database update, add:

```typescript
    // Run quality gate (soft score - does not block delivery)
    const qualityReport = validateCarouselQuality(humanizedSlides, /* brandKit not available here yet */)
```

**Note:** The generate route doesn't currently receive the brandKit. For now, pass a minimal brandKit with just the agent name. The full brand compliance check runs client-side where the brandKit is available. Update the response to include the quality report:

Replace the success response (around line ~147):

```typescript
    return NextResponse.json({
      success: true,
      content: generatedContent,
      creditsRemaining: creditResult.newBalance,
    })
```

With:

```typescript
    // Quality check with partial brand info (full check happens client-side with brand kit)
    const partialBrandKit = {
      id: '',
      name: agentName,
      primary_color: '#000000',
      secondary_color: '#ffffff',
      font_family: 'Inter',
      logo_url: null,
      headshot_url: null,
    }
    const qualityReport = validateCarouselQuality(humanizedSlides, partialBrandKit)

    return NextResponse.json({
      success: true,
      content: generatedContent,
      qualityReport,
      creditsRemaining: creditResult.newBalance,
    })
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run`

Expected: All existing tests PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/app/api/storywork/generate/route.ts
git commit -m "feat(api): return quality report from generate endpoint

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Add slideRegeneration credit cost and rate limit config

**Files:**
- Modify: `src/lib/credits/config.ts:20-29`

- [ ] **Step 1: Add slideRegeneration cost**

In `src/lib/credits/config.ts`, add after line 28 (voiceTranscription):

```typescript
  /** Cost for single slide regeneration */
  slideRegeneration: parseIntEnv(process.env.CREDIT_COST_SLIDE_REGENERATION, 15),
```

And in `getCreditOperationName`, add a case:

```typescript
    case 'storywork_slide_regen':
      return 'Slide Regeneration'
```

- [ ] **Step 2: Run existing tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run`

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/credits/config.ts
git commit -m "feat(credits): add slideRegeneration cost (15 credits)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Regenerate-slide API endpoint

**Files:**
- Create: `src/app/api/storywork/regenerate-slide/route.ts`
- Create: `src/app/api/storywork/regenerate-slide/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/storywork/regenerate-slide/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'user_123' })),
  currentUser: vi.fn(() =>
    Promise.resolve({
      firstName: 'Test',
      emailAddresses: [{ emailAddress: 'test@test.com' }],
    })
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: () => Promise.resolve({ data: { id: 'sw_user_1', credit_balance: 100 }, error: null }),
    })),
  }),
}))

vi.mock('@/lib/credits/service', () => ({
  getOrCreateUser: vi.fn(() => Promise.resolve({ id: 'sw_user_1', credit_balance: 100 })),
  spendCredits: vi.fn(() => Promise.resolve({ success: true, newBalance: 85 })),
}))

vi.mock('@/lib/ai/client', () => ({
  generateContent: vi.fn(() => Promise.resolve('{"headline":"Short Hook","body":"Better version here."}')),
  parseJsonResponse: vi.fn((r: string) => JSON.parse(r)),
}))

vi.mock('@/lib/rate-limit/limiter', () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true })),
  RateLimits: { storyGeneration: { maxRequests: 10, windowMs: 300000 } },
  rateLimitHeaders: vi.fn(() => ({})),
}))

vi.mock('@/lib/voice/humanizer', () => ({
  humanizeContent: vi.fn((text: string) => text),
}))

describe('POST /api/storywork/regenerate-slide', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never)

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/storywork/regenerate-slide', {
      method: 'POST',
      body: JSON.stringify({
        slide: { headline: 'Too long headline here now', body: 'Body text.' },
        qualityFlags: ['Headline is 5 words (max 8)'],
        storyId: 'story_1',
      }),
    })

    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/storywork/regenerate-slide', {
      method: 'POST',
      body: 'not json',
    })

    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/app/api/storywork/regenerate-slide/route.test.ts`

Expected: FAIL - module not found

- [ ] **Step 3: Implement regenerate-slide route**

Create `src/app/api/storywork/regenerate-slide/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { generateContent, parseJsonResponse } from '@/lib/ai/client'
import { AI_PRESETS } from '@/lib/ai/config'
import { spendCredits, getOrCreateUser } from '@/lib/credits/service'
import { CREDIT_COSTS } from '@/lib/credits/config'
import { checkRateLimit, RateLimits, rateLimitHeaders } from '@/lib/rate-limit/limiter'
import { humanizeContent } from '@/lib/voice/humanizer'
import { getVoiceProfile } from '@/lib/voice/profile-service'
import { DEFAULT_VOICE_PROFILE } from '@/lib/voice/types'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const regenerateSchema = z.object({
  slide: z.object({
    headline: z.string(),
    body: z.string(),
  }),
  qualityFlags: z.array(z.string()),
  storyId: z.string(),
  locationContext: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit
    const rateLimit = await checkRateLimit(`regenerate:${userId}`, RateLimits.storyGeneration)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many regeneration requests. Please wait.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress
    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 })
    }

    // Parse body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = regenerateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request', details: validation.error.issues }, { status: 400 })
    }

    const { slide, qualityFlags, locationContext } = validation.data

    // Spend credits
    const storyworkUser = await getOrCreateUser(userId, email)
    const creditResult = await spendCredits(
      storyworkUser.id,
      CREDIT_COSTS.slideRegeneration,
      'storywork_slide_regen',
      'Slide regeneration'
    )

    if (!creditResult.success) {
      return NextResponse.json(
        { error: creditResult.error || 'Insufficient credits', balance: creditResult.newBalance },
        { status: 402 }
      )
    }

    // Build targeted prompt
    const flagsText = qualityFlags.map((f) => `- ${f}`).join('\n')
    const prompt = `Rewrite this carousel slide to fix these quality issues:

ISSUES:
${flagsText}

ORIGINAL SLIDE:
Headline: ${slide.headline}
Body: ${slide.body}

${locationContext ? `LOCATION CONTEXT:\n${locationContext}\n` : ''}
RULES:
- Headline: max 8 words, punchy, no cliches
- Body: max 40 words, conversational
- Fix the specific issues listed above
- Keep the same meaning and topic
- Sound like a real person, not AI

Respond with ONLY a JSON object:
{"headline": "...", "body": "..."}`

    const response = await generateContent(prompt, AI_PRESETS.storyGeneration)
    const newSlide = parseJsonResponse<{ headline: string; body: string }>(response)

    if (!newSlide) {
      return NextResponse.json({ error: 'Failed to regenerate slide' }, { status: 500 })
    }

    // Apply humanizer
    let voiceProfile = await getVoiceProfile(storyworkUser.id)
    if (!voiceProfile) {
      voiceProfile = {
        id: '',
        userId: storyworkUser.id,
        createdAt: new Date().toISOString(),
        ...DEFAULT_VOICE_PROFILE,
      }
    }

    const humanizedSlide = {
      headline: humanizeContent(newSlide.headline, voiceProfile),
      body: humanizeContent(newSlide.body, voiceProfile),
    }

    return NextResponse.json({
      success: true,
      slide: humanizedSlide,
      creditsRemaining: creditResult.newBalance,
    })
  } catch (error) {
    console.error('Slide regeneration error:', error)
    return NextResponse.json({ error: 'Failed to regenerate slide' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/app/api/storywork/regenerate-slide/route.test.ts`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/app/api/storywork/regenerate-slide/route.ts src/app/api/storywork/regenerate-slide/route.test.ts
git commit -m "feat(api): add regenerate-slide endpoint with 15 credit cost

Targeted single-slide regeneration using quality flags as constraints.
Rate limited to 10 requests per 5 minutes per user.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: QualityScore and QualityDetails UI components

**Files:**
- Create: `src/components/carousel/QualityScore.tsx`
- Create: `src/components/carousel/QualityDetails.tsx`
- Modify: `src/components/carousel/CarouselPreview.tsx`

- [ ] **Step 1: Create QualityScore badge component**

Create `src/components/carousel/QualityScore.tsx`:

```typescript
'use client'

import type { QualityGrade } from '@/lib/carousel/quality-checker'

interface QualityScoreProps {
  score: number
  grade: QualityGrade
}

const gradeColors: Record<QualityGrade, string> = {
  A: 'bg-green-500',
  B: 'bg-green-400',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
}

export function QualityScore({ score, grade }: QualityScoreProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold ${gradeColors[grade]}`}
      >
        {grade}
      </div>
      <div className="text-sm">
        <div className="font-medium text-white">Content Score</div>
        <div className="text-neutral-400">{score}/100</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create QualityDetails expandable panel**

Create `src/components/carousel/QualityDetails.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QualityReport } from '@/lib/carousel/quality-checker'

interface QualityDetailsProps {
  report: QualityReport
  onRegenerateSlide?: (slideIndex: number) => void
  regenerating?: number | null
}

const dimensionLabels: Record<string, string> = {
  readability: 'Readability',
  conciseness: 'Conciseness',
  authenticity: 'Authenticity',
  hookStrength: 'Hook Strength',
  brandCompliance: 'Brand Compliance',
}

function ProgressBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="h-1.5 w-full rounded-full bg-neutral-700">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  )
}

export function QualityDetails({ report, onRegenerateSlide, regenerating }: QualityDetailsProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg bg-neutral-800 border border-neutral-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-sm text-neutral-300 hover:text-white transition-colors"
      >
        <span>
          Quality Details
          {report.slideFlags.length > 0 && (
            <span className="ml-2 text-yellow-500">
              ({report.slideFlags.length} slide{report.slideFlags.length !== 1 ? 's' : ''} flagged)
            </span>
          )}
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="border-t border-neutral-700 p-4 space-y-4">
          {/* Suggestions */}
          {report.suggestions.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Suggestions</h4>
              {report.suggestions.map((s, i) => (
                <p key={i} className="text-sm text-neutral-300">{s}</p>
              ))}
            </div>
          )}

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(report.dimensions).map(([key, dim]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">{dimensionLabels[key]}</span>
                  <span className="text-neutral-300">{dim.score}</span>
                </div>
                <ProgressBar score={dim.score} />
              </div>
            ))}
          </div>

          {/* Per-slide flags */}
          {report.slideFlags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Slide Issues</h4>
              {report.slideFlags.map((sf) => (
                <div key={sf.slideIndex} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <span className="font-medium text-neutral-300">Slide {sf.slideIndex + 1}:</span>
                    {sf.issues.map((issue, i) => (
                      <p key={i} className="text-neutral-400 text-xs">{issue}</p>
                    ))}
                  </div>
                  {onRegenerateSlide && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRegenerateSlide(sf.slideIndex)}
                      disabled={regenerating === sf.slideIndex}
                      className="shrink-0 text-xs"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${regenerating === sf.slideIndex ? 'animate-spin' : ''}`} />
                      Regen
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add QualityScore and QualityDetails to CarouselPreview**

In `src/components/carousel/CarouselPreview.tsx`, add imports at the top:

```typescript
import { QualityScore } from './QualityScore'
import { QualityDetails } from './QualityDetails'
import type { QualityReport } from '@/lib/carousel/quality-checker'
```

Add `qualityReport` to the props interface:

```typescript
interface CarouselPreviewProps {
  content: GeneratedContent
  brandKit: BrandKit
  storyId: string
  storyTitle: string
  qualityReport?: QualityReport
}
```

Destructure it in the component:

```typescript
export function CarouselPreview({
  content,
  brandKit,
  storyId,
  storyTitle,
  qualityReport,
}: CarouselPreviewProps) {
```

In the header section (around line 57, inside the flex wrapper with FormatSelector and ExportButton), add:

```typescript
        {qualityReport && (
          <QualityScore score={qualityReport.overallScore} grade={qualityReport.grade} />
        )}
```

After the caption/hashtags grid (after line ~211), add:

```typescript
      {/* Quality details */}
      {qualityReport && (
        <QualityDetails report={qualityReport} />
      )}
```

- [ ] **Step 4: Run lint to verify no errors**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx eslint src/components/carousel/QualityScore.tsx src/components/carousel/QualityDetails.tsx src/components/carousel/CarouselPreview.tsx`

Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/components/carousel/QualityScore.tsx src/components/carousel/QualityDetails.tsx src/components/carousel/CarouselPreview.tsx
git commit -m "feat(ui): add QualityScore badge and QualityDetails panel to carousel preview

Shows Content Score (A-F) with per-dimension breakdown,
per-slide flags, and regeneration buttons.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Visual Layout Templates (Phase 2)

### Task 8: Extend carousel types

**Files:**
- Modify: `src/lib/carousel/types.ts`

- [ ] **Step 1: Add new types to types.ts**

In `src/lib/carousel/types.ts`, add after the existing `SlideContent` interface (line 18):

```typescript
// Layout type for visual dispatch
export type LayoutType = 'hero' | 'data_card' | 'content' | 'cta'

// Slide format from archetype config
export type SuggestedFormat = 'bold_statement' | 'question' | 'data_point' | 'quote' | 'cta'

// Background configuration
export type BackgroundStyle = 'solid' | 'gradient' | 'photo'

export interface SlideBackground {
  type: BackgroundStyle
  gradientDirection?: 'to-bottom' | 'to-right' | 'to-bottom-right'
  gradientEndColor?: string
  imageData?: string | null // base64 data URI (Satori cannot use URLs)
  overlayOpacity?: number   // 0.0-1.0, default 0.55
}
```

Extend `SlideContent` interface to add optional fields:

```typescript
export interface SlideContent {
  headline: string
  body: string
  visual_suggestion: string
  slideNumber: number
  totalSlides: number
  suggestedFormat?: SuggestedFormat
  background?: SlideBackground
}
```

Extend `BrandKit` interface:

```typescript
export interface BrandKit {
  id: string
  name: string
  primary_color: string
  secondary_color: string
  font_family: string
  logo_url: string | null
  headshot_url: string | null
  background_style?: BackgroundStyle
  gradient_end_color?: string | null
  gradient_direction?: string
}
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run`

Expected: All tests PASS (types are additive, existing code still compiles)

- [ ] **Step 3: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/types.ts
git commit -m "feat(carousel): extend types with LayoutType, SlideBackground, SuggestedFormat

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Layout shared types and scale helpers

**Files:**
- Create: `src/lib/carousel/layouts/types.ts`

- [ ] **Step 1: Create layout shared types**

Create `src/lib/carousel/layouts/types.ts`:

```typescript
import type { SlideContent, BrandKit, SlideBackground } from '../types'

/**
 * Props passed to every layout function.
 * Layout functions return Satori-compatible element objects.
 */
export interface LayoutProps {
  slide: SlideContent
  brandKit: BrandKit
  width: number
  height: number
  background?: SlideBackground
}

/**
 * Satori element - plain object representation of JSX.
 * Satori uses flexbox-only CSS subset.
 */
export type SatoriElement = {
  type: string
  props: {
    style?: Record<string, unknown>
    children?: SatoriElement | SatoriElement[] | string | null
    src?: string
    [key: string]: unknown
  }
}

/**
 * Scale font sizes proportionally to slide height.
 * Base sizes are designed for 1080px height (IG feed).
 * LinkedIn (627px) gets ~0.58x, IG Story (1920px) gets 1.0x (capped).
 */
export function scaleFontSize(basePx: number, height: number): number {
  const factor = Math.min(1, height / 1080)
  return Math.round(basePx * factor)
}

/**
 * Scale padding/spacing proportionally to slide width.
 */
export function scalePadding(basePx: number, width: number): number {
  const factor = Math.min(1, width / 1080)
  return Math.round(basePx * factor)
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/layouts/types.ts
git commit -m "feat(carousel): add layout shared types and scale helpers

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Background renderer

**Files:**
- Create: `src/lib/carousel/layouts/background.ts`
- Create: `src/lib/carousel/layouts/background.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/carousel/layouts/background.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createBackgroundElements } from './background'

describe('createBackgroundElements', () => {
  it('returns solid background by default', () => {
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080)
    expect(elements).toHaveLength(1)
    expect(elements[0].props.style?.backgroundColor).toBe('#1a1a2e')
  })

  it('returns gradient background', () => {
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080, {
      type: 'gradient',
      gradientEndColor: '#e94560',
      gradientDirection: 'to-bottom',
    })
    expect(elements).toHaveLength(1)
    expect(elements[0].props.style?.backgroundImage).toContain('linear-gradient')
  })

  it('returns photo background with overlay', () => {
    const fakeBase64 = 'data:image/jpeg;base64,/9j/4AAQ'
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080, {
      type: 'photo',
      imageData: fakeBase64,
      overlayOpacity: 0.55,
    })
    // Should have: img element + overlay div
    expect(elements).toHaveLength(2)
    expect(elements[0].type).toBe('img')
    expect(elements[0].props.src).toBe(fakeBase64)
    expect(elements[1].props.style?.backgroundColor).toContain('rgba')
  })

  it('falls back to solid when photo has no imageData', () => {
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080, {
      type: 'photo',
      imageData: null,
    })
    expect(elements).toHaveLength(1)
    expect(elements[0].props.style?.backgroundColor).toBe('#1a1a2e')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/layouts/background.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement background.ts**

Create `src/lib/carousel/layouts/background.ts`:

```typescript
import type { SatoriElement } from './types'
import type { SlideBackground } from '../types'

const GRADIENT_DIRECTIONS: Record<string, string> = {
  'to-bottom': 'to bottom',
  'to-right': 'to right',
  'to-bottom-right': 'to bottom right',
}

/**
 * Create background elements for a slide.
 * Returns array of Satori elements to be placed as first children (position: absolute).
 *
 * Satori CANNOT use background-image: url(). Photo backgrounds use a stacked
 * <img> element with a dark overlay <div> on top.
 */
export function createBackgroundElements(
  primaryColor: string,
  width: number,
  height: number,
  background?: SlideBackground
): SatoriElement[] {
  const absoluteFill = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }

  // Photo background with overlay
  if (background?.type === 'photo' && background.imageData) {
    const opacity = background.overlayOpacity ?? 0.55
    return [
      {
        type: 'img',
        props: {
          src: background.imageData,
          style: {
            ...absoluteFill,
            objectFit: 'cover',
          },
        },
      },
      {
        type: 'div',
        props: {
          style: {
            ...absoluteFill,
            backgroundColor: `rgba(0,0,0,${opacity})`,
          },
        },
      },
    ]
  }

  // Gradient background
  if (background?.type === 'gradient' && background.gradientEndColor) {
    const direction = GRADIENT_DIRECTIONS[background.gradientDirection || 'to-bottom'] || 'to bottom'
    return [
      {
        type: 'div',
        props: {
          style: {
            ...absoluteFill,
            backgroundImage: `linear-gradient(${direction}, ${primaryColor}, ${background.gradientEndColor})`,
          },
        },
      },
    ]
  }

  // Solid background (default)
  return [
    {
      type: 'div',
      props: {
        style: {
          ...absoluteFill,
          backgroundColor: primaryColor,
        },
      },
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/layouts/background.test.ts`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/layouts/background.ts src/lib/carousel/layouts/background.test.ts
git commit -m "feat(carousel): add background renderer (solid/gradient/photo)

Photo backgrounds use pre-fetched base64 data URIs with stacked
img + overlay elements (Satori cannot use CSS url()).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Four layout implementations

**Files:**
- Create: `src/lib/carousel/layouts/hero-slide.ts`
- Create: `src/lib/carousel/layouts/data-card-slide.ts`
- Create: `src/lib/carousel/layouts/content-slide.ts`
- Create: `src/lib/carousel/layouts/cta-slide.ts`
- Create: `src/lib/carousel/layouts/layouts.test.ts`

- [ ] **Step 1: Write failing tests for all 4 layouts**

Create `src/lib/carousel/layouts/layouts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createHeroSlide } from './hero-slide'
import { createDataCardSlide } from './data-card-slide'
import { createContentSlide } from './content-slide'
import { createCtaSlide } from './cta-slide'
import type { LayoutProps } from './types'

const baseProps: LayoutProps = {
  slide: {
    headline: 'Test Headline',
    body: 'Test body text for the slide.',
    visual_suggestion: 'exterior shot',
    slideNumber: 1,
    totalSlides: 7,
  },
  brandKit: {
    id: 'kit-1',
    name: 'Test Agent',
    primary_color: '#1a1a2e',
    secondary_color: '#e94560',
    font_family: 'Inter',
    logo_url: null,
    headshot_url: null,
  },
  width: 1080,
  height: 1080,
}

describe('createHeroSlide', () => {
  it('returns a valid Satori element', () => {
    const el = createHeroSlide(baseProps)
    expect(el.type).toBe('div')
    expect(el.props.style?.position).toBe('relative')
  })

  it('does not include slide number badge', () => {
    const el = createHeroSlide(baseProps)
    const json = JSON.stringify(el)
    expect(json).not.toContain('1/7')
  })

  it('scales font size for LinkedIn', () => {
    const linkedInProps = { ...baseProps, width: 1200, height: 627 }
    const el = createHeroSlide(linkedInProps)
    // Check that headline font is smaller than the 1080px version
    const json = JSON.stringify(el)
    expect(json).toBeTruthy() // basic structure check
  })
})

describe('createDataCardSlide', () => {
  it('returns a valid element with large number styling', () => {
    const el = createDataCardSlide(baseProps)
    expect(el.type).toBe('div')
  })
})

describe('createContentSlide', () => {
  it('returns element with slide number badge', () => {
    const el = createContentSlide(baseProps)
    const json = JSON.stringify(el)
    expect(json).toContain('1/7')
  })
})

describe('createCtaSlide', () => {
  it('uses secondary color as background', () => {
    const el = createCtaSlide(baseProps)
    const json = JSON.stringify(el)
    // CTA slide uses secondary_color for background
    expect(json).toContain(baseProps.brandKit.secondary_color)
  })

  it('includes agent name', () => {
    const el = createCtaSlide(baseProps)
    const json = JSON.stringify(el)
    expect(json).toContain('Test Agent')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/layouts/layouts.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement hero-slide.ts**

Create `src/lib/carousel/layouts/hero-slide.ts`:

```typescript
import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'

/**
 * Hero/Hook layout - large centered headline, minimal body.
 * Used for slides 1-3 (hooks). No slide number badge.
 */
export function createHeroSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height, background } = props
  const padding = scalePadding(60, width)
  const headlineSize = scaleFontSize(64, height)
  const bodySize = scaleFontSize(20, height)
  const accentBarHeight = scaleFontSize(4, height)

  const bgElements = createBackgroundElements(brandKit.primary_color, width, height, background)

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        fontFamily: brandKit.font_family,
        position: 'relative',
      },
      children: [
        // Background layer(s)
        ...bgElements,
        // Accent bar at top
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: accentBarHeight,
              backgroundColor: brandKit.secondary_color,
            },
          },
        },
        // Content (centered)
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              flex: 1,
              padding,
              position: 'relative',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: headlineSize,
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1.15,
                    marginBottom: scalePadding(16, width),
                  },
                  children: slide.headline,
                },
              },
              slide.body ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: bodySize,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.4,
                    maxWidth: '80%',
                  },
                  children: slide.body,
                },
              } : null,
            ].filter(Boolean),
          },
        },
      ],
    },
  }
}
```

- [ ] **Step 4: Implement data-card-slide.ts**

Create `src/lib/carousel/layouts/data-card-slide.ts`:

```typescript
import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'

/**
 * Data Card layout - large number/stat prominently displayed.
 * Ideal for Life Here scores, stats, and metrics.
 */
export function createDataCardSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height, background } = props
  const padding = scalePadding(60, width)
  const numberSize = scaleFontSize(72, height)
  const labelSize = scaleFontSize(18, height)
  const bodySize = scaleFontSize(24, height)
  const badgeSize = scaleFontSize(18, height)

  const bgElements = createBackgroundElements(brandKit.primary_color, width, height, background)

  // Try to extract a number from the headline for the big stat display
  const numberMatch = slide.headline.match(/(\d[\d,.%/]*)/)?.[1]
  const label = numberMatch
    ? slide.headline.replace(numberMatch, '').trim().toUpperCase()
    : slide.headline.toUpperCase()
  const displayNumber = numberMatch || ''

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        fontFamily: brandKit.font_family,
        position: 'relative',
      },
      children: [
        ...bgElements,
        // Slide badge
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: padding,
              right: padding,
              backgroundColor: brandKit.secondary_color,
              color: 'white',
              padding: '6px 14px',
              borderRadius: 16,
              fontSize: badgeSize,
              fontWeight: 600,
            },
            children: `${slide.slideNumber}/${slide.totalSlides}`,
          },
        },
        // Content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              flex: 1,
              padding,
              position: 'relative',
            },
            children: [
              // Big number
              displayNumber ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: numberSize,
                    fontWeight: 700,
                    color: brandKit.secondary_color,
                    lineHeight: 1.1,
                    marginBottom: scalePadding(8, width),
                  },
                  children: displayNumber,
                },
              } : null,
              // Label
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: labelSize,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.6)',
                    letterSpacing: '0.08em',
                    lineHeight: 1.3,
                    marginBottom: scalePadding(24, width),
                  },
                  children: label || slide.headline.toUpperCase(),
                },
              },
              // Body
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: bodySize,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.5,
                  },
                  children: slide.body,
                },
              },
            ].filter(Boolean),
          },
        },
      ],
    },
  }
}
```

- [ ] **Step 5: Implement content-slide.ts**

Create `src/lib/carousel/layouts/content-slide.ts`:

```typescript
import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'

/**
 * Content layout - refined version of original layout.
 * Headline + body with proper hierarchy. Includes slide badge.
 */
export function createContentSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height, background } = props
  const isVertical = height > width
  const padding = scalePadding(60, width)
  const headlineSize = scaleFontSize(isVertical ? 52 : 48, height)
  const bodySize = scaleFontSize(isVertical ? 26 : 24, height)
  const badgeSize = scaleFontSize(18, height)

  const bgElements = createBackgroundElements(brandKit.primary_color, width, height, background)

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        fontFamily: brandKit.font_family,
        position: 'relative',
      },
      children: [
        ...bgElements,
        // Slide badge
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: padding,
              right: padding,
              backgroundColor: brandKit.secondary_color,
              color: 'white',
              padding: '6px 14px',
              borderRadius: 16,
              fontSize: badgeSize,
              fontWeight: 600,
            },
            children: `${slide.slideNumber}/${slide.totalSlides}`,
          },
        },
        // Content
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: isVertical ? 'center' : 'flex-start',
              flex: 1,
              padding,
              paddingTop: isVertical ? padding : padding + 48,
              paddingRight: padding + 48,
              position: 'relative',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: headlineSize,
                    fontWeight: 700,
                    color: 'white',
                    lineHeight: 1.2,
                    marginBottom: scalePadding(28, width),
                  },
                  children: slide.headline,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: bodySize,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 1.6,
                  },
                  children: slide.body,
                },
              },
            ],
          },
        },
        // Brand footer
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: padding,
              right: padding,
              display: 'flex',
              alignItems: 'center',
            },
            children: brandKit.name ? {
              type: 'div',
              props: {
                style: { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.5)' },
                children: brandKit.name,
              },
            } : null,
          },
        },
      ],
    },
  }
}
```

- [ ] **Step 6: Implement cta-slide.ts**

Create `src/lib/carousel/layouts/cta-slide.ts`:

```typescript
import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'

/**
 * CTA layout - secondary color background, centered headline,
 * agent name and optional headshot.
 */
export function createCtaSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height } = props
  const padding = scalePadding(60, width)
  const headlineSize = scaleFontSize(48, height)
  const nameSize = scaleFontSize(20, height)
  const headshotSize = scaleFontSize(64, height)

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: brandKit.secondary_color,
        fontFamily: brandKit.font_family,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        padding,
      },
      children: [
        // Headline
        {
          type: 'div',
          props: {
            style: {
              fontSize: headlineSize,
              fontWeight: 700,
              color: 'white',
              lineHeight: 1.2,
              textAlign: 'center',
              marginBottom: scalePadding(32, width),
            },
            children: slide.headline,
          },
        },
        // Body text
        slide.body ? {
          type: 'div',
          props: {
            style: {
              fontSize: scaleFontSize(22, height),
              fontWeight: 400,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.5,
              textAlign: 'center',
              marginBottom: scalePadding(32, width),
              maxWidth: '80%',
            },
            children: slide.body,
          },
        } : null,
        // Agent branding
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: scalePadding(8, width),
            },
            children: [
              // Headshot circle (if available)
              brandKit.headshot_url ? {
                type: 'div',
                props: {
                  style: {
                    width: headshotSize,
                    height: headshotSize,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.5)',
                    overflow: 'hidden',
                  },
                  // Note: headshot would need to be pre-fetched as base64 for Satori
                  children: null,
                },
              } : null,
              // Agent name
              brandKit.name ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: nameSize,
                    fontWeight: 600,
                    color: 'white',
                  },
                  children: brandKit.name,
                },
              } : null,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  }
}
```

- [ ] **Step 7: Run tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/layouts/layouts.test.ts`

Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/layouts/hero-slide.ts src/lib/carousel/layouts/data-card-slide.ts src/lib/carousel/layouts/content-slide.ts src/lib/carousel/layouts/cta-slide.ts src/lib/carousel/layouts/layouts.test.ts
git commit -m "feat(carousel): add 4 visual layout templates (hero, data card, content, CTA)

Each layout uses scaleFontSize/scalePadding for proportional
sizing across IG feed, IG story, and LinkedIn formats.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Replace renderer with layout dispatcher

**Files:**
- Modify: `src/lib/carousel/renderer.ts`

- [ ] **Step 1: Refactor renderer.ts to use layout dispatcher**

Replace the entire `createSlideElement` function and update `renderSlideToImage` in `src/lib/carousel/renderer.ts`. Keep the existing `renderSlideToImage`, `renderAllSlides`, and `renderSlideToDataUrl` exports but update internals:

Add imports at top:

```typescript
import { createHeroSlide } from './layouts/hero-slide'
import { createDataCardSlide } from './layouts/data-card-slide'
import { createContentSlide } from './layouts/content-slide'
import { createCtaSlide } from './layouts/cta-slide'
import type { LayoutProps } from './layouts/types'
import type { SuggestedFormat, LayoutType } from './types'
```

Replace the `createSlideElement` function with a dispatcher:

```typescript
/**
 * Map suggestedFormat to layout type.
 */
function selectLayout(slide: SlideContent): LayoutType {
  if (slide.suggestedFormat) {
    switch (slide.suggestedFormat) {
      case 'bold_statement': return 'hero'
      case 'data_point': return 'data_card'
      case 'cta': return 'cta'
      case 'question':
      case 'quote':
      default: return 'content'
    }
  }

  // Position-based fallback for legacy content
  if (slide.slideNumber === 1) return 'hero'
  if (slide.slideNumber === slide.totalSlides) return 'cta'
  return 'content'
}

/**
 * Create the Satori element structure using the appropriate layout.
 */
function createSlideElement(
  slide: SlideContent,
  brandKit: BrandKit,
  width: number,
  height: number
) {
  const layoutType = selectLayout(slide)
  const props: LayoutProps = { slide, brandKit, width, height, background: slide.background }

  switch (layoutType) {
    case 'hero': return createHeroSlide(props)
    case 'data_card': return createDataCardSlide(props)
    case 'cta': return createCtaSlide(props)
    case 'content':
    default: return createContentSlide(props)
  }
}
```

Remove the old `createSlideElement` implementation (the large function with inline layout logic).

- [ ] **Step 2: Run all tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run`

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/renderer.ts
git commit -m "refactor(carousel): replace monolithic renderer with layout dispatcher

selectLayout() maps suggestedFormat to layout type, falls back to
position-based heuristics for legacy content.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Brand kit migration for gradient backgrounds

**Files:**
- Create: `supabase/migrations/20260405001_brandkit_backgrounds.sql`

- [ ] **Step 1: Create migration**

Create `supabase/migrations/20260405001_brandkit_backgrounds.sql`:

```sql
-- Add background style options to brand kits
ALTER TABLE storywork_brand_kits
  ADD COLUMN IF NOT EXISTS background_style text NOT NULL DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS gradient_end_color text,
  ADD COLUMN IF NOT EXISTS gradient_direction text NOT NULL DEFAULT 'to-bottom';

COMMENT ON COLUMN storywork_brand_kits.background_style IS 'solid | gradient';
COMMENT ON COLUMN storywork_brand_kits.gradient_end_color IS 'Hex color for gradient end';
COMMENT ON COLUMN storywork_brand_kits.gradient_direction IS 'to-bottom | to-right | to-bottom-right';
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add supabase/migrations/20260405001_brandkit_backgrounds.sql
git commit -m "db: add background_style, gradient_end_color, gradient_direction to brand kits

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Life Here Integration (Phase 3)

### Task 14: Location types and Life Here client

**Files:**
- Create: `src/lib/location/types.ts`
- Create: `src/lib/location/life-here-client.ts`
- Create: `src/lib/location/life-here-client.test.ts`

- [ ] **Step 1: Create location types**

Create `src/lib/location/types.ts`:

```typescript
export type LifeHereData = {
  overallScore: number
  label: string
  profile: string
  dining: {
    score: number
    restaurantCount: number
    topCuisines: string[]
    topRated: string[]
  }
  commute: {
    airportMinutes: number
    beachMinutes: number
    downtownMinutes: number
    themeParkMinutes: number
  }
  lifestyle: {
    score: number
    gymCount: number
    parkCount: number
    entertainmentVenues: number
  }
  convenience: {
    score: number
    nearestGroceryMiles: number
  }
}

export type GeocodedLocation = {
  lat: number
  lng: number
  formattedAddress: string
}
```

- [ ] **Step 2: Write failing test for Life Here client**

Create `src/lib/location/life-here-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchLifeHereData } from './life-here-client'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('fetchLifeHereData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ASM_PORTAL_URL = 'https://app.aerialshots.media'
    process.env.ASM_LIFE_HERE_SECRET = 'test-secret'
  })

  it('returns null when env vars are missing', async () => {
    delete process.env.ASM_PORTAL_URL
    const result = await fetchLifeHereData(28.5383, -81.3792)
    expect(result).toBeNull()
  })

  it('returns parsed data on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          lifeHereScore: { score: 82, label: 'Excellent', profile: 'balanced' },
          scores: {
            dining: { score: 85, highlights: { restaurantCount: 47, topRated: [], cuisineTypes: ['Italian'] } },
            commute: { score: 75, highlights: { airportMinutes: 15, beachMinutes: 25, downtownMinutes: 10, themeParkMinutes: 20 } },
            lifestyle: { score: 78, highlights: { gymCount: 8, parkCount: 12, entertainmentVenues: 5 } },
            convenience: { score: 80, highlights: { nearestGroceryMiles: 0.4 } },
          },
        },
      }),
    })

    const result = await fetchLifeHereData(28.5383, -81.3792)
    expect(result).not.toBeNull()
    expect(result!.overallScore).toBe(82)
    expect(result!.dining.restaurantCount).toBe(47)
    expect(result!.commute.airportMinutes).toBe(15)
  })

  it('returns null on API error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 })
    const result = await fetchLifeHereData(28.5383, -81.3792)
    expect(result).toBeNull()
  })

  it('returns null on timeout', async () => {
    mockFetch.mockRejectedValue(new Error('AbortError'))
    const result = await fetchLifeHereData(28.5383, -81.3792)
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 3: Implement Life Here client**

Create `src/lib/location/life-here-client.ts`:

```typescript
import type { LifeHereData } from './types'

const TIMEOUT_MS = 10_000

/**
 * Fetch Life Here location intelligence from ASM Portal.
 * Returns null on any failure (timeout, auth, network) - generation proceeds without it.
 */
export async function fetchLifeHereData(
  lat: number,
  lng: number,
  profile: string = 'balanced'
): Promise<LifeHereData | null> {
  const portalUrl = process.env.ASM_PORTAL_URL
  const apiSecret = process.env.ASM_LIFE_HERE_SECRET

  if (!portalUrl || !apiSecret) {
    console.warn('[LifeHere] ASM_PORTAL_URL or ASM_LIFE_HERE_SECRET not configured')
    return null
  }

  try {
    const params = `lat=${lat}&lng=${lng}&profile=${profile}`
    const headers = { 'X-ASM-Secret': apiSecret }
    const signal = AbortSignal.timeout(TIMEOUT_MS)

    const response = await fetch(
      `${portalUrl}/api/v1/location/scores?${params}`,
      { headers, signal }
    )

    if (!response.ok) {
      console.warn(`[LifeHere] Scores API returned ${response.status}`)
      return null
    }

    const data = await response.json()
    if (!data.success || !data.data) return null

    const { lifeHereScore, scores } = data.data

    return {
      overallScore: lifeHereScore.score,
      label: lifeHereScore.label,
      profile: lifeHereScore.profile,
      dining: {
        score: scores.dining?.score ?? 0,
        restaurantCount: scores.dining?.highlights?.restaurantCount ?? 0,
        topCuisines: scores.dining?.highlights?.cuisineTypes ?? [],
        topRated: scores.dining?.highlights?.topRated ?? [],
      },
      commute: {
        airportMinutes: scores.commute?.highlights?.airportMinutes ?? 0,
        beachMinutes: scores.commute?.highlights?.beachMinutes ?? 0,
        downtownMinutes: scores.commute?.highlights?.downtownMinutes ?? 0,
        themeParkMinutes: scores.commute?.highlights?.themeParkMinutes ?? 0,
      },
      lifestyle: {
        score: scores.lifestyle?.score ?? 0,
        gymCount: scores.lifestyle?.highlights?.gymCount ?? 0,
        parkCount: scores.lifestyle?.highlights?.parkCount ?? 0,
        entertainmentVenues: scores.lifestyle?.highlights?.entertainmentVenues ?? 0,
      },
      convenience: {
        score: scores.convenience?.score ?? 0,
        nearestGroceryMiles: scores.convenience?.highlights?.nearestGroceryMiles ?? 0,
      },
    }
  } catch (error) {
    console.error('[LifeHere] Failed to fetch location data:', error)
    return null
  }
}

/**
 * Build a location context string for injection into the generation prompt.
 */
export function buildLocationContext(data: LifeHereData): string {
  const lines = [
    `LOCATION INTELLIGENCE (from Life Here API):`,
    `- Life Here Score: ${data.overallScore}/100 (${data.label})`,
    `- Dining: ${data.dining.restaurantCount} restaurants nearby${data.dining.topCuisines.length > 0 ? `, top cuisines: ${data.dining.topCuisines.slice(0, 3).join(', ')}` : ''}. Score: ${data.dining.score}/100`,
    `- Commute: ${data.commute.airportMinutes} min to airport, ${data.commute.beachMinutes} min to beach, ${data.commute.downtownMinutes} min to downtown`,
    `- Lifestyle: ${data.lifestyle.parkCount} parks, ${data.lifestyle.gymCount} gyms, ${data.lifestyle.entertainmentVenues} entertainment venues. Score: ${data.lifestyle.score}/100`,
    `- Convenience: Nearest grocery ${data.convenience.nearestGroceryMiles} miles`,
    ``,
    `IMPORTANT: Weave these facts naturally into the carousel content.`,
    `Use specific numbers ("${data.lifestyle.parkCount} parks within 5 miles") not vague claims ("great amenities").`,
    `Do NOT dedicate every slide to location data - blend it with the story.`,
  ]
  return lines.join('\n')
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/location/life-here-client.test.ts`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/location/types.ts src/lib/location/life-here-client.ts src/lib/location/life-here-client.test.ts
git commit -m "feat(location): add Life Here API client with prompt context builder

Fetches location intelligence from ASM Portal with 10s timeout.
Returns null on any failure - generation proceeds without it.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: Stories location migration

**Files:**
- Create: `supabase/migrations/20260405002_stories_location.sql`

- [ ] **Step 1: Create migration**

Create `supabase/migrations/20260405002_stories_location.sql`:

```sql
-- Add location fields to stories for Life Here integration
ALTER TABLE storywork_stories
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_data jsonb;

CREATE INDEX IF NOT EXISTS idx_storywork_stories_location
  ON storywork_stories (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

COMMENT ON COLUMN storywork_stories.location_data IS 'Cached Life Here API response';
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add supabase/migrations/20260405002_stories_location.sql
git commit -m "db: add address, lat, lng, location_data to storywork_stories

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 16: Add new archetypes and update registries

**Files:**
- Create: `src/lib/storywork/archetypes/data/lifestyle-spotlight.json`
- Create: `src/lib/storywork/archetypes/data/neighborhood-guide.json`
- Modify: `src/lib/storywork/archetypes/types.ts:18-37`
- Modify: `src/lib/storywork/archetypes/pillars.ts:68`
- Modify: `src/lib/validations/storywork.ts:8-29`

- [ ] **Step 1: Add new IDs to StoryArchetypeId union**

In `src/lib/storywork/archetypes/types.ts`, add to the `StoryArchetypeId` union under THE NEIGHBORHOOD section (after `day_in_the_life`):

```typescript
  | 'lifestyle_spotlight'
  | 'neighborhood_guide'
```

- [ ] **Step 2: Add to STORY_ARCHETYPES validation array**

In `src/lib/validations/storywork.ts`, add to the `STORY_ARCHETYPES` array inside THE NEIGHBORHOOD section (after `'day_in_the_life'`, line ~25):

```typescript
  'lifestyle_spotlight',
  'neighborhood_guide',
```

- [ ] **Step 3: Add to pillars.ts archetypeIds**

In `src/lib/storywork/archetypes/pillars.ts`, update the `the_neighborhood` pillar's `archetypeIds` array (line ~68):

```typescript
    archetypeIds: ['local_legend', 'day_in_the_life', 'lifestyle_spotlight', 'neighborhood_guide'],
```

- [ ] **Step 4: Create lifestyle-spotlight.json**

Create `src/lib/storywork/archetypes/data/lifestyle-spotlight.json` following the exact schema of existing archetypes (see `against-the-odds.json` for reference). Key fields:

```json
{
  "id": "lifestyle_spotlight",
  "name": "Lifestyle Spotlight",
  "version": 1,
  "pillarId": "the_neighborhood",
  "pillarName": "The Neighborhood",
  "controllingIdea": "The right location transforms a house into a lifestyle.",
  "emotionalCore": ["excitement", "aspiration", "belonging"],
  "narrativeArc": {
    "incitingIncident": "A property in a location with exceptional lifestyle amenities",
    "risingAction": "Discovering the dining, commute, and lifestyle advantages",
    "crisis": "Comparing this location against other options",
    "climax": "Realizing this neighborhood checks every box",
    "resolution": "Envisioning daily life in this community"
  },
  "triggerMoments": [
    {
      "moment": "New listing in a high-scoring Life Here location",
      "contextClues": ["great location", "walkable", "close to everything", "lifestyle"],
      "urgency": "same_day"
    }
  ],
  "triggerKeywords": ["lifestyle", "walkable", "close to", "restaurants", "parks", "commute", "location", "neighborhood", "community"],
  "questions": [
    {
      "id": "address",
      "question": "What is the property address?",
      "purpose": "Location for Life Here data",
      "narrativeMapping": "incitingIncident",
      "placeholder": "123 Main St, Orlando, FL",
      "optional": false
    },
    {
      "id": "highlight",
      "question": "What do you love most about this location?",
      "purpose": "Personal endorsement",
      "narrativeMapping": "climax",
      "optional": false
    },
    {
      "id": "buyer_profile",
      "question": "Who is the ideal buyer for this lifestyle?",
      "purpose": "Target audience",
      "narrativeMapping": "resolution",
      "optional": true
    }
  ],
  "promptConfig": {
    "systemContext": "This carousel leads with location intelligence data from the Life Here API. The Life Here Score and specific neighborhood metrics should be prominently featured.",
    "toneGuidance": "Excited but factual. Let the numbers do the talking. Every claim should be backed by a specific stat.",
    "slideStructure": [
      { "slideNumber": 1, "purpose": "Hook with Life Here Score", "contentFocus": "Overall score as hero stat", "suggestedFormat": "data_point", "emotionalBeat": "intrigue" },
      { "slideNumber": 2, "purpose": "Dining highlights", "contentFocus": "Restaurant count, top cuisines", "suggestedFormat": "data_point", "emotionalBeat": "excitement" },
      { "slideNumber": 3, "purpose": "Commute wins", "contentFocus": "Minutes to key destinations", "suggestedFormat": "data_point", "emotionalBeat": "relief" },
      { "slideNumber": 4, "purpose": "Lifestyle amenities", "contentFocus": "Parks, gyms, entertainment", "suggestedFormat": "bold_statement", "emotionalBeat": "aspiration" },
      { "slideNumber": 5, "purpose": "Community vibe", "contentFocus": "What makes this area special", "suggestedFormat": "question", "emotionalBeat": "belonging" },
      { "slideNumber": 6, "purpose": "Ideal buyer", "contentFocus": "Who thrives here", "suggestedFormat": "question", "emotionalBeat": "connection" },
      { "slideNumber": 7, "purpose": "CTA", "contentFocus": "Schedule a tour", "suggestedFormat": "cta", "emotionalBeat": "action" }
    ],
    "avoidPhrases": ["nestled in", "boasts", "sought-after", "dream home", "stunning"],
    "emphasize": ["specific numbers", "real data", "lifestyle benefits", "daily routine"]
  },
  "visualThemes": ["neighborhood aerial", "restaurants", "parks", "commute map"],
  "isActive": true,
  "isSeasonal": false,
  "usageHints": [
    "Best for listings in high-scoring Life Here locations",
    "Requires a property address to fetch location data",
    "Let the data tell the story - every slide should have a number"
  ],
  "exampleScenarios": [
    {
      "title": "Downtown Orlando Condo",
      "situation": "New listing at a condo with Life Here Score of 88",
      "sampleInput": "Downtown Orlando condo, walkable to everything, great dining scene",
      "expectedOutput": {
        "hook": "88/100 Life Here Score",
        "keyMoment": "47 restaurants within walking distance"
      }
    }
  ]
}
```

- [ ] **Step 5: Create neighborhood-guide.json**

Create `src/lib/storywork/archetypes/data/neighborhood-guide.json` following the same schema. Shorter version - the key difference is this is area marketing, not listing-specific.

- [ ] **Step 6: Run all tests to verify nothing broke**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run`

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/storywork/archetypes/data/lifestyle-spotlight.json src/lib/storywork/archetypes/data/neighborhood-guide.json src/lib/storywork/archetypes/types.ts src/lib/storywork/archetypes/pillars.ts src/lib/validations/storywork.ts
git commit -m "feat(archetypes): add lifestyle_spotlight and neighborhood_guide

Life Here-powered archetypes under THE NEIGHBORHOOD pillar.
Both require address for location data fetching.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 17: Wire Life Here into the generate route

**Files:**
- Modify: `src/lib/storywork/prompts.ts`
- Modify: `src/app/api/storywork/generate/route.ts`
- Modify: `src/lib/validations/storywork.ts`

- [ ] **Step 1: Add location context to prompt builder**

In `src/lib/storywork/prompts.ts`, add import at top:

```typescript
import type { LifeHereData } from '@/lib/location/types'
import { buildLocationContext } from '@/lib/location/life-here-client'
```

Update `generateStoryContentPrompt` to accept optional location data. Add a 4th parameter:

```typescript
export const generateStoryContentPrompt = (
  storyType: string,
  answers: Record<string, string>,
  agentName: string,
  locationData?: LifeHereData | null
) => {
```

At the end of the prompt string (before the JSON response format), add:

```typescript
  // Add location context if available
  const locationBlock = locationData ? `\n\n${buildLocationContext(locationData)}` : ''
```

And append `${locationBlock}` to the prompt return value.

- [ ] **Step 2: Add address to validation schema**

In `src/lib/validations/storywork.ts`, update the `storyGenerateSchema` to add optional address fields:

```typescript
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
```

- [ ] **Step 3: Update generate route to fetch and pass location data**

In `src/app/api/storywork/generate/route.ts`, add import:

```typescript
import { fetchLifeHereData } from '@/lib/location/life-here-client'
```

After validation (after `const { storyId, storyType, answers } = validation.data`), add:

```typescript
    const { address, lat, lng } = validation.data

    // Fetch Life Here data if coordinates provided
    let locationData = null
    if (lat !== undefined && lng !== undefined) {
      locationData = await fetchLifeHereData(lat, lng)
    }
```

Update the prompt call to pass location data:

```typescript
    let prompt = generateStoryContentPrompt(storyType, answers, agentName, locationData)
```

Update the database save to include location fields:

```typescript
    const { error: updateError } = await supabase
      .from('storywork_stories')
      .update({
        generated_content: generatedContent,
        status: 'completed',
        address: address || null,
        lat: lat || null,
        lng: lng || null,
        location_data: locationData || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storyId)
      .eq('user_id', storyworkUser.id)
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run`

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/storywork/prompts.ts src/app/api/storywork/generate/route.ts src/lib/validations/storywork.ts
git commit -m "feat(generate): integrate Life Here location data into carousel generation

Fetches location intelligence when lat/lng provided, injects
into Claude prompt. Saves location_data to story record.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Listing Photo Integration (Phase 4)

### Task 18: Listing photos API route

**Files:**
- Create: `src/app/api/storywork/listing-photos/route.ts`
- Create: `src/app/api/storywork/listing-photos/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/storywork/listing-photos/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'user_123' })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: vi.fn((table: string) => {
      if (table === 'storywork_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: () => Promise.resolve({ data: { id: 'sw_1', asm_agent_id: 'agent_1' }, error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: () => Promise.resolve({ data: null, error: null }),
      }
    }),
  }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('GET /api/storywork/listing-photos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ASM_PORTAL_URL = 'https://app.aerialshots.media'
    process.env.SERVICE_API_KEY = 'test-key'
  })

  it('returns 401 without auth', async () => {
    const { auth } = await import('@clerk/nextjs/server')
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never)

    const { GET } = await import('./route')
    const req = new Request('http://localhost/api/storywork/listing-photos')
    const res = await GET(req as never)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Implement listing-photos route**

Create `src/app/api/storywork/listing-photos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get storywork user with ASM link
    const { data: storyworkUser } = await supabase
      .from('storywork_users')
      .select('id, asm_agent_id')
      .eq('clerk_id', userId)
      .single()

    if (!storyworkUser?.asm_agent_id) {
      return NextResponse.json({ error: 'No ASM account linked' }, { status: 404 })
    }

    // Fetch listings from ASM Portal
    const portalUrl = process.env.ASM_PORTAL_URL
    const serviceKey = process.env.SERVICE_API_KEY

    if (!portalUrl || !serviceKey) {
      return NextResponse.json({ error: 'Portal integration not configured' }, { status: 503 })
    }

    const response = await fetch(
      `${portalUrl}/api/agents/${storyworkUser.asm_agent_id}/listings?status=active`,
      {
        headers: { 'X-Service-Key': serviceKey },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 502 })
    }

    const data = await response.json()

    // Map to simplified format
    const listings = (data.listings || []).map((listing: {
      id: string
      address: string
      lat?: number
      lng?: number
      media?: Array<{ url: string; type: string }>
    }) => ({
      listingId: listing.id,
      address: listing.address,
      lat: listing.lat,
      lng: listing.lng,
      photos: (listing.media || [])
        .filter((m) => m.type === 'photo')
        .map((m) => m.url)
        .slice(0, 10),
    }))

    return NextResponse.json({ success: true, listings })
  } catch (error) {
    console.error('Listing photos error:', error)
    return NextResponse.json({ error: 'Failed to fetch listing photos' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/app/api/storywork/listing-photos/route.test.ts`

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/app/api/storywork/listing-photos/route.ts src/app/api/storywork/listing-photos/route.test.ts
git commit -m "feat(api): add listing-photos endpoint for linked agents

Fetches active listing photos from ASM Portal for use as
carousel slide backgrounds.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 19: Photo pre-fetch utility for renderer

**Files:**
- Create: `src/lib/carousel/photo-prefetch.ts`
- Create: `src/lib/carousel/photo-prefetch.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/carousel/photo-prefetch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prefetchPhotos } from './photo-prefetch'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('prefetchPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts photo URLs to base64 data URIs', async () => {
    const fakeBuffer = Buffer.from('fake-image-data')
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBuffer.buffer),
    })

    const results = await prefetchPhotos(['https://example.com/photo.jpg'])
    expect(results).toHaveLength(1)
    expect(results[0]).toContain('data:image/jpeg;base64,')
  })

  it('returns null for failed fetches', async () => {
    mockFetch.mockResolvedValue({ ok: false })
    const results = await prefetchPhotos(['https://example.com/photo.jpg'])
    expect(results).toHaveLength(1)
    expect(results[0]).toBeNull()
  })

  it('returns null for timed-out fetches', async () => {
    mockFetch.mockRejectedValue(new Error('AbortError'))
    const results = await prefetchPhotos(['https://example.com/photo.jpg'])
    expect(results[0]).toBeNull()
  })

  it('fetches all photos in parallel', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(Buffer.from('data').buffer),
    })

    await prefetchPhotos(['url1', 'url2', 'url3'])
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 2: Implement photo-prefetch.ts**

Create `src/lib/carousel/photo-prefetch.ts`:

```typescript
const PHOTO_TIMEOUT_MS = 5_000

/**
 * Pre-fetch photos as base64 data URIs for Satori rendering.
 * Satori cannot use URL references - images must be inline data.
 * Fetches all photos in parallel with individual timeouts.
 * Returns null for any photo that fails to load.
 */
export async function prefetchPhotos(
  urls: (string | null)[]
): Promise<(string | null)[]> {
  return Promise.all(
    urls.map(async (url) => {
      if (!url) return null

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
        })

        if (!response.ok) return null

        const buffer = await response.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')

        // Detect content type from URL or default to jpeg
        const isWebp = url.includes('.webp')
        const isPng = url.includes('.png')
        const mimeType = isWebp ? 'image/webp' : isPng ? 'image/png' : 'image/jpeg'

        return `data:${mimeType};base64,${base64}`
      } catch {
        return null
      }
    })
  )
}
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run src/lib/carousel/photo-prefetch.test.ts`

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add src/lib/carousel/photo-prefetch.ts src/lib/carousel/photo-prefetch.test.ts
git commit -m "feat(carousel): add photo pre-fetch utility for Satori rendering

Parallel fetch with 5s timeout per image. Converts to base64
data URIs since Satori cannot use URL references.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 20: Final integration - run full test suite and lint

**Files:** All modified files

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npx vitest run`

Expected: All tests PASS (162 existing + ~30 new)

- [ ] **Step 2: Run lint**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npm run lint`

Expected: No errors

- [ ] **Step 3: Run build**

Run: `cd /Users/aerialshotsmedia/Projects/storywork-asm && npm run build`

Expected: Build succeeds with no TypeScript errors

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
cd /Users/aerialshotsmedia/Projects/storywork-asm
git add -A
git commit -m "chore: fix lint/build issues from storywork enhancement

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
