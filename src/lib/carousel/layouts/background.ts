import type { SlideBackground } from '../types'
import type { SatoriElement } from './types'

const GRADIENT_DIRECTIONS: Record<string, string> = {
  'to-bottom': 'to bottom',
  'to-right': 'to right',
  'to-bottom-right': 'to bottom right',
}

export function createBackgroundElements(
  primaryColor: string,
  width: number,
  height: number,
  background?: SlideBackground
): SatoriElement[] {
  const baseStyle = {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  }

  const type = background?.type ?? 'solid'

  if (type === 'gradient' && background) {
    const direction = background.gradientDirection
      ? GRADIENT_DIRECTIONS[background.gradientDirection] ?? 'to bottom'
      : 'to bottom'
    const endColor = background.gradientEndColor ?? '#000000'

    return [
      {
        type: 'div',
        props: {
          style: {
            ...baseStyle,
            backgroundImage: `linear-gradient(${direction}, ${primaryColor}, ${endColor})`,
          },
        },
      },
    ]
  }

  if (type === 'photo' && background?.imageData) {
    const overlayOpacity = background.overlayOpacity ?? 0.5

    return [
      {
        type: 'img',
        props: {
          src: background.imageData,
          style: {
            ...baseStyle,
            objectFit: 'cover',
          },
        },
      },
      {
        type: 'div',
        props: {
          style: {
            ...baseStyle,
            backgroundColor: `rgba(0,0,0,${overlayOpacity})`,
          },
        },
      },
    ]
  }

  // Solid (default) or photo fallback when imageData is null
  return [
    {
      type: 'div',
      props: {
        style: {
          ...baseStyle,
          backgroundColor: primaryColor,
        },
      },
    },
  ]
}
