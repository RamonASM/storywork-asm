'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { storyTypes } from '@/lib/storywork/prompts'
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Type,
  Loader2,
  Sparkles,
  Zap,
  Trophy,
  Home,
  Handshake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'input' | 'type' | 'questions' | 'generating'
type InputMethod = 'text' | 'voice'
type StoryType = keyof typeof storyTypes

const storyTypeIcons: Record<StoryType, React.ElementType> = {
  against_the_odds: Trophy,
  fresh_drop: Home,
  behind_the_deal: Handshake,
}

const storyTypeColors: Record<StoryType, string> = {
  against_the_odds: 'border-orange-500 bg-orange-50',
  fresh_drop: 'border-blue-500 bg-blue-50',
  behind_the_deal: 'border-green-500 bg-green-50',
}

export default function NewStoryPage() {
  const router = useRouter()
  const { user } = useUser()
  const [step, setStep] = useState<Step>('input')
  const [inputMethod, setInputMethod] = useState<InputMethod | null>(null)
  const [textInput, setTextInput] = useState('')
  const [title, setTitle] = useState('')
  const [selectedType, setSelectedType] = useState<StoryType | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectedType, setDetectedType] = useState<{
    type: StoryType
    confidence: number
    reasoning: string
  } | null>(null)

  const supabase = createClient()

  const handleDetectStoryType = async () => {
    if (!textInput.trim()) return

    setDetecting(true)
    try {
      const response = await fetch('/api/storywork/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: textInput }),
      })

      const data = await response.json()
      if (data.detected_type) {
        setDetectedType({
          type: data.detected_type as StoryType,
          confidence: data.confidence,
          reasoning: data.reasoning,
        })
        setSelectedType(data.detected_type as StoryType)
      }
    } catch (error) {
      console.error('Detection error:', error)
    } finally {
      setDetecting(false)
      setStep('type')
    }
  }

  const handleCreateStory = async () => {
    if (!selectedType || !user) return

    setLoading(true)
    setStep('generating')

    try {
      // Get storywork user
      const { data: storyworkUser } = await supabase
        .from('storywork_users')
        .select('id')
        .eq('clerk_id', user.id)
        .single()

      if (!storyworkUser) {
        throw new Error('User not found')
      }

      // Create story
      const { data: story, error } = await supabase
        .from('storywork_stories')
        .insert({
          user_id: storyworkUser.id,
          title: title || `${storyTypes[selectedType].name} Story`,
          story_type: selectedType,
          raw_input: textInput,
          answers,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error

      // Navigate to story page
      router.push(`/dashboard/${story.id}`)
    } catch (error) {
      console.error('Error creating story:', error)
      setLoading(false)
      setStep('questions')
    }
  }

  const renderInputStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-900">How would you like to start?</h2>
        <p className="mt-2 text-neutral-600">Choose your preferred input method</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className={`cursor-pointer transition-all hover:border-neutral-400 ${
            inputMethod === 'text' ? 'border-2 border-[#ff4533]' : ''
          }`}
          onClick={() => setInputMethod('text')}
        >
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
              <Type className="h-6 w-6 text-neutral-700" />
            </div>
            <CardTitle className="mt-4">Text Input</CardTitle>
            <CardDescription>Type or paste your story details</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-neutral-400 ${
            inputMethod === 'voice' ? 'border-2 border-[#ff4533]' : ''
          }`}
          onClick={() => setInputMethod('voice')}
        >
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
              <Mic className="h-6 w-6 text-neutral-700" />
            </div>
            <CardTitle className="mt-4">Voice Input</CardTitle>
            <CardDescription>Record your story naturally</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {inputMethod === 'text' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Story Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., First-Time Buyer Victory"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="story">Tell your story</Label>
            <Textarea
              id="story"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Describe your real estate story... What happened? What challenges did you face? What was the outcome?"
              className="mt-1 min-h-[200px]"
            />
          </div>
          <Button
            onClick={handleDetectStoryType}
            disabled={!textInput.trim() || detecting}
            className="w-full"
          >
            {detecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting Story Type...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Detect Story Type
              </>
            )}
          </Button>
        </div>
      )}

      {inputMethod === 'voice' && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center">
          <Mic className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-4 text-neutral-600">
            Voice recording coming soon! Please use text input for now.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setInputMethod('text')}>
            Switch to Text Input
          </Button>
        </div>
      )}
    </div>
  )

  const renderTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-900">Select Story Type</h2>
        <p className="mt-2 text-neutral-600">
          {detectedType
            ? `AI detected "${storyTypes[detectedType.type].name}" with ${Math.round(detectedType.confidence * 100)}% confidence`
            : 'Choose the narrative archetype that fits your story'}
        </p>
      </div>

      {detectedType && (
        <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
          <strong>AI Reasoning:</strong> {detectedType.reasoning}
        </div>
      )}

      <div className="grid gap-4">
        {(Object.keys(storyTypes) as StoryType[]).map((type) => {
          const Icon = storyTypeIcons[type]
          const typeData = storyTypes[type]
          const isSelected = selectedType === type
          const isDetected = detectedType?.type === type

          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all ${
                isSelected ? `border-2 ${storyTypeColors[type]}` : 'hover:border-neutral-400'
              }`}
              onClick={() => setSelectedType(type)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isSelected ? storyTypeColors[type] : 'bg-neutral-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{typeData.name}</CardTitle>
                      {isDetected && (
                        <span className="rounded-full bg-[#ff4533] px-2 py-0.5 text-xs text-white">
                          AI Recommended
                        </span>
                      )}
                    </div>
                    <CardDescription className="mt-1">{typeData.description}</CardDescription>
                    <p className="mt-2 text-xs text-neutral-400">Arc: {typeData.arc}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={() => setStep('questions')} disabled={!selectedType} className="flex-1">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderQuestionsStep = () => {
    if (!selectedType) return null

    const questions = storyTypes[selectedType].questions

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900">
            Tell Us More About Your {storyTypes[selectedType].name} Story
          </h2>
          <p className="mt-2 text-neutral-600">
            Answer these questions to help AI craft the perfect narrative
          </p>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={index}>
              <Label htmlFor={`q${index}`}>{question}</Label>
              <Textarea
                id={`q${index}`}
                value={answers[`q${index}`] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [`q${index}`]: e.target.value }))
                }
                className="mt-1"
                rows={3}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('type')} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleCreateStory} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Create Story
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  const renderGeneratingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="h-12 w-12 animate-spin text-[#ff4533]" />
      <h2 className="mt-4 text-xl font-semibold text-neutral-900">Creating Your Story</h2>
      <p className="mt-2 text-neutral-600">This will just take a moment...</p>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Create New Story</h1>
          <p className="mt-1 text-neutral-600">Turn your real estate experience into a carousel</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 'input' && renderInputStep()}
          {step === 'type' && renderTypeStep()}
          {step === 'questions' && renderQuestionsStep()}
          {step === 'generating' && renderGeneratingStep()}
        </CardContent>
      </Card>
    </div>
  )
}
