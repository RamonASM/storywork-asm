import type { LayoutProps, SatoriElement } from './types'
import { scaleFontSize, scalePadding } from './types'

export function createCtaSlide(props: LayoutProps): SatoriElement {
  const { slide, brandKit, width, height } = props
  const pad = scalePadding(60, width)

  const contentChildren: (SatoriElement | string)[] = []

  // Headshot placeholder
  if (brandKit.headshot_url) {
    contentChildren.push({
      type: 'div',
      props: {
        style: {
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)',
          marginBottom: '24px',
        },
      },
    })
  }

  contentChildren.push(
    {
      type: 'div',
      props: {
        style: {
          fontSize: `${scaleFontSize(48, height)}px`,
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.2,
          marginBottom: '16px',
          textAlign: 'center',
        },
        children: slide.headline,
      },
    },
    {
      type: 'div',
      props: {
        style: {
          fontSize: `${scaleFontSize(22, height)}px`,
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.5,
          marginBottom: '24px',
          textAlign: 'center',
        },
        children: slide.body,
      },
    },
    {
      type: 'div',
      props: {
        style: {
          fontSize: `${scaleFontSize(20, height)}px`,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
        },
        children: brandKit.name,
      },
    }
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
        // Background using secondary_color
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
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
            },
            children: contentChildren,
          },
        },
      ],
    },
  }
}
