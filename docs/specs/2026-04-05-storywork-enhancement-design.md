# Storywork Enhancement: Life Here Integration, Visual Layouts, and Quality Gate

**Date:** 2026-04-05
**Status:** Approved
**Scope:** Storywork by ASM (storywork.aerialshots.media)

---

## Overview

Enhance Storywork's carousel generation pipeline with three major improvements:

1. **Life Here Auto-Enrichment** - Inject ASM Portal location intelligence into story generation when an address is provided
2. **Visual Layout Templates** - Replace the single slide layout with 4 distinct visual treatments mapped to slide purpose
3. **Quality Gate (Soft Score)** - Post-generation scoring with actionable per-slide feedback

These build on top of Storywork's existing archetype system, voice profiles, humanizer, brand kits, and ASM Portal integration.

---

## Decision Context

Analysis of two reference implementations informed this design:

- **viz-pack** (Claude Skills for visuals): Self-check quality checklists before delivery, content distillation rules, explicit anti-patterns per output type
- **ii-content-engine** (Template-first content pipeline): Slide type-driven visual treatments, artifact validation before rendering, caption validation with enforced character ranges

Key takeaways applied:
- Quality validation after generation is high-ROI, low-risk
- Mapping slide purpose to distinct visual layouts produces dramatically better output
- Template/artifact systems prevent one-off prompt drift
- Real listing photos beat AI-generated images for real estate content

---

## 1. Life Here Auto-Enrichment

### Behavior

When an agent provides a property address during story creation, Storywork fetches location intelligence from the ASM Portal Life Here API and injects it into the Claude generation prompt.

When no address is provided, generation works exactly as it does today.

### Story Creation Flow

1. Agent picks archetype and answers guided questions (existing flow)
2. New optional step: "Add a property address" with text input
3. For linked agents (`asm_agent_id` exists): "Pick from my listings" dropdown fetches active listings from ASM Portal
4. When address is provided: geocode to lat/lng, fetch Life Here data
5. Location context injected into generation prompt alongside answers and voice profile

### Life Here Client

New file: `src/lib/location/life-here-client.ts`

```typescript
type LifeHereData = {
  overallScore: number
  label: string
  profile: string
  dining: {
    score: number
    restaurantCount: number
    topCuisines: string[]
    topRated: string[]
  }
  commute: {
    airportMinutes: number
    beachMinutes: number
    downtownMinutes: number
    themeParkMinutes: number
  }
  lifestyle: {
    score: number
    gymCount: number
    parkCount: number
    entertainmentVenues: number
  }
  convenience: {
    score: number
    nearestGroceryMiles: number
  }
}
```

Calls three ASM Portal endpoints:
- `GET /api/v1/location/scores?lat={lat}&lng={lng}&profile=balanced`
- `GET /api/v1/location/dining?lat={lat}&lng={lng}`
- `GET /api/v1/location/commute?lat={lat}&lng={lng}`

Auth: `X-ASM-Secret` header with `ASM_LIFE_HERE_SECRET` env var.

Error handling: If Life Here API fails or times out (10s), generation proceeds without location data. Logged but not shown to user.

### Geocoding

Address text must be converted to lat/lng before calling Life Here API.

