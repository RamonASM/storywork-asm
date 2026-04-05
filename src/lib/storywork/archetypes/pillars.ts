/**
 * Content Pillars
 *
 * Six high-level categories that organize story archetypes around
 * the life and work of a real estate agent.
 */

import type { ContentPillar, ContentPillarId } from './types'

export const CONTENT_PILLARS: ContentPillar[] = [
  {
    id: 'the_hunt',
    name: 'The Hunt',
    displayName: 'THE HUNT',
    subtitle: 'Client Journeys',
    description:
      'Stories about the transformative journey from searching to finding. Client wins, breakthroughs, and the emotional rollercoaster of buying or selling.',
    icon: 'Target',
    color: 'accent-indigo',
    archetypeIds: ['against_the_odds', 'first_steps', 'the_return'],
    isActive: true,
  },
  {
    id: 'the_stage',
    name: 'The Stage',
    displayName: 'THE STAGE',
    subtitle: 'Property Showcase',
    description:
      'Presenting properties as characters with their own stories. New listings, hidden gems, and the unique features that make a house a home.',
    icon: 'Home',
    color: 'accent-violet',
    archetypeIds: ['fresh_drop', 'hidden_gem'],
    isActive: true,
  },
  {
    id: 'the_arena',
    name: 'The Arena',
    displayName: 'THE ARENA',
    subtitle: 'Market & Competition',
    description:
      'Navigating competitive forces and market dynamics. Market insights, bidding wars, and strategic victories.',
    icon: 'TrendingUp',
    color: 'accent-fuchsia',
    archetypeIds: ['market_pulse', 'battle_tested'],
    isActive: true,
  },
  {
    id: 'the_craft',
    name: 'The Craft',
    displayName: 'THE CRAFT',
    subtitle: 'Professional Expertise',
    description:
      'Behind-the-scenes knowledge and skill demonstration. Deal breakdowns, process education, and the expertise that sets you apart.',
    icon: 'Wrench',
    color: 'accent-orange',
    archetypeIds: ['behind_the_deal', 'the_breakdown'],
    isActive: true,
  },
  {
    id: 'the_neighborhood',
    name: 'The Neighborhood',
    displayName: 'THE NEIGHBORHOOD',
    subtitle: 'Community & Lifestyle',
    description:
      'The human fabric of places and living. Local highlights, community features, and what makes each area special.',
    icon: 'MapPin',
    color: 'accent-emerald',
    archetypeIds: ['local_legend', 'day_in_the_life', 'lifestyle_spotlight', 'neighborhood_guide'],
    isActive: true,
  },
  {
    id: 'the_mirror',
    name: 'The Mirror',
    displayName: 'THE MIRROR',
    subtitle: 'Personal Growth',
    description:
      "Your own journey, lessons, and authentic self. Reflections, growth moments, and the 'why' behind what you do.",
    icon: 'Heart',
    color: 'chart-1',
    archetypeIds: ['lessons_learned', 'why_i_do_this', 'the_grind'],
    isActive: true,
  },
]

/**
 * Get pillar by ID
 */
export function getPillarById(id: ContentPillarId): ContentPillar | undefined {
  return CONTENT_PILLARS.find((p) => p.id === id)
}

/**
 * Get all active pillars
 */
export function getActivePillars(): ContentPillar[] {
  return CONTENT_PILLARS.filter((p) => p.isActive)
}

/**
 * Get pillar color class for styling
 */
export function getPillarColor(pillarId: ContentPillarId): string {
  const pillar = getPillarById(pillarId)
  return pillar?.color ?? 'accent-violet'
}

/**
 * Get pillar icon name
 */
export function getPillarIcon(pillarId: ContentPillarId): string {
  const pillar = getPillarById(pillarId)
  return pillar?.icon ?? 'Sparkles'
}
