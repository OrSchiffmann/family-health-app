'use client'

import Link from 'next/link'
import type { TaskWithDetails, Member, CadenceProgress } from '@/types'
import ProgressBar from '@/components/ui/ProgressBar'

interface Props {
  task: TaskWithDetails
  members: Member[]
  progress: CadenceProgress
  showMembers?: boolean
  onLog: (taskId: string) => void
}

export default function TaskCard({ task, members, progress, showMembers = false, onLog }: Props) {
  const done = progress.achieved >= progress.target && progress.target > 0

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden" style={{ borderTopWidth: 3, borderTopColor: task.category?.color ?? '#0AB5B5' }}>
      <Link href={`/tasks/${task.id}`} className="block px-5 pt-4 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base leading-snug flex-1">{task.title}</h3>
          {done && (
            <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#CCFBF1', color: '#0D9488' }}>
              ✓ הושלם
            </span>
          )}
        </div>

        {task.subcategory && (
          <p className="text-xs mb-3" style={{ color: task.category?.color ?? '#9CA3AF' }}>{task.category?.name} · {task.subcategory.name}</p>
        )}
        {!task.subcategory && task.category && (
          <p className="text-xs mb-3" style={{ color: task.category.color }}>{task.category.name}</p>
        )}

        {/* Member avatars */}
        {showMembers && members.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {members.map((m) => (
              <span key={m.id} title={m.name}
                className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
                style={m.avatarUrl ? undefined : { backgroundColor: m.avatarColor }}>
                {m.avatarUrl
                  ? <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                  : m.name[0]}
              </span>
            ))}
          </div>
        )}

        <ProgressBar
          achieved={progress.achieved}
          target={progress.target}
          taskType={task.taskType}
          per={progress.per}
        />

        {task.endDate && (
          <p className="text-xs text-gray-400 mt-2">
            מסתיים: {new Date(task.endDate).toLocaleDateString('he-IL')}
          </p>
        )}
      </Link>

      {/* Log button */}
      <div className="px-5 pb-5">
        <button
          onClick={(e) => { e.preventDefault(); onLog(task.id) }}
          className="w-full rounded-2xl py-3 text-sm font-bold transition-all active:scale-95"
          style={done
            ? { backgroundColor: '#F0FDF4', color: '#15803D', border: '1.5px solid #BBF7D0' }
            : { background: 'linear-gradient(135deg, #0AB5B5, #06B6D4)', color: 'white', boxShadow: '0 4px 14px rgba(10,181,181,0.35)' }
          }
        >
          {done ? '✓ הושלם — רשום עוד' : '+ רשום ביצוע'}
        </button>
      </div>
    </div>
  )
}
