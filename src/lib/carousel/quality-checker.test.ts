import { describe, it, expect, vi } from 'vitest'
import type { BrandKit } from './types'
import type { QualityReport } from './quality-checker'

// Mock analyzeAIScore before importing quality-checker
vi.mock('@/lib/voice/humanizer', () => ({
  analyzeAIScore: vi.fn((text: string) => ({
    score: 0.2, // Low AI score = authentic
    flags: [],
  })),
}))

import { validateCarouselQuality } from './quality-checker'
import { analyzeAIScore } from '@/lib/voice/humanizer'

const mockAnalyzeAIScore = vi.mocked(analyzeAIScore)

function makeSlide(headline: string, body: string, visual = 'photo') {
  return { headline, body, visual_suggestion: visual }
}

function makeBrandKit(overrides: Partial<BrandKit> = {}): BrandKit {
  return {
    id: 'test-kit',
    name: 'Test Brand',
    primary_color: '#FF5733',
    secondary_color: '#33FF57',
    font_family: 'Inter',
    logo_url: null,
    headshot_url: null,
    ...overrides,
  }
}

describe('validateCarouselQuality', () => {
  beforeEach(() => {
    mockAnalyzeAIScore.mockReset()
    mockAnalyzeAIScore.mockReturnValue({ score: 0.2, flags: [] })
  })

  describe('good slides score A or B', () => {
    it('scores well-crafted slides as A or B', () => {
      const slides = [
        makeSlide('Stop doing this now', 'Most agents fail here. The fix is simple.'),
        makeSlide('Here is the truth', 'You need a plan. Start with this step.'),
        makeSlide('Why it works', 'Simple homes sell fast. Clean lines win.'),
        makeSlide('Take action today', 'Call me. Let us get your home sold.'),
      ]
      const report = validateCarouselQuality(slides, makeBrandKit())
      expect(report.grade).toMatch(/^[AB]$/)
      expect(report.overallScore).toBeGreaterThanOrEqual(80)
    })
  })

  describe('bad slides score lower', () => {
    it('scores overly verbose slides poorly', () => {
      mockAnalyzeAIScore.mockReturnValue({ score: 0.8, flags: ['AI-like'] })
      const slides = [
        makeSlide(
          'This is an incredibly long headline that goes on and on and on without stopping',
          'The implementation of sophisticated methodologies necessitates comprehensive understanding of fundamental theoretical frameworks. Furthermore, the extrapolation of empirical observations demonstrates considerable variability across experimental conditions. Additionally, the systematic evaluation of paradigmatic shifts reveals unprecedented patterns of interdisciplinary convergence that merit further investigation and analysis.'
        ),
        makeSlide(
          'Another very long headline with way too many words in it for a carousel',
          'When we consider the multifaceted nature of contemporary real estate market dynamics, it becomes abundantly clear that a comprehensive and holistic approach to property marketing is absolutely essential for achieving optimal outcomes in an increasingly competitive landscape.'
        ),
      ]
      const report = validateCarouselQuality(slides, makeBrandKit())
      expect(report.grade).toMatch(/^[CDF]$/)
      expect(report.overallScore).toBeLessThan(80)
    })
  })

  describe('headline word count flagging', () => {
    it('flags headlines over 8 words', () => {
      const slides = [
        makeSlide('This headline has way more than eight words total', 'Short body.'),
        makeSlide('Short one', 'Short body.'),
      ]
      const report = validateCarouselQuality(slides, makeBrandKit())
      const flaggedSlide = report.slideFlags.find((f) => f.slideIndex === 0)
      expect(flaggedSlide).toBeDefined()
      expect(flaggedSlide!.issues.some((i) => /headline/i.test(i))).toBe(true)
    })
  })

  describe('body word count flagging', () => {
    it('flags body text over 40 words', () => {
      const longBody = Array(45).fill('word').join(' ') + '.'
      const slides = [makeSlide('Short title', longBody)]
      const report = validateCarouselQuality(slides, makeBrandKit())
      const flaggedSlide = report.slideFlags.find((f) => f.slideIndex === 0)
      expect(flaggedSlide).toBeDefined()
      expect(flaggedSlide!.issues.some((i) => /body/i.test(i))).toBe(true)
    })
  })

  describe('grade boundaries', () => {
    it('assigns correct grade for score 90-100', () => {
      // With very good slides and low AI score
      mockAnalyzeAIScore.mockReturnValue({ score: 0.0, flags: [] })
      const slides = [
        makeSlide('Stop this now', 'Most agents fail here. Fix it.'),
        makeSlide('Why it works', 'Simple homes sell fast.'),
        makeSlide('Do this today', 'Call me now. Let us go.'),
        makeSlide('Get results', 'Your home sells in days.'),
      ]
      const report = validateCarouselQuality(slides, makeBrandKit())
      // Should be A with perfect authenticity
      expect(['A', 'B']).toContain(report.grade)
    })

    it('assigns F for score below 60', () => {
      mockAnalyzeAIScore.mockReturnValue({ score: 1.0, flags: ['Very AI'] })
      const slides = [
        makeSlide(
          'This is a really really really long headline with too many words',
          Array(50).fill('complicated').join(' ') + '.'
        ),
      ]
      const report = validateCarouselQuality(
        slides,
        makeBrandKit({ primary_color: 'not-hex', font_family: '' })
      )
      expect(report.grade).toBe('F')
      expect(report.overallScore).toBeLessThan(60)
    })
  })

  describe('suggestions', () => {
    it('returns at most 3 suggestions', () => {
      mockAnalyzeAIScore.mockReturnValue({ score: 0.9, flags: ['AI'] })
      const slides = [
        makeSlide(
          'This is a super long headline that keeps going on and on forever',
          Array(50).fill('word').join(' ') + '.'
        ),
      ]
      const report = validateCarouselQuality(
        slides,
        makeBrandKit({ primary_color: 'bad', font_family: '' })
      )
      expect(report.suggestions.length).toBeLessThanOrEqual(3)
      expect(report.suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('empty slides', () => {
    it('handles empty slide array', () => {
      const report = validateCarouselQuality([], makeBrandKit())
      expect(report).toBeDefined()
      expect(report.overallScore).toBeTypeOf('number')
      expect(report.grade).toBeDefined()
      expect(report.slideFlags).toEqual([])
    })
  })

  describe('invalid brand kit', () => {
    it('penalizes invalid hex colors', () => {
      const goodReport = validateCarouselQuality(
        [makeSlide('Buy now', 'Great home for sale.')],
        makeBrandKit()
      )
      const badReport = validateCarouselQuality(
        [makeSlide('Buy now', 'Great home for sale.')],
        makeBrandKit({ primary_color: 'not-a-color', secondary_color: 'also-bad' })
      )
      expect(badReport.dimensions.brandCompliance.score).toBeLessThan(
        goodReport.dimensions.brandCompliance.score
      )
    })

    it('penalizes missing font family', () => {
      const badReport = validateCarouselQuality(
        [makeSlide('Buy now', 'Great home for sale.')],
        makeBrandKit({ font_family: '' })
      )
      expect(badReport.dimensions.brandCompliance.score).toBeLessThan(100)
    })
  })

  describe('dimensions structure', () => {
    it('returns all 5 dimensions with correct weights', () => {
      const report = validateCarouselQuality(
        [makeSlide('Test', 'Body text here.')],
        makeBrandKit()
      )
      expect(report.dimensions.readability).toBeDefined()
      expect(report.dimensions.conciseness).toBeDefined()
      expect(report.dimensions.authenticity).toBeDefined()
      expect(report.dimensions.hookStrength).toBeDefined()
      expect(report.dimensions.brandCompliance).toBeDefined()

      expect(report.dimensions.readability.weight).toBe(0.25)
      expect(report.dimensions.conciseness.weight).toBe(0.25)
      expect(report.dimensions.authenticity.weight).toBe(0.25)
      expect(report.dimensions.hookStrength.weight).toBe(0.15)
      expect(report.dimensions.brandCompliance.weight).toBe(0.10)
    })
  })

  describe('hook strength', () => {
    it('scores hooks higher when first slides are short and punchy', () => {
      const goodHooks = [
        makeSlide('Stop scrolling', 'This matters to you.'),
        makeSlide('Why?', 'Because agents miss this.'),
        makeSlide('The fix', 'Do this one thing.'),
      ]
      const badHooks = [
        makeSlide('In today\'s competitive real estate market landscape overview', 'Let me explain the situation.'),
        makeSlide('Furthermore I would like to add the following points', 'Here is more info.'),
        makeSlide('Additionally there is another thing to discuss here', 'And more.'),
      ]

      const goodReport = validateCarouselQuality(goodHooks, makeBrandKit())
      const badReport = validateCarouselQuality(badHooks, makeBrandKit())

      expect(goodReport.dimensions.hookStrength.score).toBeGreaterThan(
        badReport.dimensions.hookStrength.score
      )
    })
  })
})
