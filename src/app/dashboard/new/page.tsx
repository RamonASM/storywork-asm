'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { getStoryTypeInfo } from '@/lib/storywork/prompts'
import { CONTENT_PILLARS } from '@/lib/storywork/archetypes/pillars'
import { getArchetypeById, getArchetypesByPillar } from '@/lib/storywork/archetypes/registry'
import type { StoryArchetypeId, ContentPillarId } from '@/lib/storywork/archetypes/types'
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
  Wand2,
  Target,
  Gem,
  TrendingUp,
  Swords,
  Wrench,
  BookOpen,
  MapPin,
  Calendar,
  Brain,
  Heart,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VoiceRecorder } from '@/components/storywork/VoiceRecorder'
import { toast } from 'sonner'

type Step = 'input' | 'pillar' | 'type' | 'questions' | 'generating' | 'voice-processing'
type InputMethod = 'text' | 'voice'

// Icons for each archetype
const archetypeIcons: Record<StoryArchetypeId, React.ElementType> = {
  // THE HUNT
  against_the_odds: Trophy,
  first_steps: Target,
  the_return: Home,
  // THE STAGE
  fresh_drop: Sparkles,
  hidden_gem: Gem,
  // THE ARENA
  market_pulse: TrendingUp,
  battle_tested: Swords,
  // THE CRAFT
  behind_the_deal: Handshake,
  the_breakdown: Wrench,
  // THE NEIGHBORHOOD
  local_legend: MapPin,
  day_in_the_life: Calendar,
  lifestyle_spotlight: Sparkles,
  neighborhood_guide: MapPin,
  // THE MIRROR
  lessons_learned: BookOpen,
  why_i_do_this: Heart,
  the_grind: Clock,
}

// Icons for each pillar
const pillarIcons: Record<ContentPillarId, React.ElementType> = {
  the_hunt: Target,
  the_stage: Home,
  the_arena: Swords,
  the_craft: Wrench,
  the_neighborhood: MapPin,
  the_mirror: Brain,
}