- For linked agents selecting a listing: lat/lng comes from the listing record in ASM Portal (already geocoded). No additional geocoding needed.
- For manual address entry: Use Google Maps Geocoding API via `GOOGLE_PLACES_API_KEY` (already available in ASM Portal). Storywork needs its own key or proxies through the portal.
- New env var: `GOOGLE_GEOCODING_API_KEY` (or reuse portal's key via a proxy endpoint)
- Geocoding call lives in `src/lib/location/geocode.ts`
- On failure (address not found, API error): show user-facing error "Could not find that address. Try a more specific address or enter coordinates directly." Generation does not proceed with location features until valid lat/lng is resolved.

### Prompt Injection

In `src/lib/storywork/prompts.ts`, the generation prompt gains an optional location block:

```
LOCATION INTELLIGENCE (from Life Here API):
- Life Here Score: 82/100 (Excellent)
- Dining: 47 restaurants nearby, top cuisines: Italian, Thai, Mexican. Score: 85/100
- Commute: 15 min to airport, 25 min to beach, 10 min to downtown
- Lifestyle: 12 parks, 8 gyms, 5 entertainment venues. Score: 78/100
- Convenience: Nearest grocery 0.4 miles

IMPORTANT: Weave these facts naturally into the carousel content.
Use specific numbers ("12 parks within 5 miles") not vague claims ("great amenities").
Do NOT dedicate every slide to location data - blend it with the story.
```

For dedicated neighborhood archetypes, location data drives the slide structure instead of being supplementary.

### New Archetypes

Two new archetypes under THE NEIGHBORHOOD pillar:

**`lifestyle_spotlight`**
- Controlling idea: "The right location transforms a house into a lifestyle."
- Requires address (validation enforced)
- Slide structure: Hook with Life Here score (hero layout) > Dining highlights (data card) > Commute wins (data card) > Lifestyle amenities (content) > Community vibe (content) > Why this neighborhood (content) > CTA
- Emotional core: excitement, aspiration, belonging

**`neighborhood_guide`**
- Controlling idea: "Every neighborhood has a story worth telling."
- Requires address
- Broader than one listing - community/area marketing
- Slide structure: Area hook (hero) > What locals love (content) > Hidden gems (content) > By the numbers (data card with stat row) > Ideal for... (content) > CTA
- Emotional core: discovery, belonging, pride

Both stored as JSON in `src/lib/storywork/archetypes/data/` following existing schema.

### Database Changes

Add to `storywork_stories` table:
- `address` (text, nullable)
- `lat` (double precision, nullable)
- `lng` (double precision, nullable)
- `location_data` (jsonb, nullable) - Cached Life Here response

Migration: `supabase/migrations/YYYYMMDD_001_stories_location.sql`

### New Files

| File | Purpose |
|------|---------|
| `src/lib/location/life-here-client.ts` | Fetch + normalize Life Here API data |
| `src/lib/location/geocode.ts` | Address-to-lat/lng via Google Geocoding API |
| `src/lib/location/types.ts` | TypeScript types for location data |
| `src/lib/storywork/archetypes/data/lifestyle-spotlight.json` | New archetype |
| `src/lib/storywork/archetypes/data/neighborhood-guide.json` | New archetype |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/storywork/prompts.ts` | Add `buildLocationContext()`, inject into generation prompt |
| `src/lib/storywork/archetypes/registry.ts` | Register new archetypes |
| `src/lib/storywork/archetypes/pillars.ts` | Add new archetype IDs to THE NEIGHBORHOOD |
| `src/lib/storywork/archetypes/types.ts` | Add new IDs to `StoryArchetypeId` union |
| `src/app/api/storywork/generate/route.ts` | Accept address, fetch location data, pass to prompt |
| `src/lib/validations/storywork.ts` | Add address/lat/lng to generate schema AND add `lifestyle_spotlight`, `neighborhood_guide` to `STORY_ARCHETYPES` array (line ~8). This array is independent of `types.ts` and is used by the generate route's Zod validation. Both must be updated or new archetypes will be rejected with 400. |

---

## 2. Visual Layout Templates

### Behavior

Replace the single `createSlideElement` function with a layout dispatcher that selects visual treatments based on each slide's `suggestedFormat` from the archetype config.

### 4 Starting Layouts

#### Hero/Hook (`bold_statement`)
- Headline fills 60% of slide height, centered vertically
- Font size: 64px (feed), 72px (story)
- Body text small below: 20px, max 2 lines
- 4px accent color bar at top edge
- No slide number badge (hooks should be clean)
- Used for slides 1-3

#### Data Card (`data_point`)
- Large number/stat at top: 72px, font-weight 700
- Label below: 18px, uppercase, letter-spacing 0.08em
- Supporting body text at bottom: 24px
- Accent color used for the number
- Ideal for Life Here scores: "82" huge, "LIFE HERE SCORE" label

#### Content (default, `question`)
- Refined version of current layout
- Headline left-aligned, 48px, weight 700
- Body below with proper line-height (1.6), 24px
- Slide number badge (top right, existing style)
- More vertical padding between headline and body

#### CTA (`cta`)
- Secondary color as background (inverted from primary)
- Headline centered, 48px
- Agent name displayed: 20px, weight 600
- Headshot circle (64x64) if `headshot_url` exists in brand kit
- Brand name below headshot

### Background System

Each layout accepts optional background configuration:

```typescript
type SlideBackground = {
  type: 'solid' | 'gradient' | 'photo'
  // Solid: uses brandKit.primary_color (existing)
  // Gradient: primary_color to gradient_end_color
  gradientDirection?: 'to-bottom' | 'to-right' | 'to-bottom-right'
  gradientEndColor?: string
  // Photo: pre-fetched image data (NOT a URL - Satori limitation)
  imageData?: string | null  // base64 data URI or ArrayBuffer
  overlayOpacity?: number    // 0.0-1.0, default 0.55
}
```

**CRITICAL: Satori does not support `background-image: url()`.** Photo backgrounds must be implemented as stacked Satori elements:

1. **Pre-fetch phase:** Before the render loop, fetch all photo URLs server-side and convert to `data:image/jpeg;base64,...` URIs. Fetch all images in parallel with a 5s timeout per image. On timeout/failure, fall back to solid color for that slide.
2. **Composition:** The background is a child `<img>` element with `position: absolute`, `width: 100%`, `height: 100%`, `objectFit: cover`. The dark overlay is a sibling `<div>` with `position: absolute`, `backgroundColor: rgba(0,0,0,0.55)`. Content sits on top as a third layer.
3. **The `background.ts` layout file** accepts `imageData` (base64 string), never raw URLs.

When photo data is present: stacked img + overlay + content elements.
When absent: solid `primary_color` or gradient based on brand kit settings.

### Brand Kit Extensions

Add to `storywork_brand_kits` table:
- `background_style` (text, default 'solid') - 'solid' | 'gradient'
- `gradient_end_color` (text, nullable) - Hex color
- `gradient_direction` (text, default 'to-bottom')

Migration: `supabase/migrations/YYYYMMDD_002_brandkit_backgrounds.sql`

### Photo Integration (Linked Agents)

New API route: `src/app/api/storywork/listing-photos/route.ts`
- Requires auth + linked `asm_agent_id`
- Calls ASM Portal to fetch listing media for the agent's active listings
- Returns array of `{ listingId, address, photos: string[] }`
- Agent selects listing during story creation, photos become available as slide backgrounds
- Layout auto-assigns photos: slide 1 gets hero exterior, remaining slides get interior shots in order

### SlideContent Type Extension

The existing `SlideContent` type in `src/lib/carousel/types.ts` must be extended:

```typescript
type SlideContent = {
  headline: string
  body: string
  visual_suggestion: string
  slideNumber: number
  totalSlides: number
  suggestedFormat?: 'bold_statement' | 'question' | 'data_point' | 'quote' | 'cta'
  background?: SlideBackground
}
```

The generate route maps `promptConfig.slideStructure[i].suggestedFormat` onto each slide after generation, before passing to the renderer. This metadata flows through from archetype config to rendered output.

### LinkedIn Layout Scaling

Font sizes specified above (64px, 72px, 48px) are for square (1080x1080) and portrait (1080x1920) formats. For LinkedIn landscape (1200x627), all font sizes scale proportionally to the smaller height:

- Scale factor: `Math.min(1, height / 1080)` = 0.58 for LinkedIn
- Hero headline: 64px * 0.58 = ~37px
- Data card number: 72px * 0.58 = ~42px
- Each layout function receives `width` and `height` and computes sizes from them, not hardcoded values

### Renderer Architecture

```
src/lib/carousel/
  renderer.ts          # Dispatcher: selectLayout() -> layout function
  layouts/
    types.ts           # Shared LayoutProps type + scale helpers
    hero-slide.ts      # createHeroSlide()
    data-card-slide.ts # createDataCardSlide()
    content-slide.ts   # createContentSlide()
    cta-slide.ts       # createCtaSlide()
    background.ts      # createBackground() - shared bg rendering
```

The dispatcher maps `suggestedFormat` to layout:
- `bold_statement` -> hero
- `data_point` -> data card
- `question` -> content
- `quote` -> content (future: quote layout)
- `cta` -> CTA
- default/unknown -> content

### Layout Selection Logic

For slides without explicit `suggestedFormat` (legacy content), position-based heuristics:
- Slide 1: hero
- Slides 2-N-1: content
- Last slide: CTA

For archetypes with `slideStructure` in `promptConfig`, use the defined `suggestedFormat` per slide.

### New Files

| File | Purpose |
|------|---------|
| `src/lib/carousel/layouts/types.ts` | Shared `LayoutProps` type |
| `src/lib/carousel/layouts/hero-slide.ts` | Hero/hook layout |
| `src/lib/carousel/layouts/data-card-slide.ts` | Data card layout |
| `src/lib/carousel/layouts/content-slide.ts` | Content layout |
| `src/lib/carousel/layouts/cta-slide.ts` | CTA layout |
| `src/lib/carousel/layouts/background.ts` | Background rendering (solid/gradient/photo) |
| `src/app/api/storywork/listing-photos/route.ts` | Fetch listing photos from portal |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/carousel/renderer.ts` | Replace `createSlideElement` with layout dispatcher |
| `src/lib/carousel/types.ts` | Add `SlideBackground`, `LayoutType`, extend `BrandKit` |
| `src/lib/carousel/formats.ts` | No change (format sizes stay the same) |
| `src/lib/validations/storywork.ts` | Add background fields to render schema |

---

## 3. Quality Gate (Soft Score)

### Behavior

A pure validation function scores generated carousel content after the humanizer runs. Displayed as a "Content Score" with actionable per-slide flags. Does not block delivery.

### Scoring Dimensions

| Dimension | Weight | Scoring |
|-----------|--------|---------|
| Readability | 25% | Flesch-Kincaid grade level. 6th grade = 100, 12th grade = 0 |
| Conciseness | 25% | Headline max 8 words, body max 40 words. Score = % of slides passing |
| Authenticity | 25% | Existing `analyzeAIScore()` inverted: 0 AI-tells = 100 |
| Hook strength | 15% | Slides 1-3: starts with question or bold statement, no filler openers, under 6 words preferred |
| Brand compliance | 10% | Valid hex colors, font family exists, agent name on CTA slide |

### Output Type

```typescript
type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

type QualityDimension = {
  score: number          // 0-100
  weight: number         // 0.0-1.0
  flags: string[]        // Issues found
}

type SlideFlag = {
  slideIndex: number
  issues: string[]       // e.g., "Headline is 11 words (max 8)"
}

type QualityReport = {
  overallScore: number   // 0-100 weighted
  grade: QualityGrade
  dimensions: {
    readability: QualityDimension
    conciseness: QualityDimension
    authenticity: QualityDimension
    hookStrength: QualityDimension
    brandCompliance: QualityDimension
  }
  slideFlags: SlideFlag[]
  suggestions: string[]  // Top 3 actionable improvements
}
```

Grade mapping: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)

