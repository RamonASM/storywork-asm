import satori from 'satori'
import type React from 'react'
import sharp from 'sharp'
import { loadBrandKitFonts } from './fonts'
import { FORMATS } from './formats'
import type { SlideContent, BrandKit, CarouselFormat } from './types'
import { sanitizeSlideContent, sanitizeHexColor, sanitizeUrl } from '@/lib/utils/sanitize'
import { createHeroSlide } from './layouts/hero-slide'
import { createDataCardSlide } from './layouts/data-card-slide'
import { createContentSlide } from './layouts/content-slide'
import { createCtaSlide } from './layouts/cta-slide'
import { createQuoteCardSlide } from './layouts/quote-card-slide'
import { createStatRowSlide } from './layouts/stat-row-slide'
import type { LayoutProps } from './layouts/types'
import type { SuggestedFormat, LayoutType } from './types'

/**
 * Render a single carousel slide to PNG buffer.
 * Content is sanitized before rendering to prevent XSS.
 *
 * @param slide - The slide content to render
 * @param brandKit - Brand customization settings
 * @param format - Output format (instagram-feed, instagram-story, linkedin)
 * @returns PNG image as a Buffer
 */
export async function renderSlideToImage(
  slide: SlideContent,
  brandKit: BrandKit,
  format: CarouselFormat
): Promise<Buffer> {
  const config = FORMATS[format]
  const fonts = await loadBrandKitFonts(brandKit.font_family)

  // Sanitize content before rendering
  const safeSlide = sanitizeSlideContent(slide)
  const safeBrandKit = {
    ...brandKit,
    primary_color: sanitizeHexColor(brandKit.primary_color, '#1a1a1a'),
    secondary_color: sanitizeHexColor(brandKit.secondary_color, '#ffffff'),
    logo_url: sanitizeUrl(brandKit.logo_url),
    headshot_url: sanitizeUrl(brandKit.headshot_url),
  }

  // Create the slide element for Satori
  const element = createSlideElement(safeSlide, safeBrandKit, config.width, config.height)

  // Render to SVG using Satori
  // Note: Satori accepts plain objects, not React elements
  const svg = await satori(element as React.ReactNode, {
    width: config.width,
    height: config.height,
    fonts,
  })

  // Convert SVG to PNG using Sharp
  const png = await sharp(Buffer.from(svg))
    .png({ quality: 100 })
    .toBuffer()

  return png
}

/**
 * Map suggestedFormat to layout type.
 */
function selectLayout(slide: SlideContent): LayoutType {
  if (slide.suggestedFormat) {
    switch (slide.suggestedFormat) {
      case 'bold_statement': return 'hero'
      case 'data_point': return 'data_card'
      case 'cta': return 'cta'
      case 'quote': return 'quote_card'
      case 'stat_row': return 'stat_row'
      case 'question':
      default: return 'content'
    }
  }

  // Position-based fallback for legacy content
  if (slide.slideNumber === 1) return 'hero'
  if (slide.slideNumber === slide.totalSlides) return 'cta'
  return 'content'
}

/**
 * Create the Satori element structure using the appropriate layout.
 */
function createSlideElement(
  slide: SlideContent,
  brandKit: BrandKit,
  width: number,
  height: number
) {
  const layoutType = selectLayout(slide)
  const props: LayoutProps = { slide, brandKit, width, height, background: slide.background }

  switch (layoutType) {
    case 'hero': return createHeroSlide(props)
    case 'data_card': return createDataCardSlide(props)
    case 'cta': return createCtaSlide(props)
    case 'quote_card': return createQuoteCardSlide(props)
    case 'stat_row': return createStatRowSlide(props)
    case 'content':
    default: return createContentSlide(props)
  }
}

/**
 * Render multiple slides and return as array of buffers
 */
export async function renderAllSlides(
  slides: SlideContent[],
  brandKit: BrandKit,
  format: CarouselFormat
): Promise<Buffer[]> {
  const buffers: Buffer[] = []

  for (const slide of slides) {
    const buffer = await renderSlideToImage(slide, brandKit, format)
    buffers.push(buffer)
  }

  return buffers
}

/**
 * Get a data URL for preview (useful for client-side display)
 */
export async function renderSlideToDataUrl(
  slide: SlideContent,
  brandKit: BrandKit,
  format: CarouselFormat
): Promise<string> {
  const buffer = await renderSlideToImage(slide, brandKit, format)
  const base64 = buffer.toString('base64')
  return `data:image/png;base64,${base64}`
}