// Colors for each pillar (dark theme compatible)
const pillarColors: Record<ContentPillarId, { border: string; bg: string; text: string }> = {
  the_hunt: { border: 'border-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  the_stage: { border: 'border-violet-500', bg: 'bg-violet-500/10', text: 'text-violet-400' },
  the_arena: { border: 'border-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  the_craft: { border: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  the_neighborhood: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  the_mirror: { border: 'border-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
}

export default function NewStoryPage() {
  const router = useRouter()
  const { user } = useUser()
  const [step, setStep] = useState<Step>('input')
  const [inputMethod, setInputMethod] = useState<InputMethod | null>(null)
  const [textInput, setTextInput] = useState('')
  const [title, setTitle] = useState('')
  const [selectedPillar, setSelectedPillar] = useState<ContentPillarId | null>(null)
  const [expandedPillar, setExpandedPillar] = useState<ContentPillarId | null>(null)
  const [selectedType, setSelectedType] = useState<StoryArchetypeId | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectedType, setDetectedType] = useState<{
    type: StoryArchetypeId
    pillar: ContentPillarId
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
        const archetype = getArchetypeById(data.detected_type as StoryArchetypeId)
        setDetectedType({
          type: data.detected_type as StoryArchetypeId,
          pillar: (data.pillar_id || archetype?.pillarId || 'the_hunt') as ContentPillarId,
          confidence: data.confidence,
          reasoning: data.reasoning,
        })
        setSelectedType(data.detected_type as StoryArchetypeId)
        setSelectedPillar((data.pillar_id || archetype?.pillarId || 'the_hunt') as ContentPillarId)
        setExpandedPillar((data.pillar_id || archetype?.pillarId || 'the_hunt') as ContentPillarId)
      }
    } catch (error) {
      console.error('Detection error:', error)
      toast.error('Failed to detect story type. Please try again.')
    } finally {
      setDetecting(false)
      setStep('type')
    }
  }

  // Handle voice-based story generation (skips questions step)
  const handleVoiceStoryGeneration = async (transcript: string) => {
    if (!user) return

    setTextInput(transcript)
    setStep('voice-processing')
    setLoading(true)

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

      // Create story first
      const { data: story, error: createError } = await supabase
        .from('storywork_stories')
        .insert({
          user_id: storyworkUser.id,
          title: title || 'Voice Story',
          story_type: 'against_the_odds', // Will be updated by voice generation
          raw_input: transcript,
          source_type: 'voice',
          status: 'processing',
        })
        .select()
        .single()

      if (createError) throw createError

      // Generate content using voice-specific endpoint
      const response = await fetch('/api/storywork/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id,
          transcript,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate story')
      }

      toast.success('Your voice story is ready!')
      router.push(`/dashboard/${story.id}`)
    } catch (error) {
      console.error('Voice story generation error:', error)
      toast.error('Failed to create story from voice. Please try again.')
      setLoading(false)
      setStep('input')
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

      // Get archetype info for the title
      const archetype = getArchetypeById(selectedType)
      const storyTitle = title || `${archetype?.name || selectedType} Story`

      // Create story
      const { data: story, error } = await supabase
        .from('storywork_stories')
        .insert({
          user_id: storyworkUser.id,
          title: storyTitle,
          story_type: selectedType,
          pillar_id: selectedPillar || archetype?.pillarId,
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
      toast.error('Failed to create story. Please try again.')
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
          <VoiceRecorder
            onTranscriptionComplete={(transcript) => {
              toast.success('Voice transcription complete! Creating your story...')
              // Use the voice-specific generation flow (skips questions)
              handleVoiceStoryGeneration(transcript)
            }}
            onCancel={() => setInputMethod(null)}
          />
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
            <p className="text-sm text-orange-800">
              <Wand2 className="inline-block h-4 w-4 mr-1" />
              <strong>Voice Magic:</strong> When you record your story, our AI will capture your authentic
              voice and create carousel content that sounds like YOU - not generic marketing copy.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const renderTypeStep = () => {
    const togglePillar = (pillarId: ContentPillarId) => {
      setExpandedPillar(expandedPillar === pillarId ? null : pillarId)
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Select Story Type</h2>
          <p className="mt-2 text-neutral-400">
            {detectedType
              ? `AI detected "${getArchetypeById(detectedType.type)?.name}" with ${Math.round(detectedType.confidence * 100)}% confidence`
              : 'Choose a content pillar, then select the story archetype'}
          </p>
        </div>

        {detectedType && (
          <div className="rounded-lg bg-neutral-800/50 border border-neutral-700 p-4 text-sm text-neutral-300">
            <strong className="text-white">AI Reasoning:</strong> {detectedType.reasoning}
          </div>
        )}

        <div className="space-y-3">
          {CONTENT_PILLARS.map((pillar) => {
            const PillarIcon = pillarIcons[pillar.id]
            const colors = pillarColors[pillar.id]
            const isExpanded = expandedPillar === pillar.id
            const archetypes = getArchetypesByPillar(pillar.id)
            const hasSelectedArchetype = archetypes.some((a) => a.id === selectedType)

            return (
              <div key={pillar.id} className="rounded-lg border border-neutral-700 overflow-hidden">
                {/* Pillar Header */}
                <button
                  onClick={() => togglePillar(pillar.id)}
                  className={`w-full flex items-center justify-between p-4 transition-colors ${
                    isExpanded || hasSelectedArchetype
                      ? `${colors.bg} ${colors.border} border-l-4`
                      : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors.bg}`}>
                      <PillarIcon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{pillar.displayName}</h3>
                        <span className="text-xs text-neutral-500">{pillar.subtitle}</span>
                      </div>
                      <p className="text-sm text-neutral-400">{pillar.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasSelectedArchetype && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        Selected
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Archetype List */}
                {isExpanded && (
                  <div className="border-t border-neutral-700 bg-neutral-900/50 p-3 space-y-2">
                    {archetypes.map((archetype) => {
                      const ArchetypeIcon = archetypeIcons[archetype.id]
                      const isSelected = selectedType === archetype.id
                      const isDetected = detectedType?.type === archetype.id

                      return (
                        <div
                          key={archetype.id}
                          onClick={() => {
                            setSelectedType(archetype.id)
                            setSelectedPillar(pillar.id)
                          }}
                          className={`cursor-pointer rounded-lg p-3 transition-all ${
                            isSelected
                              ? `${colors.bg} ${colors.border} border-2`
                              : 'bg-neutral-800/50 border border-neutral-700 hover:border-neutral-500'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                              isSelected ? colors.bg : 'bg-neutral-700'
                            }`}>
                              <ArchetypeIcon className={`h-4 w-4 ${isSelected ? colors.text : 'text-neutral-300'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-medium ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                  {archetype.name}
                                </span>
                                {isDetected && (
                                  <span className="rounded-full bg-[#ff4533] px-2 py-0.5 text-xs text-white">
                                    AI Pick
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-neutral-400 mt-1 line-clamp-2">
                                {archetype.controllingIdea}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
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
  }

  const renderQuestionsStep = () => {
    if (!selectedType) return null

    const archetype = getArchetypeById(selectedType)
    if (!archetype) return null

    const questions = archetype.questions
    const pillarColor = selectedPillar ? pillarColors[selectedPillar] : pillarColors.the_hunt

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${pillarColor.bg} ${pillarColor.text} text-sm mb-3`}>
            {archetype.pillarName}
          </div>
          <h2 className="text-xl font-semibold text-white">
            Tell Us More About Your {archetype.name} Story
          </h2>
          <p className="mt-2 text-neutral-400">
            Answer these questions to help AI craft the perfect narrative
          </p>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="space-y-2">
              <Label htmlFor={q.id} className="text-neutral-200">
                {q.question}
                {q.optional && <span className="text-neutral-500 ml-2 text-sm">(optional)</span>}
              </Label>
              <Textarea
                id={q.id}
                value={answers[`q${index}`] || answers[q.id] || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [`q${index}`]: e.target.value, [q.id]: e.target.value }))
                }
                placeholder={q.placeholder}
                className="mt-1 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
                rows={3}
              />
              <p className="text-xs text-neutral-500">{q.purpose}</p>
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

  const renderVoiceProcessingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-[#ff4533]" />
        <Wand2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-[#ff4533]" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-neutral-900">Processing Your Voice Story</h2>
      <p className="mt-2 text-neutral-600 max-w-md">
        We&apos;re extracting your story, identifying emotional moments, and preserving your authentic voice...
      </p>
      <div className="mt-6 space-y-2 text-sm text-neutral-500">
        <p>🎯 Detecting story type and themes</p>
        <p>✨ Capturing your unique phrasing</p>
        <p>📝 Creating carousel content that sounds like you</p>
      </div>
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
          {step === 'voice-processing' && renderVoiceProcessingStep()}
        </CardContent>
      </Card>
    </div>
  )
}
