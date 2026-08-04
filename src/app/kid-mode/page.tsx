'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithDetails, Member, LogEntry } from '@/types'
import { computeProgress, getActiveCadence } from '@/lib/progress'
import { fetchLogs } from '@/lib/logs'
import CelebrationOverlay from '@/components/ui/CelebrationOverlay'

type Step = 'member' | 'tasks' | 'done'

export default function KidModePage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>('member')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<0 | 1 | 6>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: fu } = await supabase.from('family_users').select('family_id').eq('user_id', user.id).limit(1).single()
    if (!fu) return

    const [{ data: familyData }, { data: membersData }, { data: tasksData }] = await Promise.all([
      supabase.from('families').select('first_day_of_week').eq('id', fu.family_id).single(),
      supabase.from('members').select('*').eq('family_id', fu.family_id).eq('is_archived', false),
      supabase.from('tasks').select('*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)')
        .eq('family_id', fu.family_id).eq('is_archived', false).eq('task_type', 'done_not_done'),
    ])

    if (familyData?.first_day_of_week) {
      const d = familyData.first_day_of_week
      setFirstDayOfWeek(d === 'sunday' ? 0 : d === 'monday' ? 1 : 6)
    }

    setMembers((membersData ?? []).map((m: any) => ({
      id: m.id, familyId: m.family_id, name: m.name,
      avatarColor: m.avatar_color, avatarUrl: m.avatar_url ?? null,
      isArchived: m.is_archived, createdAt: m.created_at, celebrationMode: m.celebration_mode ?? false,
    })))

    const enriched: TaskWithDetails[] = (tasksData ?? []).map((t: any) => ({
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
    }))
    setTasks(enriched)

    const ids = enriched.map((t) => t.id)
    setLogs(await fetchLogs(supabase, ids, {
      since: subDays(new Date(), 35).toISOString(),
    }))
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function pendingTasksFor(memberId: string): TaskWithDetails[] {
    return tasks.filter((t) => {
      if (!t.assignedMembers.includes(memberId)) return false
      const taskLogs = logs.filter((l) => l.taskId === t.id)
      const progress = computeProgress(t, memberId, taskLogs, firstDayOfWeek)
      return progress.target > 0 && progress.achieved < progress.target
    })
  }

  function selectMember(m: Member) {
    setSelectedMember(m)
    setStep(pendingTasksFor(m.id).length > 0 ? 'tasks' : 'done')
  }

  async function markDone(task: TaskWithDetails) {
    if (!selectedMember || saving) return
    setSaving(true)
    const cadence = getActiveCadence(task.cadenceVersions, new Date())
    if (!cadence) { setSaving(false); return }
    const { error } = await supabase.rpc('log_execution', {
      p_task_id: task.id,
      p_member_id: selectedMember.id,
      p_cadence_version_id: cadence.id,
      p_completed: true,
      p_duration_minutes: null,
      p_duration_seconds: null,
      p_notes: null,
      p_execution_time: new Date().toISOString(),
      p_tag_ids: [],
    })
    setSaving(false)
    if (error) return
    await loadData()
    setShowCelebration(true)
  }

  function afterCelebration() {
    setShowCelebration(false)
    if (!selectedMember) { setStep('member'); return }
    setStep(pendingTasksFor(selectedMember.id).length > 0 ? 'tasks' : 'done')
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="h-10 w-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (showCelebration) {
    return <CelebrationOverlay memberName={selectedMember?.name ?? ''} onDone={afterCelebration} />
  }

  const pending = selectedMember ? pendingTasksFor(selectedMember.id) : []
  const currentTask = pending[0]

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F0FAFA]" dir="rtl">
      {/* Tiny exit for parents */}
      <button onClick={() => router.push('/feed')}
        className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-gray-400 text-sm">
        ✕
      </button>

      {step === 'member' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <p className="text-2xl font-bold text-gray-700 mb-2">מי אתה? 👋</p>
          <div className="grid grid-cols-2 gap-5 w-full max-w-sm">
            {members.map((m) => (
              <button key={m.id} onClick={() => selectMember(m)}
                className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white shadow-lg active:scale-95 transition-transform">
                <span className="h-20 w-20 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden"
                  style={m.avatarUrl ? undefined : { backgroundColor: m.avatarColor }}>
                  {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" /> : m.name[0]}
                </span>
                <span className="font-bold text-lg text-gray-800">{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'tasks' && currentTask && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h1 className="text-3xl font-bold text-gray-900 leading-tight">{currentTask.title}</h1>
            <p className="text-gray-400 mt-3 text-lg">{pending.length} משימות נשארו</p>
          </div>
          <button
            onClick={() => markDone(currentTask)}
            disabled={saving}
            className="h-56 w-56 rounded-full flex items-center justify-center text-white text-6xl shadow-2xl active:scale-90 transition-transform disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0AB5B5, #06B6D4)', boxShadow: '0 12px 40px rgba(10,181,181,0.5)' }}
          >
            {saving ? '⏳' : '✓'}
          </button>
          <p className="text-lg font-semibold text-gray-500">עשיתי! 🎉</p>
        </div>
      )}

      {step === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="text-7xl">🏆</div>
          <h1 className="text-3xl font-bold text-gray-900">כל הכבוד {selectedMember?.name}!</h1>
          <p className="text-lg text-gray-500">סיימת הכל להיום</p>
          <button onClick={() => setStep('member')}
            className="mt-6 rounded-2xl bg-teal-600 text-white px-8 py-4 font-bold text-lg">
            החלף משתמש
          </button>
        </div>
      )}
    </div>
  )
}
