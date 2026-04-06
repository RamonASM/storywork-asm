import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'
import { createBackgroundElements } from './background'

export function createQuoteCardSlide(props: LayoutProps): SatoriElement {
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
        // Large opening quotation mark
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: `${pad}px`,
              left: `${pad}px`,
              fontSize: `${scaleFontSize(120, height)}px`,
              fontWeight: 900,
              color: brandKit.secondary_color,
              lineHeight: 1,
              opacity: 0.8,
              zIndex: 1,
            },
            children: '\u201C',
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
              paddingTop: `${pad + 40}px`,
            },
            children: [
              // Quote text (headline)
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${scaleFontSize(38, height)}px`,
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: '#ffffff',
                    lineHeight: 1.4,
                    textAlign: 'center',
                    marginBottom: '32px',
                  },
                  children: slide.headline,
                },
              },
              // Horizontal divider
              {
                type: 'div',
                props: {
                  style: {
                    width: '40px',
                    height: '2px',
                    backgroundColor: 'rgba(255,255,255,0.4)',
                    marginBottom: '16px',
                  },
                },
              },
              // Attribution (body)
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: `${scaleFontSize(19, height)}px`,
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.4,
                    textAlign: 'center',
                  },
                  children: slide.body,
                },
              },
            ],
          },
        },
        // Brand name bottom-right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: '20px',
              right: `${pad}px`,
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
