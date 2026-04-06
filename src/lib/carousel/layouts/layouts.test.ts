import { describe, it, expect } from 'vitest'
import { createHeroSlide } from './hero-slide'
import { createDataCardSlide } from './data-card-slide'
import { createContentSlide } from './content-slide'
import { createCtaSlide } from './cta-slide'
import { createQuoteCardSlide } from './quote-card-slide'
import { createStatRowSlide } from './stat-row-slide'
import { parseStats } from './stat-row-slide'
import type { LayoutProps } from './types'

function makeProps(overrides?: Partial<LayoutProps>): LayoutProps {
  return {
    slide: {
      headline: '85% of agents miss this',
      body: 'Learn the one strategy that top agents use to close more deals.',
      visual_suggestion: 'Chart showing growth',
      slideNumber: 2,
      totalSlides: 5,
    },
    brandKit: {
      id: 'bk-1',
      name: 'Test Agent',
      primary_color: '#1a1a2e',
      secondary_color: '#e94560',
      font_family: 'Inter',
      logo_url: null,
      headshot_url: null,
    },
    width: 1080,
    height: 1080,
    ...overrides,
  }
}

function findChildrenDeep(element: unknown, predicate: (el: unknown) => boolean): unknown[] {
  const results: unknown[] = []
  if (!element || typeof element !== 'object') return results
  const el = element as Record<string, unknown>
  if (predicate(el)) results.push(el)
  const props = el.props as Record<string, unknown> | undefined
  if (props?.children) {
    const children = Array.isArray(props.children) ? props.children : [props.children]
    for (const child of children) {
      results.push(...findChildrenDeep(child, predicate))
    }
  }
  return results
}

describe('createHeroSlide', () => {
  it('returns a valid SatoriElement', () => {
    const result = createHeroSlide(makeProps())

    expect(result.type).toBe('div')
    expect(result.props.style).toBeDefined()
  })

  it('has no slide badge', () => {
    const result = createHeroSlide(makeProps())

    const badges = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return typeof props?.children === 'string' && /^\d+\/\d+$/.test(props.children as string)
    })

    expect(badges).toHaveLength(0)
  })
})

describe('createDataCardSlide', () => {
  it('returns a valid SatoriElement', () => {
    const result = createDataCardSlide(makeProps())

    expect(result.type).toBe('div')
    expect(result.props.style).toBeDefined()
  })

  it('extracts number from headline', () => {
    const result = createDataCardSlide(makeProps())

    const numberEls = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return props?.children === '85%'
    })

    expect(numberEls.length).toBeGreaterThan(0)
  })
})

describe('createContentSlide', () => {
  it('returns a valid SatoriElement', () => {
    const result = createContentSlide(makeProps())

    expect(result.type).toBe('div')
    expect(result.props.style).toBeDefined()
  })

  it('has a slide badge with N/M format', () => {
    const result = createContentSlide(makeProps())

    const badges = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return props?.children === '2/5'
    })

    expect(badges.length).toBeGreaterThan(0)
  })
})

describe('createCtaSlide', () => {
  it('returns a valid SatoriElement', () => {
    const result = createCtaSlide(makeProps())

    expect(result.type).toBe('div')
    expect(result.props.style).toBeDefined()
  })

  it('uses secondary_color as background', () => {
    const result = createCtaSlide(makeProps())

    const bgEls = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      const style = props?.style as Record<string, unknown> | undefined
      return style?.backgroundColor === '#e94560'
    })

    expect(bgEls.length).toBeGreaterThan(0)
  })

  it('contains agent name', () => {
    const result = createCtaSlide(makeProps())

    const nameEls = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return props?.children === 'Test Agent'
    })

    expect(nameEls.length).toBeGreaterThan(0)
  })
})

