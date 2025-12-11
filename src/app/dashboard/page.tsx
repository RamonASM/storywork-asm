'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import { Plus, BookOpen, Clock, CheckCircle, Loader2, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Story {
  id: string
  title: string
  story_type: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, drafts: 0, completed: 0 })

  const supabase = createClient()

  useEffect(() => {
    if (!isLoaded || !user) return

    async function loadStories() {
      if (!user) return

      // Get storywork user by clerk ID
      const { data: storyworkUser } = await supabase
        .from('storywork_users')
        .select('id')
        .eq('clerk_id', user.id)
        .single()

      if (!storyworkUser) {
        setLoading(false)
        return
      }

      const { data: storiesData } = await supabase
        .from('storywork_stories')
        .select('*')
        .eq('user_id', storyworkUser.id)
        .order('created_at', { ascending: false })

      const fetchedStories = (storiesData as Story[]) || []
      setStories(fetchedStories)

      setStats({
        total: fetchedStories.length,
        drafts: fetchedStories.filter((s) => s.status === 'draft').length,
        completed: fetchedStories.filter((s) => s.status === 'completed').length,
      })

      setLoading(false)
    }

    loadStories()
  }, [supabase, user, isLoaded])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-700'
      case 'generating':
        return 'bg-blue-100 text-blue-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-neutral-100 text-neutral-700'
    }
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

  const formatStoryType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Your Stories</h1>
          <p className="mt-1 text-neutral-600">Create and manage your story carousels</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <Plus className="mr-2 h-4 w-4" />
            New Story
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Total Stories</CardTitle>
            <BookOpen className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Drafts</CardTitle>
            <Clock className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drafts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Story List */}
      {stories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
              <Image className="h-6 w-6 text-neutral-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-neutral-900">No stories yet</h3>
            <p className="mt-2 text-center text-sm text-neutral-500">
              Create your first story to generate engaging carousel content.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Story
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {stories.map((story) => (
            <Link key={story.id} href={`/dashboard/${story.id}`}>
              <Card className="transition-colors hover:border-neutral-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {story.title || 'Untitled Story'}
                      </CardTitle>
                      <CardDescription>
                        Created {new Date(story.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStoryTypeColor(story.story_type)}>
                        {formatStoryType(story.story_type)}
                      </Badge>
                      <Badge className={getStatusColor(story.status)}>
                        {story.status.charAt(0).toUpperCase() + story.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