### Readability Implementation

Flesch-Kincaid Grade Level formula:
```
0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
```

Syllable counting: simple heuristic (count vowel groups, adjust for silent-e, common suffixes). Good enough for carousel-length text.

File: `src/lib/carousel/readability.ts`

### Authenticity Dimension Note

The `analyzeAIScore()` function runs on post-humanizer text. Since the humanizer already strips AI-tells, this score will typically be high (90-100). This is intentional: it serves as a safety net catching patterns the humanizer missed, not a primary quality signal.

**Pre-requisite bug fix:** The `AI_TELL_REPLACEMENTS` array in `src/lib/voice/humanizer.ts` uses regex objects with the `g` flag stored as module-level constants. JavaScript's `g` flag retains `lastIndex` state between `.test()` calls, causing intermittent false negatives when `analyzeAIScore()` is called on multiple slides in sequence. Fix: reset `lastIndex = 0` before each `.test()` call, or clone regexes per invocation. This must be fixed before the quality gate ships.

### UI Components

**QualityScore** - Badge next to format selector:
- Green circle: "87 A" for scores 90+
- Yellow circle: "74 C" for 70-89
- Red circle: "58 F" for <70

**QualityDetails** - Expandable panel below carousel preview:
- Per-dimension breakdown with progress bars
- Per-slide flags: "Slide 3: headline is 11 words (max 8)"
- Each flag has a "Regenerate this slide" button
- Top 3 suggestions at the top

