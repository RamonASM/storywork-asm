// Carousel export format types
export type CarouselFormat = 'instagram-feed' | 'instagram-story' | 'linkedin'

export interface FormatConfig {
  name: string
  width: number
  height: number
  aspectRatio: string
}

// Layout and background types
export type LayoutType = 'hero' | 'data_card' | 'content' | 'cta'
export type SuggestedFormat = 'bold_statement' | 'question' | 'data_point' | 'quote' | 'cta'
export type BackgroundStyle = 'solid' | 'gradient' | 'photo'

export interface SlideBackground {
  type: BackgroundStyle
  gradientDirection?: 'to-bottom' | 'to-right' | 'to-bottom-right'
  gradientEndColor?: string
  imageData?: string | null
  overlayOpacity?: number
}

// Slide content from generated carousel
export interface SlideContent {
  headline: string
  body: string
  visual_suggestion: string
  slideNumber: number
  totalSlides: number
  suggestedFormat?: SuggestedFormat
  background?: SlideBackground
}

// Brand kit configuration
export interface BrandKit {
  id: string
  name: string
  primary_color: string
  secondary_color: string
  font_family: string
  logo_url: string | null
  headshot_url: string | null
  background_style?: BackgroundStyle
  gradient_end_color?: string | null
  gradient_direction?: string
}

// Render request payload
export interface RenderRequest {
  slide: SlideContent
  brandKit: BrandKit
  format: CarouselFormat
  agentName?: string
}

// Export request payload (for ZIP)
export interface ExportRequest {
  storyId: string
  storyTitle: string
  slides: SlideContent[]
  brandKit: BrandKit
  format: CarouselFormat
  agentName?: string
}

// Parsed generated content from story
export interface GeneratedContent {
  slides: Array<{
    headline: string
    body: string
    visual_suggestion: string
  }>
  hashtags: string[]
  caption: string
  /** Voice-specific metadata (only present for voice-derived stories) */
  voice_metadata?: {
    source_type: 'voice'
    detected_story_type: string
    extracted_elements: {
      summary: string
      emotional_beats: string[]
      authentic_phrases: string[]
    }
    source_phrases: string[]
  }
}

/** Source type for story input */
export type StorySourceType = 'text' | 'voice'
