'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithDetails, Member } from '@/types'
import CategoryBadge from '@/components/ui/CategoryBadge'

export default function ArchivePage() {
  const router = useRouter()
  const supabase = createClient()
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: fu } = await supabase.from('family_users').select('family_id').eq('user_id', user.id).limit(1).single()
    if (!fu) return

    const [{ data: membersData }, { data: tasksData }] = await Promise.all([
      supabase.from('members').select('*').eq('family_id', fu.family_id),
      supabase
        .from('tasks')
        .select('*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)')
        .eq('family_id', fu.family_id)
        .eq('is_archived', true)
        .order('created_at', { ascending: false }),
    ])

    setMembers((membersData ?? []).map((m: any) => ({
      id: m.id, familyId: m.family_id, name: m.name,
      avatarColor: m.avatar_color, avatarUrl: m.avatar_url ?? null,
      isArchived: m.is_archived, createdAt: m.created_at, celebrationMode: m.celebration_mode ?? false,
    })))

    setTasks((tasksData ?? []).map((t: any) => ({
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
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function restoreTask(taskId: string) {
    setRestoringId(taskId)
    // Clear end_date too — otherwise a past end_date auto-archives it again immediately
    await supabase.from('tasks').update({ is_archived: false, end_date: null }).eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setRestoringId(null)
  }

  async function deleteTask(taskId: string, title: string) {
    if (!window.confirm(`למחוק לצמיתות את "${title}"? כל היסטוריית הביצועים תימחק ולא ניתן לשחזר.`)) return
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

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
        <h1 className="text-xl font-bold text-gray-900">ארכיון</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3 pb-10">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="font-medium text-gray-700">הארכיון ריק</p>
            <p className="text-sm text-gray-400 mt-1">משימות שהועברו לארכיון יופיעו כאן</p>
          </div>
        ) : (
          tasks.map((task) => {
            const taskMembers = members.filter((m) => task.assignedMembers.includes(m.id))
            return (
              <div key={task.id} className="rounded-2xl bg-white border border-gray-100 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/tasks/${task.id}`} className="font-semibold text-gray-900 hover:underline">
                      {task.title}
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <CategoryBadge category={task.category} />
                      {taskMembers.map((m) => (
                        <span key={m.id} className="text-xs text-gray-500">{m.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => restoreTask(task.id)}
                    disabled={restoringId === task.id}
                    className="flex-1 rounded-xl bg-teal-50 text-teal-700 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    {restoringId === task.id ? 'משחזר...' : '↩ שחזור'}
                  </button>
                  <button
                    onClick={() => deleteTask(task.id, task.title)}
                    className="rounded-xl border border-gray-200 text-gray-400 px-4 py-2 text-sm hover:text-red-500 hover:border-red-200"
                  >
                    מחיקה לצמיתות
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
