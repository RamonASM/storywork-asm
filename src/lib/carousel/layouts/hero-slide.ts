import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'

export function createHeroSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height, background } = props
  const pad = scalePadding(60, width)

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
        // Accent bar at top
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              backgroundColor: brandKit.secondary_color,
            },
          },
        },
        // Content container
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
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${scaleFontSize(64, height)}px`,
                    fontWeight: 800,
                    color: '#ffffff',
                    lineHeight: 1.1,
                    marginBottom: '20px',
                  },
                  children: slide.headline,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${scaleFontSize(20, height)}px`,
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.5,
                  },
                  children: slide.body,
                },
              },
            ],
          },
        },
      ],
    },
  }
}
