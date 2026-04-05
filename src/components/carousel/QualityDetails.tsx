'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QualityReport } from '@/lib/carousel/quality-checker'

type QualityDetailsProps = {
  report: QualityReport
  onRegenerateSlide?: (slideIndex: number) => void
  regenerating?: number | null
}

const DIMENSION_LABELS: Record<string, string> = {
  readability: 'Readability',
  conciseness: 'Conciseness',
  authenticity: 'Authenticity',
  hookStrength: 'Hook Strength',
  brandCompliance: 'Brand Compliance',
}

function progressBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500'
  if (score >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function QualityDetails({
  report,
  onRegenerateSlide,
  regenerating,
}: QualityDetailsProps) {
  const [expanded, setExpanded] = useState(false)

  const flaggedCount = report.slideFlags.length

  return (
    <div className="bg-neutral-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-200">
            Quality Details
          </span>
          {flaggedCount > 0 && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
              {flaggedCount} flagged slide{flaggedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-neutral-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5">
          {/* Suggestions */}
          {report.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                Suggestions
              </h4>
              <ul className="space-y-1">
                {report.suggestions.map((suggestion, i) => (
                  <li
                    key={i}
                    className="text-sm text-neutral-300 flex items-start gap-2"
                  >
                    <span className="text-orange-500 mt-0.5 shrink-0">*</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dimension progress bars */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
              Dimensions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(report.dimensions).map(([key, dim]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-300">
                      {DIMENSION_LABELS[key] ?? key}
                    </span>
                    <span className="text-neutral-400">
                      {Math.round(dim.score)}
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressBarColor(dim.score)}`}
                      style={{ width: `${Math.min(dim.score, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-slide flags */}
          {report.slideFlags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                Slide Issues
              </h4>
              <div className="space-y-2">
                {report.slideFlags.map((flag) => (
                  <div
                    key={flag.slideIndex}
                    className="flex items-start justify-between gap-3 bg-neutral-900 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-neutral-300">
                        Slide {flag.slideIndex + 1}
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {flag.issues.map((issue, i) => (
                          <li
                            key={i}
                            className="text-xs text-neutral-400"
                          >
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {onRegenerateSlide && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRegenerateSlide(flag.slideIndex)}
                        disabled={regenerating === flag.slideIndex}
                        className="shrink-0 text-xs text-orange-400 hover:text-orange-300"
                      >
                        <RefreshCw
                          className={`h-3 w-3 mr-1 ${regenerating === flag.slideIndex ? 'animate-spin' : ''}`}
                        />
                        Regen
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
