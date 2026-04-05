'use client'

import { useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FormatSelector } from './FormatSelector'
import { ExportButton } from './ExportButton'
import { QualityScore } from './QualityScore'
import { QualityDetails } from './QualityDetails'
import { FORMATS } from '@/lib/carousel/formats'
import type { CarouselFormat, BrandKit, GeneratedContent } from '@/lib/carousel/types'
import type { QualityReport } from '@/lib/carousel/quality-checker'

interface CarouselPreviewProps {
  content: GeneratedContent
  brandKit: BrandKit
  storyId: string
  storyTitle: string
  qualityReport?: QualityReport
  onRegenerateSlide?: (slideIndex: number) => void
  regeneratingSlide?: number | null
}

export function CarouselPreview({
  content,
  brandKit,
  storyId,
  storyTitle,
  qualityReport,
  onRegenerateSlide,
  regeneratingSlide,
}: CarouselPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [format, setFormat] = useState<CarouselFormat>('instagram-feed')

  const slides = content.slides.map((slide, index) => ({
    ...slide,
    slideNumber: index + 1,
    totalSlides: content.slides.length,
  }))

  const formatConfig = FORMATS[format]
  const aspectRatio = formatConfig.width / formatConfig.height

  // Debounce navigation to prevent rapid clicking
  const lastNavigationTime = useRef<number>(0)
  const DEBOUNCE_MS = 150

  const goToSlide = useCallback((index: number) => {
    const now = Date.now()
    if (now - lastNavigationTime.current < DEBOUNCE_MS) {
      return // Ignore rapid clicks
    }
    lastNavigationTime.current = now

    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index)
    }
  }, [slides.length])

  const currentSlideData = slides[currentSlide]

  return (
    <div className="space-y-6">
      {/* Header with format selector, quality score, and export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FormatSelector value={format} onChange={setFormat} />
        {qualityReport && (
          <QualityScore score={qualityReport.overallScore} grade={qualityReport.grade} />
        )}
        <ExportButton
          slides={slides}
          brandKit={brandKit}
          format={format}
          storyId={storyId}
          storyTitle={storyTitle}
        />
      </div>

      {/* Preview area */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main preview */}
        <div className="flex-1">
          <div
            className="relative mx-auto overflow-hidden rounded-xl shadow-2xl"
            style={{
              aspectRatio,
              maxWidth: format === 'instagram-story' ? '400px' : '500px',
            }}
          >
            {/* Slide preview */}
            <div
              className="absolute inset-0 flex flex-col p-8"
              style={{
                backgroundColor: brandKit.primary_color,
                fontFamily: brandKit.font_family,
              }}
            >
              {/* Slide number badge */}
              <div
                className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: brandKit.secondary_color }}
              >
                {currentSlideData.slideNumber}/{currentSlideData.totalSlides}
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col justify-center pr-12">
                <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight mb-4">
                  {currentSlideData.headline}
                </h2>
                <p className="text-base lg:text-lg text-white/90 leading-relaxed">
                  {currentSlideData.body}
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-end text-sm text-white/50">
                <span className="truncate max-w-[60%]">
                  Visual: {currentSlideData.visual_suggestion.substring(0, 40)}...
                </span>
                {brandKit.name && (
                  <span className="font-semibold text-white">{brandKit.name}</span>
                )}
              </div>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={() => goToSlide(currentSlide - 1)}
              disabled={currentSlide === 0}
              aria-label="Previous slide"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => goToSlide(currentSlide + 1)}
              disabled={currentSlide === slides.length - 1}
              aria-label="Next slide"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Slide indicators */}
          <div className="flex justify-center gap-2 mt-4" role="tablist" aria-label="Slide navigation">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                role="tab"
                aria-selected={index === currentSlide}
                aria-label={`Go to slide ${index + 1}`}
                className={`
                  w-2.5 h-2.5 rounded-full transition-colors
                  ${index === currentSlide ? 'bg-orange-500' : 'bg-neutral-600 hover:bg-neutral-500'}
                `}
              />
            ))}
          </div>
        </div>

        {/* Slide list sidebar */}
        <div className="w-full lg:w-64 space-y-3">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wide">
            All Slides
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {slides.map((slide, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`
                  w-full text-left p-3 rounded-lg transition-colors
                  ${index === currentSlide
                    ? 'bg-orange-500/20 border border-orange-500'
                    : 'bg-neutral-800 hover:bg-neutral-700 border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: brandKit.primary_color }}
                  >
                    {slide.slideNumber}
                  </span>
                  <span className="text-sm font-medium text-white truncate">
                    {slide.headline.substring(0, 25)}...
                  </span>
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2">
                  {slide.body.substring(0, 60)}...
                </p>
                <div className="mt-2">
                  <ExportButton
                    slides={slides}
                    brandKit={brandKit}
                    format={format}
                    storyId={storyId}
                    storyTitle={storyTitle}
                    variant="single"
                    slideIndex={index}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Caption and hashtags */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-neutral-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-neutral-400 mb-2">Caption</h3>
          <p className="text-neutral-200 text-sm whitespace-pre-wrap">{content.caption}</p>
        </div>
        <div className="bg-neutral-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-neutral-400 mb-2">Hashtags</h3>
          <p className="text-neutral-200 text-sm">{content.hashtags.join(' ')}</p>
        </div>
      </div>

      {/* Quality details panel */}
      {qualityReport && (
        <QualityDetails
          report={qualityReport}
          onRegenerateSlide={onRegenerateSlide}
          regenerating={regeneratingSlide}
        />
      )}
    </div>
  )
}
