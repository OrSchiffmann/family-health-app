'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types'

const MILESTONES = [
  { count: 5, emoji: '🌱', name: 'מתחילים', color: '#84CC16' },
  { count: 10, emoji: '⭐', name: 'כוכב עולה', color: '#FACC15' },
  { count: 25, emoji: '🥉', name: 'ארד', color: '#B45309' },
  { count: 50, emoji: '🥈', name: 'כסף', color: '#9CA3AF' },
  { count: 100, emoji: '🥇', name: 'זהב', color: '#EAB308' },
  { count: 200, emoji: '💎', name: 'יהלום', color: '#38BDF8' },
  { count: 365, emoji: '👑', name: 'אלוף שנתי', color: '#A855F7' },
]

export default function AchievementsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: fu } = await supabase.from('family_users').select('family_id').eq('user_id', user.id).limit(1).single()
      if (!fu) return

      const [{ data: membersData }, { data: tasksData }] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', fu.family_id).eq('is_archived', false),
        supabase.from('tasks').select('id').eq('family_id', fu.family_id),
      ])

      setMembers((membersData ?? []).map((m: any) => ({
        id: m.id, familyId: m.family_id, name: m.name,
        avatarColor: m.avatar_color, avatarUrl: m.avatar_url ?? null,
        isArchived: m.is_archived, createdAt: m.created_at, celebrationMode: m.celebration_mode ?? false,
      })))

      const taskIds = (tasksData ?? []).map((t: any) => t.id)
      if (taskIds.length > 0) {
        const { data: logsData } = await supabase
          .from('log_entries')
          .select('member_id, completed, duration_minutes, duration_seconds')
          .in('task_id', taskIds)

        const tally: Record<string, number> = {}
        for (const l of logsData ?? []) {
          const counts_ = l.completed || (l.duration_minutes ?? 0) > 0 || (l.duration_seconds ?? 0) > 0
          if (counts_) tally[l.member_id] = (tally[l.member_id] ?? 0) + 1
        }
        setCounts(tally)
      }
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full" dir="rtl">
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">🏆 אוסף ההישגים</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-8 pb-10">
        {members.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">אין עדיין חברי משפחה</p>
        )}

        {members.map((m) => {
          const count = counts[m.id] ?? 0
          const nextMilestone = MILESTONES.find((ms) => ms.count > count)
          const prevMilestone = [...MILESTONES].reverse().find((ms) => ms.count <= count)
          const progressBase = prevMilestone?.count ?? 0
          const progressTarget = nextMilestone?.count ?? progressBase
          const progressPct = nextMilestone
            ? Math.round(((count - progressBase) / (progressTarget - progressBase)) * 100)
            : 100

          return (
            <section key={m.id}>
              <div className="flex items-center gap-3 mb-3">
                <span className="h-10 w-10 rounded-full text-white font-bold flex items-center justify-center shrink-0 overflow-hidden"
                  style={m.avatarUrl ? undefined : { backgroundColor: m.avatarColor }}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" /> : m.name[0]}
                </span>
                <div>
                  <p className="font-bold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">{count} ביצועים בסך הכל</p>
                </div>
              </div>

              {nextMilestone && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{nextMilestone.emoji} {nextMilestone.name} עוד {nextMilestone.count - count}</span>
                    <span>{count}/{nextMilestone.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: nextMilestone.color }} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2.5">
                {MILESTONES.map((ms) => {
                  const earned = count >= ms.count
                  return (
                    <div key={ms.count}
                      className="rounded-2xl p-2.5 text-center transition-all"
                      style={{
                        background: earned ? `${ms.color}20` : '#F9FAFB',
                        border: `1.5px solid ${earned ? ms.color : '#F3F4F6'}`,
                        opacity: earned ? 1 : 0.5,
                      }}>
                      <div className="text-2xl" style={{ filter: earned ? 'none' : 'grayscale(1)' }}>{ms.emoji}</div>
                      <p className="text-[10px] font-bold mt-1 truncate" style={{ color: earned ? ms.color : '#9CA3AF' }}>{ms.name}</p>
                      <p className="text-[9px] text-gray-400">{ms.count}</p>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
