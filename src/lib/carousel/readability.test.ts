import { describe, it, expect } from 'vitest'
import { countSyllables, fleschKincaidGradeLevel, readabilityScore } from './readability'

describe('countSyllables', () => {
  it('counts simple one-syllable words', () => {
    expect(countSyllables('cat')).toBe(1)
    expect(countSyllables('dog')).toBe(1)
    expect(countSyllables('run')).toBe(1)
  })

  it('counts multi-syllable words', () => {
    expect(countSyllables('hello')).toBe(2)
    expect(countSyllables('banana')).toBe(3)
    expect(countSyllables('beautiful')).toBe(3)
  })

  it('handles silent-e adjustment', () => {
    // "make" has silent e - should be 1 syllable, not 2
    expect(countSyllables('make')).toBe(1)
    expect(countSyllables('home')).toBe(1)
    expect(countSyllables('scale')).toBe(1)
  })

  it('returns minimum of 1 for any word', () => {
    expect(countSyllables('a')).toBe(1)
    expect(countSyllables('I')).toBe(1)
    expect(countSyllables('rhythm')).toBeGreaterThanOrEqual(1)
  })

  it('handles empty string', () => {
    expect(countSyllables('')).toBe(1)
  })

  it('is case insensitive', () => {
    expect(countSyllables('Hello')).toBe(countSyllables('hello'))
    expect(countSyllables('BANANA')).toBe(countSyllables('banana'))
  })
})

describe('fleschKincaidGradeLevel', () => {
  it('returns a low grade level for simple text', () => {
    const simpleText = 'The cat sat on the mat. The dog ran fast. I like pie.'
    const grade = fleschKincaidGradeLevel(simpleText)
    // Simple short sentences with simple words should be low grade
    expect(grade).toBeLessThan(6)
  })

  it('returns a higher grade level for complex text', () => {
    const complexText =
      'The implementation of sophisticated methodologies necessitates comprehensive understanding of fundamental theoretical frameworks. Furthermore, the extrapolation of empirical observations demonstrates considerable variability across experimental conditions.'
    const grade = fleschKincaidGradeLevel(complexText)
    expect(grade).toBeGreaterThan(10)
  })

  it('handles empty string gracefully', () => {
    const grade = fleschKincaidGradeLevel('')
    expect(grade).toBe(0)
  })

  it('handles single sentence text', () => {
    const text = 'I like dogs.'
    const grade = fleschKincaidGradeLevel(text)
    expect(grade).toBeTypeOf('number')
    expect(Number.isFinite(grade)).toBe(true)
  })

  it('handles text without punctuation as single sentence', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    const grade = fleschKincaidGradeLevel(text)
    expect(grade).toBeTypeOf('number')
    expect(Number.isFinite(grade)).toBe(true)
  })
})

describe('readabilityScore', () => {
  it('returns 100 for grade level 6', () => {
    expect(readabilityScore(6)).toBe(100)
  })

  it('returns 0 for grade level 12', () => {
    expect(readabilityScore(12)).toBe(0)
  })

  it('returns 50 for grade level 9', () => {
    expect(readabilityScore(9)).toBeCloseTo(50, 0)
  })

  it('clamps to 100 for grade levels below 6', () => {
    expect(readabilityScore(3)).toBe(100)
    expect(readabilityScore(0)).toBe(100)
  })

  it('clamps to 0 for grade levels above 12', () => {
    expect(readabilityScore(15)).toBe(0)
    expect(readabilityScore(20)).toBe(0)
  })

  it('returns intermediate scores linearly', () => {
    const score8 = readabilityScore(8)
    const score10 = readabilityScore(10)
    // Grade 8 should score higher than grade 10
    expect(score8).toBeGreaterThan(score10)
    // Grade 8 = (12-8)/(12-6) * 100 = 66.67
    expect(score8).toBeCloseTo(66.67, 0)
    // Grade 10 = (12-10)/(12-6) * 100 = 33.33
    expect(score10).toBeCloseTo(33.33, 0)
  })
})
