'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { storyTypes } from '@/lib/storywork/prompts'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Mic,
  Quote,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CarouselPreview } from '@/components/carousel'
import { toast } from 'sonner'
import type { BrandKit, GeneratedContent } from '@/lib/carousel/types'
import type { QualityReport } from '@/lib/carousel/quality-checker'
import { validateCarouselQuality } from '@/lib/carousel/quality-checker'
import { BRAND_COLORS } from '@/lib/theme/colors'

interface Story {
  id: string
  user_id: string
  title: string
  story_type: string
  raw_input: string
  answers: Record<string, string>
  generated_content: GeneratedContent | null
  status: string
  created_at: string
  source_type?: 'text' | 'voice'
}

export default function StoryDetailPage({ params }: { params: Promise<{ storyId: string }> }) {
  const resolvedParams = use(params)
  const { user } = useUser()
  const [story, setStory] = useState<Story | null>(null)
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null)
  const [regeneratingSlide, setRegeneratingSlide] = useState<number | null>(null)

  useEffect(() => {
    async function loadStory() {
      if (!user) return

      const supabase = createClient()

      const { data: storyworkUser } = await supabase
        .from('storywork_users')
        .select('id')
        .eq('clerk_id', user.id)
        .single()

      if (!storyworkUser) {
        setLoading(false)
        return
      }

      // Load story and brand kit in parallel for better performance
      const [storyResult, brandKitResult] = await Promise.all([
        supabase
          .from('storywork_stories')
          .select('*')
          .eq('id', resolvedParams.storyId)
          .eq('user_id', storyworkUser.id)
          .single(),
        supabase
          .from('storywork_brand_kits')
          .select('*')
          .eq('user_id', storyworkUser.id)
          .single(),
      ])

      setStory(storyResult.data as Story | null)

      const resolvedBrandKit: BrandKit = brandKitResult.data
        ? (brandKitResult.data as BrandKit)
        : {
            id: 'default',
            name: '',
            primary_color: BRAND_COLORS.carouselPrimary,
            secondary_color: BRAND_COLORS.carouselSecondary,
            font_family: 'Inter',
            logo_url: null,
            headshot_url: null,
          }

      setBrandKit(resolvedBrandKit)

      // Compute quality report for existing generated content
      if (storyResult.data?.generated_content?.slides && resolvedBrandKit) {
        const report = validateCarouselQuality(
          storyResult.data.generated_content.slides,
          resolvedBrandKit
        )
        setQualityReport(report)
      }

      setLoading(false)
    }

    loadStory()
  }, [resolvedParams.storyId, user])

  const handleGenerate = async () => {
    if (!story) return

    setGenerating(true)

    try {
      const response = await fetch('/api/storywork/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          storyType: story.story_type,
          answers: story.answers,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (data.qualityReport) {
          setQualityReport(data.qualityReport)
        }

        // Refresh story data
        const supabase = createClient()
        const { data: updatedStory } = await supabase
          .from('storywork_stories')
          .select('*')
          .eq('id', story.id)
          .single()

        setStory(updatedStory as Story)
        toast.success('Content generated successfully!')
      } else {
        toast.error(data.error || 'Failed to generate content')
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerateSlide = async (slideIndex: number) => {
    if (!story?.generated_content?.slides || !story.id) return

    const slide = story.generated_content.slides[slideIndex]
    if (!slide) return

    setRegeneratingSlide(slideIndex)

    // Get quality flags for this slide
    const flags = qualityReport?.slideFlags
      .find(f => f.slideIndex === slideIndex)
      ?.issues || ['Improve quality']

    try {
      const response = await fetch('/api/storywork/regenerate-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slide: { headline: slide.headline, body: slide.body },
          qualityFlags: flags,
          storyId: story.id,
        }),
      })

      const data = await response.json()

      if (data.success && data.slide) {
        // Update slide in story content
        const updatedSlides = [...story.generated_content.slides]
        updatedSlides[slideIndex] = {
          ...updatedSlides[slideIndex],
          headline: data.slide.headline,
          body: data.slide.body,
        }

        const updatedContent = { ...story.generated_content, slides: updatedSlides }
        setStory({ ...story, generated_content: updatedContent })

        // Recompute quality report
        if (brandKit) {
          const report = validateCarouselQuality(updatedSlides, brandKit)
          setQualityReport(report)
        }

        toast.success(`Slide ${slideIndex + 1} regenerated!`)
      } else {
        toast.error(data.error || 'Failed to regenerate slide')
      }
    } catch (error) {
      console.error('Regenerate slide error:', error)
      toast.error('Failed to regenerate slide')
    } finally {
      setRegeneratingSlide(null)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStoryTypeColor = (type: string) => {
    switch (type) {
      case 'against_the_odds':
        return 'bg-orange-100 text-orange-700'
      case 'fresh_drop':
        return 'bg-blue-100 text-blue-700'
      case 'behind_the_deal':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-neutral-100 text-neutral-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!story) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600">Story not found</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const storyTypeData = storyTypes[story.story_type as keyof typeof storyTypes]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">{story.title}</h1>
              <Badge className={getStoryTypeColor(story.story_type)}>
                {storyTypeData?.name || story.story_type}
              </Badge>
              {story.source_type === 'voice' && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                  <Mic className="mr-1 h-3 w-3" />
                  Voice
                </Badge>
              )}
            </div>
            <p className="mt-1 text-neutral-600">
              Created {new Date(story.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {!story.generated_content && (
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content (75 credits)
              </>
            )}
          </Button>
        )}
      </div>

      {/* Story Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Story Input</CardTitle>
            <CardDescription>Your original story details</CardDescription>
          </CardHeader>
          <CardContent>
            {story.raw_input && (
              <div className="mb-4">
                <p className="text-sm font-medium text-neutral-500">Raw Input</p>
                <p className="mt-1 text-neutral-700">{story.raw_input}</p>
              </div>
            )}
            {story.answers && Object.keys(story.answers).length > 0 && (
              <div className="space-y-3">
                {storyTypeData?.questions.map((question, index) => (
                  <div key={index}>
                    <p className="text-sm font-medium text-neutral-500">{question}</p>
                    <p className="mt-1 text-neutral-700">
                      {story.answers[`q${index}`] || 'Not answered'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {story.generated_content ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>Ready for your carousel</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Caption */}
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-500">Caption</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(story.generated_content!.caption, 'caption')
                      }
                    >
                      {copied === 'caption' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-1 text-sm text-neutral-700">
                    {story.generated_content.caption}
                  </p>
                </div>

                {/* Hashtags */}
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-500">Hashtags</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          story.generated_content!.hashtags.join(' '),
                          'hashtags'
                        )
                      }
                    >
                      {copied === 'hashtags' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {story.generated_content.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Voice Metadata */}
                {story.generated_content.voice_metadata && (
                  <div className="mt-4 pt-4 border-t border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Mic className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-700">Voice Story Insights</p>
                    </div>

                    {/* Authentic Phrases */}
                    {(story.generated_content.voice_metadata?.extracted_elements?.authentic_phrases?.length ?? 0) > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-neutral-500 flex items-center gap-1 mb-1">
                          <Quote className="h-3 w-3" />
                          Your Authentic Phrases
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {story.generated_content.voice_metadata.extracted_elements.authentic_phrases.map((phrase, i) => (
                            <span
                              key={i}
                              className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full"
                            >
                              &ldquo;{phrase}&rdquo;
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emotional Beats */}
                    {(story.generated_content.voice_metadata?.extracted_elements?.emotional_beats?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-xs font-medium text-neutral-500 flex items-center gap-1 mb-1">
                          <Lightbulb className="h-3 w-3" />
                          Emotional Moments Captured
                        </p>
                        <ul className="text-xs text-neutral-600 space-y-1">
                          {story.generated_content.voice_metadata.extracted_elements.emotional_beats.map((beat, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-purple-500 mt-0.5">•</span>
                              {beat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-neutral-500">No content generated yet</p>
              <p className="mt-1 text-sm text-neutral-400">
                Click Generate Content to create your carousel
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Carousel Preview with Export */}
      {story.generated_content?.slides && brandKit && (
        <div className="bg-neutral-900 rounded-xl p-6">
          <h2 className="mb-6 text-lg font-semibold text-white">Carousel Preview & Export</h2>
          <CarouselPreview
            content={story.generated_content}
            brandKit={brandKit}
            storyId={story.id}
            storyTitle={story.title}
            qualityReport={qualityReport ?? undefined}
            onRegenerateSlide={handleRegenerateSlide}
            regeneratingSlide={regeneratingSlide}
          />
        </div>
      )}
    </div>
  )
}
