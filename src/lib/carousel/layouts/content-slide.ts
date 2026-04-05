import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'

export function createContentSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height, background } = props
  const pad = scalePadding(60, width)
  const isVertical = height > width

  const backgroundElements = createBackgroundElements(
    brandKit.primary_color,
    width,
    height,
    background
  )

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
              alignItems: isVertical ? 'center' : 'flex-start',
              justifyContent: isVertical ? 'center' : 'flex-start',
              width: '100%',
              height: '100%',
              padding: `${pad}px`,
              paddingTop: `${pad + 20}px`,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${scaleFontSize(48, height)}px`,
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.2,
                    marginBottom: '20px',
                    textAlign: 'left',
                  },
                  children: slide.headline,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${scaleFontSize(24, height)}px`,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.6,
                    textAlign: 'left',
                  },
                  children: slide.body,
                },
              },
            ],
          },
        },
        // Brand name footer
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '20px',
              left: `${pad}px`,
              fontSize: `${scaleFontSize(14, height)}px`,
              color: 'rgba(255,255,255,0.5)',
            },
            children: brandKit.name,
          },
        },
      ],
    },
  }
}
