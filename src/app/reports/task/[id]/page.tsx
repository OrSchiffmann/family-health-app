'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithDetails, Member, LogEntry } from '@/types'
import { getActiveCadence, computeDayStreak } from '@/lib/progress'

const RANGE_DAYS = 30

export default function TaskReportPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [task, setTask] = useState<TaskWithDetails | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: t } = await supabase
        .from('tasks')
        .select('*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)')
        .eq('id', id)
        .single()
      if (!t) { setLoading(false); return }

      const enriched: TaskWithDetails = {
        ...t,
        assignedMembers: t.assigned_members,
        categoryId: t.category_id,
        subcategoryId: t.subcategory_id,
        taskType: t.task_type,
        endDate: t.end_date,
        isArchived: t.is_archived,
        createdAt: t.created_at,
        createdBy: t.created_by,
        category: t.categories,
        subcategory: t.subcategories,
        cadenceVersions: (t.cadence_versions ?? []).map((v: any) => ({
          id: v.id, taskId: v.task_id, effectiveFrom: v.effective_from,
          targetCount: v.target_count, targetMinutes: v.target_minutes,
          per: v.per, timesPerDay: v.times_per_day ?? null,
        })),
        mediaAttachments: t.attachments,
      }
      setTask(enriched)

      const { data: membersData } = await supabase
        .from('members').select('*').in('id', t.assigned_members ?? [])
      setMembers((membersData ?? []).map((m: any) => ({
        id: m.id, familyId: m.family_id, name: m.name,
        avatarColor: m.avatar_color, avatarUrl: m.avatar_url ?? null,
        isArchived: m.is_archived, createdAt: m.created_at, celebrationMode: m.celebration_mode ?? false,
      })))

      const since = subDays(new Date(), RANGE_DAYS)
      const { data: logsData } = await supabase
        .from('log_entries')
        .select('*')
        .eq('task_id', id)
        .gte('logged_at', since.toISOString())
        .order('logged_at', { ascending: false })
      setLogs((logsData ?? []).map((l: any) => ({
        id: l.id, taskId: l.task_id, memberId: l.member_id, loggedBy: l.logged_by,
        loggedAt: l.logged_at, executionTime: l.execution_time,
        cadenceVersionId: l.cadence_version_id, completed: l.completed,
        durationMinutes: l.duration_minutes, durationSeconds: l.duration_seconds,
        notes: l.notes, tags: [],
      })))
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!task) {
    return <div className="p-8 text-center text-gray-400">המשימה לא נמצאה</div>
  }

  const cadence = getActiveCadence(task.cadenceVersions, new Date())
  const streak = computeDayStreak(logs, null, cadence?.timesPerDay ?? (cadence?.per === 'day' ? (cadence?.targetCount ?? 1) : 1))
  const completedLogs = logs.filter((l) => l.completed || (l.durationMinutes ?? 0) > 0 || (l.durationSeconds ?? 0) > 0)
  const totalMinutes = logs.reduce((s, l) => s + (l.durationMinutes ?? (l.durationSeconds ? l.durationSeconds / 60 : 0)), 0)

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 print:px-0 print:py-0" dir="rtl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-500">← חזרה</button>
        <button onClick={() => window.print()}
          className="rounded-xl bg-teal-600 text-white px-4 py-2 text-sm font-semibold">
          🖨️ הדפסה / שמירה כ-PDF
        </button>
      </div>

      <header className="border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">דוח מעקב — {task.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {members.map((m) => m.name).join(', ')} · {RANGE_DAYS} הימים האחרונים · הופק ב-{new Date().toLocaleDateString('he-IL')}
        </p>
        {task.category && (
          <p className="text-xs text-gray-400 mt-1">{task.category.name}</p>
        )}
      </header>

      {task.description && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-gray-700 mb-1">תיאור</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{task.description}</p>
        </section>
      )}

      <section className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{completedLogs.length}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">ביצועים</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{streak}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">רצף ימים נוכחי</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xl font-bold text-gray-900">
            {cadence ? `${cadence.targetCount ?? cadence.targetMinutes ?? '-'}` : '-'}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            יעד ל{cadence?.per === 'day' ? 'יום' : cadence?.per === 'week' ? 'שבוע' : 'חודש'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xl font-bold text-gray-900">{Math.round(totalMinutes)}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">סה״כ דקות</p>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-700 mb-2">יומן ביצועים ({logs.length} רשומות)</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">אין רשומות בטווח זה</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300 text-gray-500 text-xs">
                <th className="text-right py-1.5 font-medium">תאריך</th>
                <th className="text-right py-1.5 font-medium">מבצע</th>
                <th className="text-right py-1.5 font-medium">סטטוס</th>
                <th className="text-right py-1.5 font-medium">הערות</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const member = members.find((m) => m.id === l.memberId)
                const status = l.durationSeconds
                  ? `${Math.round(l.durationSeconds / 60)} דק'`
                  : l.durationMinutes
                    ? `${l.durationMinutes} דק'`
                    : l.completed ? '✓ בוצע' : '✗ לא בוצע'
                return (
                  <tr key={l.id} className="border-b border-gray-100">
                    <td className="py-1.5 text-gray-700">
                      {new Date(l.executionTime ?? l.loggedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="py-1.5 text-gray-700">{member?.name ?? '-'}</td>
                    <td className="py-1.5 text-gray-700">{status}</td>
                    <td className="py-1.5 text-gray-500">{l.notes ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <footer className="mt-10 pt-4 border-t border-gray-200 text-[11px] text-gray-400 text-center">
        הופק על ידי אפליקציית בריאות המשפחה
      </footer>
    </div>
  )
}
