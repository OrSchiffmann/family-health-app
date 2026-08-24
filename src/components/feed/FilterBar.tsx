'use client'

import { clsx } from 'clsx'
import type { Category } from '@/types'

export type TimeWindow = 'today' | 'week' | 'month' | 'all'
export type TaskTypeFilter = 'all' | 'done_not_done' | 'duration'
export type ProgressStatus = 'all' | 'open' | 'in_progress' | 'done'

export interface FeedFilters {
  timeWindow: TimeWindow
  categoryIds: string[]
  taskType: TaskTypeFilter
  progressStatus: ProgressStatus
  showArchived: boolean
  search: string
}

interface Props {
  filters: FeedFilters
  categories: Category[]
  selectedMember?: string | null
  onChange: (f: FeedFilters) => void
}

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'today', label: 'היום' },
  { value: 'week', label: 'השבוע' },
  { value: 'month', label: 'החודש' },
  { value: 'all', label: 'הכל' },
]

export default function FilterBar({ filters, categories, selectedMember, onChange }: Props) {
  const visibleCategories = selectedMember
    ? categories.filter((c) => c.memberId === selectedMember)
    : categories

  function toggleCategory(id: string) {
    const next = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((c) => c !== id)
      : [...filters.categoryIds, id]
    onChange({ ...filters, categoryIds: next })
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <span className="absolute inset-y-0 right-3 flex items-center text-gray-300 pointer-events-none">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </span>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="חיפוש משימה..."
          className="w-full rounded-full bg-white py-2 pr-9 pl-9 text-sm outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-gray-300"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            aria-label="נקה חיפוש"
            className="absolute inset-y-0 left-2 flex items-center justify-center text-gray-400 px-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Time window */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {TIME_WINDOWS.map((tw) => (
          <button
            key={tw.value}
            onClick={() => onChange({ ...filters, timeWindow: tw.value })}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
            style={filters.timeWindow === tw.value
              ? { background: 'linear-gradient(135deg, #0AB5B5, #06B6D4)', color: 'white' }
              : { backgroundColor: 'white', color: '#6B7280' }
            }
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
            filters.showArchived ? 'bg-gray-700 text-white' : 'bg-white text-gray-500'
          )}
        >
          ארכיון
        </button>
      </div>

      {/* Progress status */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {([
          { value: 'all', label: 'כל הסטטוסים' },
          { value: 'open', label: '○ לא התחיל' },
          { value: 'in_progress', label: '◑ בתהליך' },
          { value: 'done', label: '● הושלם' },
        ] as { value: ProgressStatus; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ ...filters, progressStatus: value })}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
            style={filters.progressStatus === value
              ? { background: 'linear-gradient(135deg, #0AB5B5, #06B6D4)', color: 'white' }
              : { backgroundColor: 'white', color: '#6B7280' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Categories */}
      {visibleCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleCategories.map((cat) => (
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
