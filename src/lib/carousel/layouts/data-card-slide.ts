import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'

function extractNumber(text: string): { number: string; label: string } | null {
  const match = text.match(/(\d[\d,.%/]*)/)
  if (!match) return null
  const number = match[1]
  const label = text.replace(number, '').trim()
  return { number, label: label || text }
}

export function createDataCardSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height, background } = props
  const pad = scalePadding(60, width)
  const extracted = extractNumber(slide.headline)

  const backgroundElements = createBackgroundElements(
    brandKit.primary_color,
    width,
    height,
    background
  )

  const contentChildren: (SatoriElement | string)[] = []

  if (extracted) {
    contentChildren.push(
      {
        type: 'div',
        props: {
          style: {
            fontSize: `${scaleFontSize(72, height)}px`,
            fontWeight: 900,
            color: brandKit.secondary_color,
            lineHeight: 1.0,
            marginBottom: '12px',
          },
          children: extracted.number,
        },
      },
      {
        type: 'div',
        props: {
          style: {
            fontSize: `${scaleFontSize(18, height)}px`,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '24px',
          },
          children: extracted.label,
        },
      }
    )
  } else {
    contentChildren.push({
      type: 'div',
      props: {
        style: {
          fontSize: `${scaleFontSize(18, height)}px`,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.9)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginBottom: '24px',
        },
        children: slide.headline,
      },
    })
  }

  contentChildren.push({
    type: 'div',
    props: {
      style: {
        fontSize: `${scaleFontSize(24, height)}px`,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.5,
      },
      children: slide.body,
    },
  })

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
        // Slide badge
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
              textAlign: 'center',
            },
            children: contentChildren,
          },
        },
      ],
    },
  }
}