### Single Slide Regeneration

When agent clicks "Regenerate this slide":
- POST to new endpoint `POST /api/storywork/regenerate-slide`
- Sends: original slide content, quality flags, voice profile, location data (if any)
- Prompt includes the specific quality issues: "The previous headline was 11 words. Rewrite to max 8 words while keeping the same meaning."
- Returns single updated slide
- Quality score re-calculated client-side

**Credit cost:** 15 credits per slide regeneration (vs 75 for full generation). Add `CREDIT_COSTS.slideRegeneration = 15` to `src/lib/credits/config.ts`.

**Rate limiting:** Apply `RateLimits.storyGeneration` (same limiter as full generation) to prevent abuse. Key: `regenerate:${userId}`. Max 10 regenerations per 5 minutes per user.

### Integration Points

- Generate route: call `validateCarouselQuality()` after humanization, return `qualityReport` alongside content
- Client-side: `validateCarouselQuality()` is also callable after manual edits for live score updates
- Quality checker is a pure function with no side effects - fully testable

### New Files

| File | Purpose |
|------|---------|
| `src/lib/carousel/quality-checker.ts` | Main quality validation function |
| `src/lib/carousel/readability.ts` | Flesch-Kincaid implementation |
| `src/components/carousel/QualityScore.tsx` | Score badge component |
| `src/components/carousel/QualityDetails.tsx` | Expandable flag list |
| `src/app/api/storywork/regenerate-slide/route.ts` | Single slide regeneration |

