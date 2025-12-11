'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { storyTypes } from '@/lib/storywork/prompts'
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Image,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Story {
  id: string
  user_id: string
  title: string
  story_type: string
  raw_input: string
  answers: Record<string, string>
  generated_content: {
    slides: Array<{
      headline: string
      body: string
      visual_suggestion: string
    }>
    hashtags: string[]
    caption: string
  } | null
  status: string
  created_at: string
}

export default function StoryDetailPage({ params }: { params: Promise<{ storyId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { user } = useUser()
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadStory() {
      if (!user) return

      const { data: storyworkUser } = await supabase
        .from('storywork_users')
        .select('id')
        .eq('clerk_id', user.id)
        .single()

      if (!storyworkUser) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('storywork_stories')
        .select('*')
        .eq('id', resolvedParams.storyId)
        .eq('user_id', storyworkUser.id)
        .single()

      setStory(data as Story | null)
      setLoading(false)
    }

    loadStory()
  }, [supabase, resolvedParams.storyId, user])

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
        // Refresh story data
        const { data: updatedStory } = await supabase
          .from('storywork_stories')
          .select('*')
          .eq('id', story.id)
          .single()

        setStory(updatedStory as Story)
      } else {
        alert(data.error || 'Failed to generate content')
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to generate content')
    } finally {
      setGenerating(false)
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Image className="h-12 w-12 text-neutral-300" />
              <p className="mt-4 text-neutral-500">No content generated yet</p>
              <p className="mt-1 text-sm text-neutral-400">
                Click Generate Content to create your carousel
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Slides Preview */}
      {story.generated_content?.slides && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Carousel Slides</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {story.generated_content.slides.map((slide, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Slide {index + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(`${slide.headline}\n\n${slide.body}`, `slide-${index}`)
                      }
                    >
                      {copied === `slide-${index}` ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 p-4">
                    <h3 className="text-lg font-bold text-neutral-900">{slide.headline}</h3>
                    <p className="mt-2 text-sm text-neutral-600">{slide.body}</p>
                  </div>
                  <p className="mt-3 text-xs text-neutral-400">
                    <strong>Visual:</strong> {slide.visual_suggestion}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
