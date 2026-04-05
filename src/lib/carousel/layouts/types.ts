import type { SlideContent, BrandKit, SlideBackground } from '../types'

export interface LayoutProps {
  slide: SlideContent
  brandKit: BrandKit
  width: number
  height: number
  background?: SlideBackground
}

export type SatoriChildren = SatoriElement | SatoriElement[] | string | (SatoriElement | string)[] | null | undefined

export type SatoriElement = {
  type: string
  props: {
    style?: Record<string, unknown>
    children?: SatoriChildren
    src?: string
    [key: string]: unknown
  }
}

export function scaleFontSize(basePx: number, height: number): number {
  const factor = Math.min(1, height / 1080)
  return Math.round(basePx * factor)
}

export function scalePadding(basePx: number, width: number): number {
  const factor = Math.min(1, width / 1080)
  return Math.round(basePx * factor)
}
