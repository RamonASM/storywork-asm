'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Palette, Type, Image as ImageIcon, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND_COLORS } from '@/lib/theme/colors'
import { toast } from 'sonner'

// Hex color validation
const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

// Normalize partial hex input (allow typing without full validation)
const normalizeHexInput = (value: string): string => {
  // Ensure it starts with #
  if (!value.startsWith('#')) {
    value = '#' + value
  }
  // Only allow valid hex characters after #
  return '#' + value.slice(1).replace(/[^A-Fa-f0-9]/g, '').slice(0, 6)
}

const fontOptions = [
  { value: 'Inter', label: 'Inter (Modern)' },
  { value: 'Playfair Display', label: 'Playfair Display (Elegant)' },
  { value: 'Montserrat', label: 'Montserrat (Clean)' },
  { value: 'Roboto', label: 'Roboto (Professional)' },
  { value: 'Poppins', label: 'Poppins (Friendly)' },
]

export default function BrandKitPage() {
  const router = useRouter()
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [brandKit, setBrandKit] = useState<{
    name: string
    primary_color: string
    secondary_color: string
    font_family: string
    logo_url: string
    headshot_url: string
    background_style: 'solid' | 'gradient'
    gradient_end_color: string
    gradient_direction: string
  }>({
    name: 'My Brand',
    primary_color: BRAND_COLORS.primary,
    secondary_color: '#000000',
    font_family: 'Inter',
    logo_url: '',
    headshot_url: '',
    background_style: 'solid' as 'solid' | 'gradient',
    gradient_end_color: '',
    gradient_direction: 'to-bottom',
  })
  const [error, setError] = useState<string | null>(null)
  const [colorErrors, setColorErrors] = useState({
    primary: false,
    secondary: false,
  })

  // Handle color text input with validation
  const handleColorTextChange = useCallback(
    (field: 'primary_color' | 'secondary_color', value: string) => {
      const normalized = normalizeHexInput(value)
      setBrandKit((prev) => ({ ...prev, [field]: normalized }))

      // Update validation state
      const errorField = field === 'primary_color' ? 'primary' : 'secondary'
      setColorErrors((prev) => ({
        ...prev,
        [errorField]: normalized.length > 1 && !isValidHexColor(normalized),
      }))
    },
    []
  )

  // Check if colors are valid for saving
  const hasValidColors =
    isValidHexColor(brandKit.primary_color) && isValidHexColor(brandKit.secondary_color)

  useEffect(() => {
    async function loadBrandKit() {
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

      // Try to get existing brand kit
      const { data: existingKit } = await supabase
        .from('storywork_brand_kits')
        .select('*')
        .eq('user_id', storyworkUser.id)
        .eq('is_default', true)
        .single()

      if (existingKit) {
        setBrandKit({
          name: existingKit.name,
          primary_color: existingKit.primary_color,
          secondary_color: existingKit.secondary_color || '#000000',
          font_family: existingKit.font_family,
          logo_url: existingKit.logo_url || '',
          headshot_url: existingKit.headshot_url || '',
          background_style: existingKit.background_style || 'solid',
          gradient_end_color: existingKit.gradient_end_color || '',
          gradient_direction: existingKit.gradient_direction || 'to-bottom',
        })
      }

      setLoading(false)
    }

    loadBrandKit()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: storyworkUser } = await supabase
        .from('storywork_users')
        .select('id')
        .eq('clerk_id', user.id)
        .single()

      if (!storyworkUser) {
        setError('User not found')
        setSaving(false)
        return
      }

      // Check if brand kit exists
      const { data: existingKit } = await supabase
        .from('storywork_brand_kits')
        .select('id')
        .eq('user_id', storyworkUser.id)
        .eq('is_default', true)
        .single()

      if (existingKit) {
        // Update
        const { error: updateError } = await supabase
          .from('storywork_brand_kits')
          .update({
            name: brandKit.name,
            primary_color: brandKit.primary_color,
            secondary_color: brandKit.secondary_color,
            font_family: brandKit.font_family,
            logo_url: brandKit.logo_url || null,
            headshot_url: brandKit.headshot_url || null,
            background_style: brandKit.background_style,
            gradient_end_color: brandKit.gradient_end_color || null,
            gradient_direction: brandKit.gradient_direction,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingKit.id)

        if (updateError) {
          throw new Error(updateError.message)
        }
      } else {
        // Create
        const { error: insertError } = await supabase.from('storywork_brand_kits').insert({
          user_id: storyworkUser.id,
          name: brandKit.name,
          primary_color: brandKit.primary_color,
          secondary_color: brandKit.secondary_color,
          font_family: brandKit.font_family,
          logo_url: brandKit.logo_url || null,
          headshot_url: brandKit.headshot_url || null,
          background_style: brandKit.background_style,
          gradient_end_color: brandKit.gradient_end_color || null,
          gradient_direction: brandKit.gradient_direction,
          is_default: true,
        })

        if (insertError) {
          throw new Error(insertError.message)
        }
      }

      toast.success('Brand kit saved successfully!')
      router.push('/dashboard')
    } catch (err) {
      console.error('Error saving brand kit:', err)
      setError('Failed to save brand kit')
      toast.error('Failed to save brand kit')
      setSaving(false)
    }
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Brand Kit</h1>
          <p className="mt-1 text-neutral-600">Customize your carousel branding.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Settings */}
        <div className="space-y-6">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Palette className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="font-semibold text-neutral-900">Colors</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={isValidHexColor(brandKit.primary_color) ? brandKit.primary_color : BRAND_COLORS.primary}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        primary_color: e.target.value,
                      }))
                    }
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <Input
                    type="text"
                    value={brandKit.primary_color}
                    onChange={(e) => handleColorTextChange('primary_color', e.target.value)}
                    className={`flex-1 ${colorErrors.primary ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    placeholder="#ff4533"
                  />
                </div>
                {colorErrors.primary && (
                  <p className="mt-1 text-xs text-red-500">Enter a valid hex color (e.g., #ff4533)</p>
                )}
              </div>
              <div>
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={isValidHexColor(brandKit.secondary_color) ? brandKit.secondary_color : '#000000'}
                    onChange={(e) =>
                      setBrandKit((prev) => ({
                        ...prev,
                        secondary_color: e.target.value,
                      }))
                    }
                    className="h-10 w-16 cursor-pointer p-1"
                  />
                  <Input
                    type="text"
                    value={brandKit.secondary_color}
                    onChange={(e) => handleColorTextChange('secondary_color', e.target.value)}
                    className={`flex-1 ${colorErrors.secondary ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    placeholder="#000000"
                  />
                </div>
                {colorErrors.secondary && (
                  <p className="mt-1 text-xs text-red-500">Enter a valid hex color (e.g., #000000)</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <Palette className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="font-semibold text-neutral-900">Background Style</h2>
            </div>

            <div className="space-y-4">
              {/* Style Toggle */}
              <div className="flex gap-3">
                <button
                  onClick={() => setBrandKit(prev => ({ ...prev, background_style: 'solid' as const }))}
                  className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                    brandKit.background_style === 'solid'
                      ? 'border-[#ff4533] bg-red-50 text-[#ff4533]'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  Solid Color
                </button>
                <button
                  onClick={() => setBrandKit(prev => ({ ...prev, background_style: 'gradient' as const }))}
                  className={`flex-1 rounded-lg border p-3 text-center text-sm font-medium transition-colors ${
                    brandKit.background_style === 'gradient'
                      ? 'border-[#ff4533] bg-red-50 text-[#ff4533]'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                  }`}
                >
                  Gradient
                </button>
              </div>

              {/* Gradient Options (only visible when gradient selected) */}
              {brandKit.background_style === 'gradient' && (
                <div className="space-y-4 pt-2">
                  <div>
                    <Label htmlFor="gradient_end_color">Gradient End Color</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        id="gradient_end_color"
                        type="color"
                        value={isValidHexColor(brandKit.gradient_end_color) ? brandKit.gradient_end_color : '#000000'}
                        onChange={(e) => setBrandKit(prev => ({ ...prev, gradient_end_color: e.target.value }))}
                        className="h-10 w-16 cursor-pointer p-1"
                      />
                      <Input
                        type="text"
                        value={brandKit.gradient_end_color}
                        onChange={(e) => {
                          const normalized = normalizeHexInput(e.target.value)
                          setBrandKit(prev => ({ ...prev, gradient_end_color: normalized }))
                        }}
                        className="flex-1"
                        placeholder="#000000"
                      />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      Gradient goes from Primary Color to this color
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="gradient_direction">Direction</Label>
                    <select
                      id="gradient_direction"
                      value={brandKit.gradient_direction}
                      onChange={(e) => setBrandKit(prev => ({ ...prev, gradient_direction: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
                    >
                      <option value="to-bottom">Top to Bottom</option>
                      <option value="to-right">Left to Right</option>
                      <option value="to-bottom-right">Diagonal</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Type className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="font-semibold text-neutral-900">Typography</h2>
            </div>

            <div>
              <Label htmlFor="font_family">Font Family</Label>
              <select
                id="font_family"
                value={brandKit.font_family}
                onChange={(e) =>
                  setBrandKit((prev) => ({
                    ...prev,
                    font_family: e.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2"
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <ImageIcon className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="font-semibold text-neutral-900">Images</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={brandKit.logo_url}
                  onChange={(e) =>
                    setBrandKit((prev) => ({ ...prev, logo_url: e.target.value }))
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="headshot_url">Headshot URL</Label>
                <Input
                  id="headshot_url"
                  type="url"
                  value={brandKit.headshot_url}
                  onChange={(e) =>
                    setBrandKit((prev) => ({
                      ...prev,
                      headshot_url: e.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <Button onClick={handleSave} disabled={saving || !hasValidColors} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Brand Kit
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        <div>
          <h2 className="mb-4 font-semibold text-neutral-900">Preview</h2>
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div
              className="aspect-square rounded-lg p-6"
              style={{
                backgroundColor: brandKit.background_style === 'gradient' && brandKit.gradient_end_color
                  ? undefined
                  : brandKit.primary_color,
                backgroundImage: brandKit.background_style === 'gradient' && brandKit.gradient_end_color
                  ? `linear-gradient(${
                      brandKit.gradient_direction === 'to-right' ? 'to right' :
                      brandKit.gradient_direction === 'to-bottom-right' ? 'to bottom right' :
                      'to bottom'
                    }, ${brandKit.primary_color}, ${brandKit.gradient_end_color})`
                  : undefined,
              }}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  {brandKit.logo_url && (
                    <Image
                      src={brandKit.logo_url}
                      alt="Logo"
                      width={120}
                      height={48}
                      className="h-12 w-auto object-contain"
                      unoptimized
                    />
                  )}
                </div>
                <div>
                  <h3
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: brandKit.font_family }}
                  >
                    Sample Headline
                  </h3>
                  <p
                    className="mt-2 text-white/80"
                    style={{ fontFamily: brandKit.font_family }}
                  >
                    This is what your carousel slides will look like.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {brandKit.headshot_url && (
                    <Image
                      src={brandKit.headshot_url}
                      alt="Headshot"
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                      unoptimized
                    />
                  )}
                  <div>
                    <p
                      className="text-sm font-medium text-white"
                      style={{ fontFamily: brandKit.font_family }}
                    >
                      Your Name
                    </p>
                    <p
                      className="text-xs text-white/60"
                      style={{ fontFamily: brandKit.font_family }}
                    >
                      Real Estate Agent
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
