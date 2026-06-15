'use client'

import { clsx } from 'clsx'
import type { Category } from '@/types'

export type TimeWindow = 'today' | 'week' | 'month' | 'all'
export type TaskTypeFilter = 'all' | 'done_not_done' | 'duration'

export interface FeedFilters {
  timeWindow: TimeWindow
  categoryIds: string[]
  taskType: TaskTypeFilter
  showArchived: boolean
}

interface Props {
  filters: FeedFilters
  categories: Category[]
  onChange: (f: FeedFilters) => void
}

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'today', label: 'היום' },
  { value: 'week', label: 'השבוע' },
  { value: 'month', label: 'החודש' },
  { value: 'all', label: 'הכל' },
]

export default function FilterBar({ filters, categories, onChange }: Props) {
  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id]
    onChange({ ...filters, categoryIds: next })
  }

  return (
    <div className="space-y-2">
      {/* Time window */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {TIME_WINDOWS.map((tw) => (
          <button
            key={tw.value}
            onClick={() => onChange({ ...filters, timeWindow: tw.value })}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
              filters.timeWindow === tw.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {tw.label}
          </button>
        ))}

        <div className="h-6 w-px bg-gray-200 self-center mx-1 shrink-0" />

        {/* Show archived toggle */}
        <button
          onClick={() => onChange({ ...filters, showArchived: !filters.showArchived })}
          className={clsx(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
            filters.showArchived ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
          )}
        >
          ארכיון
        </button>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={clsx(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all border',
                filters.categoryIds.includes(cat.id)
                  ? 'text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-600'
              )}
              style={
                filters.categoryIds.includes(cat.id)
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : {}
              }
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
