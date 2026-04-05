'use client'

import type { QualityGrade } from '@/lib/carousel/quality-checker'

type QualityScoreProps = {
  score: number
  grade: QualityGrade
}

const GRADE_COLORS: Record<QualityGrade, string> = {
  A: 'text-green-500 border-green-500',
  B: 'text-green-400 border-green-400',
  C: 'text-yellow-500 border-yellow-500',
  D: 'text-orange-500 border-orange-500',
  F: 'text-red-500 border-red-500',
}

export function QualityScore({ score, grade }: QualityScoreProps) {
  const colorClasses = GRADE_COLORS[grade]

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl font-bold ${colorClasses}`}
      >
        {grade}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-neutral-400 uppercase tracking-wide">
          Content Score
        </span>
        <span className="text-sm font-semibold text-neutral-200">
          {Math.round(score)}/100
        </span>
      </div>
    </div>
  )
}
