import { describe, it, expect } from 'vitest'
import { createBackgroundElements } from './background'

describe('createBackgroundElements', () => {
  it('returns a solid background by default', () => {
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080)

    expect(elements).toHaveLength(1)
    expect(elements[0].type).toBe('div')
    expect(elements[0].props.style).toMatchObject({
      position: 'absolute',
      backgroundColor: '#1a1a2e',
    })
  })

  it('returns a gradient background with direction', () => {
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080, {
      type: 'gradient',
      gradientDirection: 'to-bottom-right',
      gradientEndColor: '#16213e',
    })

    expect(elements).toHaveLength(1)
    expect(elements[0].type).toBe('div')
    expect(elements[0].props.style).toMatchObject({
      position: 'absolute',
      backgroundImage: 'linear-gradient(to bottom right, #1a1a2e, #16213e)',
    })
  })

  it('returns 2 elements for photo background (img + overlay)', () => {
    const base64 = 'data:image/png;base64,iVBORw0KGgo='
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080, {
      type: 'photo',
      imageData: base64,
      overlayOpacity: 0.6,
    })

    expect(elements).toHaveLength(2)
    expect(elements[0].type).toBe('img')
    expect(elements[0].props.src).toBe(base64)
    expect(elements[1].type).toBe('div')
    expect(elements[1].props.style).toMatchObject({
      backgroundColor: 'rgba(0,0,0,0.6)',
    })
  })

  it('falls back to solid when photo imageData is null', () => {
    const elements = createBackgroundElements('#1a1a2e', 1080, 1080, {
      type: 'photo',
      imageData: null,
      overlayOpacity: 0.5,
    })

    expect(elements).toHaveLength(1)
    expect(elements[0].type).toBe('div')
    expect(elements[0].props.style).toMatchObject({
      backgroundColor: '#1a1a2e',
    })
  })
})