describe('createQuoteCardSlide', () => {
  it('returns a valid SatoriElement', () => {
    const result = createQuoteCardSlide(makeProps())

    expect(result.type).toBe('div')
    expect(result.props.style).toBeDefined()
  })

  it('contains an opening quotation mark', () => {
    const result = createQuoteCardSlide(makeProps())

    const quoteMarks = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return props?.children === '\u201C'
    })

    expect(quoteMarks.length).toBeGreaterThan(0)
  })

  it('has a slide badge with N/M format', () => {
    const result = createQuoteCardSlide(makeProps())

    const badges = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return props?.children === '2/5'
    })

    expect(badges.length).toBeGreaterThan(0)
  })

  it('uses secondary_color for the quotation mark', () => {
    const result = createQuoteCardSlide(makeProps())

    const accentEls = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      const style = props?.style as Record<string, unknown> | undefined
      return props?.children === '\u201C' && style?.color === '#e94560'
    })

    expect(accentEls.length).toBeGreaterThan(0)
  })

  it('contains agent name', () => {
    const result = createQuoteCardSlide(makeProps())

    const nameEls = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return props?.children === 'Test Agent'
    })

    expect(nameEls.length).toBeGreaterThan(0)
  })
})

describe('parseStats', () => {
  it('parses pipe-delimited stats', () => {
    const result = parseStats('82 Dining Score | 95 Walk Score | 4.5 Avg Rating')
    expect(result).toEqual([
      { number: '82', label: 'Dining Score' },
      { number: '95', label: 'Walk Score' },
      { number: '4.5', label: 'Avg Rating' },
    ])
  })

  it('parses newline-delimited stats', () => {
    const result = parseStats('10% Growth\n500 Homes Sold')
    expect(result).toEqual([
      { number: '10%', label: 'Growth' },
      { number: '500', label: 'Homes Sold' },
    ])
  })

  it('handles commas and percentages', () => {
    const result = parseStats('3,200 Square Feet | 99.5% Satisfaction')
    expect(result).toEqual([
      { number: '3,200', label: 'Square Feet' },
      { number: '99.5%', label: 'Satisfaction' },
    ])
  })

  it('returns empty array for unparseable text', () => {
    const result = parseStats('Just regular text without leading numbers')
    expect(result).toEqual([])
  })
})

describe('createStatRowSlide', () => {
  it('returns a valid SatoriElement with parsed stats', () => {
    const result = createStatRowSlide(
      makeProps({
        slide: {
          headline: 'Key Metrics',
          body: '82 Dining Score | 95 Walk Score | 4.5 Avg Rating',
          visual_suggestion: 'stats',
          slideNumber: 2,
          totalSlides: 5,
        },
      })
    )

    expect(result.type).toBe('div')
    const serialized = JSON.stringify(result)
    expect(serialized).toContain('82')
    expect(serialized).toContain('Dining Score')
  })

  it('has a slide badge with N/M format', () => {
    const result = createStatRowSlide(
      makeProps({
        slide: {
          headline: 'Stats',
          body: '10 Alpha | 20 Beta',
          visual_suggestion: 'stats',
          slideNumber: 2,
          totalSlides: 5,
        },
      })
    )

    const badges = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      return props?.children === '2/5'
    })

    expect(badges.length).toBeGreaterThan(0)
  })

  it('falls back to content layout with unparseable body', () => {
    const result = createStatRowSlide(makeProps({
      slide: {
        headline: 'Fallback test',
        body: 'No numbers here at all',
        visual_suggestion: 'photo',
        slideNumber: 2,
        totalSlides: 5,
      },
    }))

    // Should still return a valid element (content slide fallback)
    expect(result.type).toBe('div')
    const serialized = JSON.stringify(result)
    expect(serialized).toContain('Fallback test')
  })

  it('limits display to 4 stat cards maximum', () => {
    const result = createStatRowSlide(
      makeProps({
        slide: {
          headline: 'Many Stats',
          body: '1 Alpha | 2 Beta | 3 Gamma | 4 Delta | 5 Epsilon | 6 Zeta',
          visual_suggestion: 'stats',
          slideNumber: 2,
          totalSlides: 5,
        },
      })
    )

    // Stats use secondary_color for numbers; count those elements
    const statNumberEls = findChildrenDeep(result, (el) => {
      const e = el as Record<string, unknown>
      const props = e.props as Record<string, unknown> | undefined
      const style = props?.style as Record<string, unknown> | undefined
      return style?.color === '#e94560' && style?.fontWeight === 900
    })

    expect(statNumberEls).toHaveLength(4)
  })
})
