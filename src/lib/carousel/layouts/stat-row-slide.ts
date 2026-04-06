import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'
import { createContentSlide } from './content-slide'

interface ParsedStat {
  number: string
  label: string
}

/**
 * Parse stats from body text. Splits on `|` or newlines, then extracts
 * a leading number and trailing label from each segment.
 */
export function parseStats(body: string): ParsedStat[] {
  const segments = body
    .split(/[|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const stats: ParsedStat[] = []
  const pattern = /^(\d[\d,.%/]*)\s+(.+)$/

  for (const segment of segments) {
    const match = segment.match(pattern)
    if (match) {
      stats.push({ number: match[1], label: match[2] })
    }
  }

  return stats
}

export function createStatRowSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height, background } = props
  const pad = scalePadding(60, width)

  const stats = parseStats(slide.body)

  // Fall back to content layout when body isn't parseable as stats
  if (stats.length === 0) {
    return createContentSlide(props)
  }

  const backgroundElements = createBackgroundElements(
    brandKit.primary_color,
    width,
    height,
    background
  )

  const statCards: SatoriElement[] = stats.slice(0, 4).map((stat) => ({
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        padding: '12px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              fontSize: `${scaleFontSize(48, height)}px`,
              fontWeight: 900,
              color: brandKit.secondary_color,
              lineHeight: 1.1,
              marginBottom: '8px',
            },
            children: stat.number,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: `${scaleFontSize(14, height)}px`,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.3,
            },
            children: stat.label,
          },
        },
      ],
    },
  }))

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
      },
      children: [
        ...backgroundElements,
        // Slide badge top-right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '20px',
              right: '20px',
              fontSize: `${scaleFontSize(14, height)}px`,
              color: 'rgba(255,255,255,0.6)',
              zIndex: 1,
            },
            children: `${slide.slideNumber}/${slide.totalSlides}`,
          },
        },
        // Content
        {
          type: 'div',
          props: {
            style: {
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              padding: `${pad}px`,
            },
            children: [
              // Section title (headline)
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${scaleFontSize(30, height)}px`,
                    fontWeight: 700,
                    color: '#ffffff',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    marginBottom: '40px',
                    textAlign: 'center',
                  },
                  children: slide.headline,
                },
              },
              // Stat row
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    width: '100%',
                    gap: '16px',
                  },
                  children: statCards,
                },
              },
            ],
          },
        },
      ],
    },
  }
}
