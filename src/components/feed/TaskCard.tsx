'use client'

import Link from 'next/link'
import { clsx } from 'clsx'
import type { TaskWithDetails, Member, CadenceProgress } from '@/types'
import CategoryBadge from '@/components/ui/CategoryBadge'
import ProgressBar from '@/components/ui/ProgressBar'

interface Props {
  task: TaskWithDetails
  members: Member[]
  progress: CadenceProgress
  showMembers?: boolean
  onLog: (taskId: string) => void
}

export default function TaskCard({ task, members, progress, showMembers = false, onLog }: Props) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      style={{ borderRightWidth: 4, borderRightColor: task.category.color }}
    >
      <Link href={`/tasks/${task.id}`} className="block p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">
              {task.title}
            </h3>
            {task.subcategory && (
              <p className="text-xs text-gray-400 mt-0.5">{task.subcategory.name}</p>
            )}
          </div>
          <CategoryBadge category={task.category} />
        </div>

        {/* Members avatars (shown in "All" mode) */}
        {showMembers && members.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {members.map((m) => (
              <span
                key={m.id}
                title={m.name}
                className="h-5 w-5 rounded-full text-white text-xs flex items-center justify-center font-medium"
                style={{ backgroundColor: m.avatarColor }}
              >
                {m.name[0]}
              </span>
            ))}
          </div>
        )}

        {/* Progress */}
        <ProgressBar
          achieved={progress.achieved}
          target={progress.target}
          taskType={task.taskType}
          per={progress.per}
        />

        {/* End date */}
        {task.endDate && (
          <p className="text-xs text-gray-400 mt-2">
            מסתיים: {new Date(task.endDate).toLocaleDateString('he-IL')}
          </p>
        )}
      </Link>

      {/* Log button */}
      <div className="px-4 pb-4">
        <button
          onClick={(e) => { e.preventDefault(); onLog(task.id) }}
          className={clsx(
            'w-full rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95',
            progress.achieved >= progress.target && progress.target > 0
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
          )}
        >
          {progress.achieved >= progress.target && progress.target > 0 ? '✓ הושלם — רשום עוד' : 'רשום'}
        </button>
      </div>
    </div>
  )
}