### Modified Files

| File | Change |
|------|--------|
| `src/app/api/storywork/generate/route.ts` | Call quality checker, return report |
| `src/components/carousel/CarouselPreview.tsx` | Add QualityScore and QualityDetails |

---

## 4. Database Migrations

### Migration 1: Stories Location Fields

```sql
ALTER TABLE storywork_stories
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_data jsonb;

CREATE INDEX IF NOT EXISTS idx_storywork_stories_location
  ON storywork_stories (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
```

### Migration 2: Brand Kit Background Fields

```sql
ALTER TABLE storywork_brand_kits
  ADD COLUMN IF NOT EXISTS background_style text NOT NULL DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS gradient_end_color text,
  ADD COLUMN IF NOT EXISTS gradient_direction text NOT NULL DEFAULT 'to-bottom';
```

---

## 5. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `ASM_LIFE_HERE_SECRET` | API key for Life Here API (`X-ASM-Secret`) | For location features |
| `GOOGLE_GEOCODING_API_KEY` | Google Maps Geocoding for address-to-lat/lng | For manual address entry |
| `ASM_PORTAL_URL` | Already exists | Already configured |
| `SERVICE_API_KEY` | Already exists (cross-platform auth) | Already configured |

---

## 6. Test Coverage

### Quality Checker Tests
- Each dimension scored correctly for known inputs
- Overall score weighted correctly
- Edge cases: empty slides, missing fields, single-word headlines
- Grade boundaries (89 = B, 90 = A)
- Suggestions generated for low-scoring dimensions

### Layout Renderer Tests
- Each layout produces valid Satori element structure
- Background system: solid, gradient, photo overlay
- Photo overlay has correct opacity
- CTA layout includes agent name and headshot when available
- Responsive: feed (1080x1080) vs story (1080x1920) dimensions

### Life Here Client Tests
- Successful API response parsed correctly
- API timeout (10s) handled gracefully - returns null, generation continues
- API error (500, 401) handled - returns null, logged
- Missing data fields handled (partial response)

### Prompt Builder Tests
- Location context injected when address provided
- No location block when address is null
- New archetypes validate against existing StoryArchetype schema
- Lifestyle spotlight requires address (validation error without)

### Readability Tests
- Known passages scored against expected grade levels
- Syllable counter handles common edge cases (silent-e, -tion, -ed)
- Empty string returns grade 0

### Integration Tests
- Full generate flow with address: prompt includes location data
- Full generate flow without address: prompt unchanged from current behavior
- Regenerate single slide: quality flags applied, new slide returned
- Listing photos endpoint: returns photos for linked agent, 404 for unlinked

---

## 7. Implementation Order

### Phase 1: Quality Gate (1-2 days)
- `quality-checker.ts` + `readability.ts` with full tests
- Wire into generate route
- `QualityScore.tsx` + `QualityDetails.tsx` components
- Single slide regeneration endpoint

### Phase 2: Visual Layout Templates (3-5 days)
- Layout types and shared background renderer
- 4 layout implementations (hero, data card, content, CTA)
- Renderer dispatcher replacing `createSlideElement`
- Brand kit migration + gradient support
- Layout tests

### Phase 3: Life Here Integration (3-4 days)
- Life Here client + types
- Database migration for stories location fields
- Prompt injection with location context
- 2 new archetypes (lifestyle_spotlight, neighborhood_guide)
- Address input on story creation form

### Phase 4: Listing Photo Integration (2-3 days)
- Listing photos API route
- Photo background rendering in Satori
- "Pick from my listings" UI for linked agents
- Auto-assign photos to slides

---

## 8. What This Does NOT Include

- AI image generation (Approach E from jury verdict) - agents have real photos
- Scheduled posting / auto-publish to Instagram - fragile, against ToS
- Template authoring by agents - preset layouts only for now
- Quote Card and Stat Row layouts - added in follow-up after core 4 are solid
- Multi-platform caption variants (IG vs LinkedIn vs X) - future enhancement
- Voice calibration wizard (analyzing agent's existing posts) - future enhancement
