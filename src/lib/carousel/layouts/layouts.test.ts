import { describe, it, expect } from 'vitest'
import { createHeroSlide } from './hero-slide'
import { createDataCardSlide } from './data-card-slide'
import { createContentSlide } from './content-slide'
import { createCtaSlide } from './cta-slide'
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
