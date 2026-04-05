import { describe, it, expect } from 'vitest'
import { analyzeAIScore } from './humanizer'

describe('analyzeAIScore', () => {
  it('returns consistent results when called multiple times on different texts', () => {
    const text1 = 'It is worth noting that this home boasts stunning views.'
    const text2 = 'Furthermore, the property is nestled in a quiet neighborhood.'

    const result1a = analyzeAIScore(text1)
    const result2 = analyzeAIScore(text2)
    const result1b = analyzeAIScore(text1)

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
