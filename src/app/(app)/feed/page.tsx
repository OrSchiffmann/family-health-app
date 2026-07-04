'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { subDays, startOfMonth } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import TaskCard from '@/components/feed/TaskCard'
import FilterBar, { type FeedFilters } from '@/components/feed/FilterBar'
import MemberChip from '@/components/ui/MemberChip'
import ExecutionModal from '@/components/tasks/ExecutionModal'
import type { TaskWithDetails, Member, Category, CadenceProgress, LogEntry, FirstDayOfWeek } from '@/types'
import { computeProgress, computeDayStreak, getActiveCadence } from '@/lib/progress'
import Toast from '@/components/ui/Toast'
import Confetti from '@/components/ui/Confetti'

function toDateFnsDay(d: FirstDayOfWeek): 0 | 1 | 6 {
  return d === 'sunday' ? 0 : d === 'monday' ? 1 : 6
}

export default function FeedPage() {
  const router = useRouter()
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [logTaskId, setLogTaskId] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<0 | 1 | 6>(0)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'celebrate' } | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [dailyExercise, setDailyExercise] = useState<{ name: string; nameEn: string | null; description: string | null; emoji: string } | null>(null)
  const [dailyDismissed, setDailyDismissed] = useState(false)
  const preLogProgressRef = useRef<CadenceProgress | null>(null)

  const [filters, setFilters] = useState<FeedFilters>({
    timeWindow: 'week',
    categoryIds: [],
    taskType: 'all',
    progressStatus: 'all',
    showArchived: false,
  })

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: fu } = await supabase
      .from('family_users')
      .select('family_id, is_approved')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!fu) { router.push('/onboarding'); return }
    if (fu.is_approved === false) { router.push('/pending'); return }
    const familyId = fu.family_id

    const [{ data: familyData }, { data: membersData }, { data: tasksData }] = await Promise.all([
      supabase.from('families').select('first_day_of_week').eq('id', familyId).single(),
      supabase.from('members').select('*').eq('family_id', familyId).eq('is_archived', false),
      supabase
        .from('tasks')
        .select(`*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)`)
        .eq('family_id', familyId)
        .eq('is_archived', filters.showArchived ? true : false),
    ])

    if (familyData?.first_day_of_week) {
      setFirstDayOfWeek(toDateFnsDay(familyData.first_day_of_week as FirstDayOfWeek))
    }

    setMembers((membersData ?? []).map((m: any) => ({
      id: m.id,
      familyId: m.family_id,
      name: m.name,
      avatarColor: m.avatar_color,
      avatarUrl: m.avatar_url ?? null,
      isArchived: m.is_archived,
      createdAt: m.created_at,
      celebrationMode: m.celebration_mode ?? false,
    })))

    const cats: Category[] = []
    const enriched: TaskWithDetails[] = (tasksData ?? []).map((t: any) => {
      if (t.categories && !cats.find((c: Category) => c.id === t.categories.id)) {
        cats.push({
          id: t.categories.id,
          memberId: t.categories.member_id,
          name: t.categories.name,
          color: t.categories.color,
          isDefault: t.categories.is_default,
          sortOrder: t.categories.sort_order,
          subcategories: [],
        })
      }
      return {
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
          id: v.id,
          taskId: v.task_id,
          effectiveFrom: v.effective_from,
          targetCount: v.target_count,
          targetMinutes: v.target_minutes,
          per: v.per,
          timesPerDay: v.times_per_day ?? null,
        })),
        mediaAttachments: t.attachments,
      }
    })

    // Auto-archive tasks whose end date has passed
    const today = new Date().toISOString().split('T')[0]
    const expiredIds = enriched
      .filter((t) => t.endDate && t.endDate < today && !t.isArchived)
      .map((t) => t.id)
    if (expiredIds.length > 0) {
      await supabase.from('tasks').update({ is_archived: true }).in('id', expiredIds)
      enriched.forEach((t) => { if (expiredIds.includes(t.id)) t.isArchived = true })
    }

    setCategories(cats)
    setTasks(enriched.filter((t) => !t.isArchived || filters.showArchived))

    const taskIds = enriched.map((t) => t.id)
    if (taskIds.length > 0) {
      // Only load logs from the last 35 days — covers the current period for any cadence
      const since = startOfMonth(subDays(new Date(), 6)).toISOString()
      const { data: logsData } = await supabase
        .from('log_entries')
        .select('*')
        .in('task_id', taskIds)
        .gte('logged_at', since)
      setLogs((logsData ?? []).map((l: any) => ({
        id: l.id,
        taskId: l.task_id,
        memberId: l.member_id,
        loggedBy: l.logged_by,
        loggedAt: l.logged_at,
        executionTime: l.execution_time,
        cadenceVersionId: l.cadence_version_id,
        completed: l.completed,
        durationMinutes: l.duration_minutes,
        durationSeconds: l.duration_seconds,
        notes: l.notes,
        tags: [],
      })))
    } else {
      setLogs([])
    }

    setLoading(false)
    setRefreshing(false)
  }, [filters.showArchived])

  useEffect(() => { loadData() }, [loadData])

  // Exercise of the day — deterministic daily pick from the library
  useEffect(() => {
    const todayKey = new Date().toDateString()
    if (localStorage.getItem('daily_exercise_dismissed') === todayKey) {
      setDailyDismissed(true)
      return
    }
    ;(async () => {
      const { data } = await supabase
        .from('exercise_library')
        .select('name, name_en, description, exercise_library_categories(emoji)')
        .eq('is_active', true)
      if (!data || data.length === 0) return
      const start = new Date(new Date().getFullYear(), 0, 0)
      const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000)
      const pick: any = data[dayOfYear % data.length]
      setDailyExercise({
        name: pick.name,
        nameEn: pick.name_en,
        description: pick.description,
        emoji: pick.exercise_library_categories?.emoji ?? '💡',
      })
    })()
  }, [])

  function dismissDaily() {
    localStorage.setItem('daily_exercise_dismissed', new Date().toDateString())
    setDailyDismissed(true)
  }

  function getStatusScore(task: TaskWithDetails): 0 | 1 | 2 {
    const p = getProgress(task)
    if (p.target === 0) return 0
    if (p.achieved >= p.target) return 2      // done
    if (p.achieved > 0) return 1              // in_progress
    return 0                                  // open
  }

  const filteredTasks = tasks
    .filter((t) => {
      if (selectedMember && !t.assignedMembers.includes(selectedMember)) return false
      if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(t.categoryId)) return false
      if (filters.taskType !== 'all' && t.taskType !== filters.taskType) return false
      if (filters.progressStatus !== 'all') {
        const score = getStatusScore(t)
        if (filters.progressStatus === 'open' && score !== 0) return false
        if (filters.progressStatus === 'in_progress' && score !== 1) return false
        if (filters.progressStatus === 'done' && score !== 2) return false
      }
      return true
    })
    .sort((a, b) => {
      // open (0) → in_progress (1) → done (2)
      return getStatusScore(a) - getStatusScore(b)
    })

  function getProgress(task: TaskWithDetails): CadenceProgress {
    const taskLogs = logs.filter((l) => l.taskId === task.id)
    return computeProgress(task, selectedMember, taskLogs, firstDayOfWeek)
  }

  function getStreak(task: TaskWithDetails): number {
    if (task.taskType !== 'done_not_done') return 0
    const cadence = getActiveCadence(task.cadenceVersions, new Date())
    if (!cadence) return 0
    // Daily requirement: timesPerDay for compound cadences, targetCount for daily tasks, else any completion
    const required = cadence.timesPerDay ?? (cadence.per === 'day' ? (cadence.targetCount ?? 1) : 1)
    const taskLogs = logs.filter((l) => l.taskId === task.id)
    return computeDayStreak(taskLogs, selectedMember, required)
  }

  // Daily summary across the visible tasks
  const summary = (() => {
    const withTarget = filteredTasks.filter((t) => getProgress(t).target > 0)
    const done = withTarget.filter((t) => { const p = getProgress(t); return p.achieved >= p.target }).length
    return { done, total: withTarget.length }
  })()

  function handleLog(taskId: string) {
    const task = filteredTasks.find((t) => t.id === taskId)
    if (task) preLogProgressRef.current = getProgress(task)
    setLogTaskId(taskId)
  }

  async function handleSaved(taskId: string) {
    setLogTaskId(null)
    await loadData(true)
    // Check if this save pushed the task to 100%
    const pre = preLogProgressRef.current
    if (pre && pre.target > 0 && pre.achieved < pre.target) {
      setConfetti(true)
      setToast({ message: '🎉 כל הכבוד! המשימה הושלמה!', variant: 'celebrate' })
    } else {
      setToast({ message: '✓ נרשם!', variant: 'success' })
    }
    preLogProgressRef.current = null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-[#F0FAFA] z-10 px-4 pt-5 pb-3 space-y-3">
        {/* Member chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          <MemberChip
            member={{ id: 'all', name: 'הכל', avatarColor: '#6366f1' }}
            selected={selectedMember === null}
            onClick={() => { setSelectedMember(null); setFilters(f => ({ ...f, categoryIds: [] })) }}
          />
          {members.map((m) => (
            <MemberChip
              key={m.id}
              member={m}
              selected={selectedMember === m.id}
              onClick={() => { setSelectedMember(m.id); setFilters(f => ({ ...f, categoryIds: [] })) }}
            />
          ))}
        </div>

        <FilterBar filters={filters} categories={categories} selectedMember={selectedMember} onChange={setFilters} />

        {refreshing && (
          <div className="flex items-center justify-center py-1">
            <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#0AB5B5', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {summary.total > 0 && (
          <div className="rounded-3xl px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #0AB5B5, #0891B2)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-base">
                  {summary.done === summary.total
                    ? '🎉 הכל הושלם — יום מושלם!'
                    : `${summary.done} מתוך ${summary.total} הושלמו`}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="relative h-12 w-12 shrink-0">
                <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={`${(summary.done / summary.total) * 94.2} 94.2`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {Math.round((summary.done / summary.total) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
        {dailyExercise && !dailyDismissed && (
          <div className="bg-white rounded-3xl shadow-sm px-5 py-4 border-2 border-dashed" style={{ borderColor: '#99F6E4' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">{dailyExercise.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">💡 תרגיל היום</p>
                <p className="font-bold text-gray-900 text-sm mt-0.5">
                  {dailyExercise.name}
                  {dailyExercise.nameEn && <span className="text-xs text-gray-400 font-normal mr-1">· {dailyExercise.nameEn}</span>}
                </p>
                {dailyExercise.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2" dir="ltr" style={{ textAlign: 'left' }}>{dailyExercise.description}</p>
                )}
                <div className="flex gap-3 mt-2">
                  <button onClick={() => router.push('/questionnaire')} className="text-xs font-bold text-teal-600">
                    הוסיפו דרך השאלון ←
                  </button>
                  <button onClick={dismissDaily} className="text-xs text-gray-400">הסתר להיום</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="font-medium text-gray-700">אין משימות</p>
            <p className="text-sm text-gray-400 mt-1">צרו משימה חדשה כדי להתחיל</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members.filter((m) => task.assignedMembers.includes(m.id))}
              progress={getProgress(task)}
              streak={getStreak(task)}
              showMembers={selectedMember === null}
              onLog={handleLog}
            />
          ))
        )}
      </div>

      <Toast
        message={toast?.message ?? ''}
        show={!!toast}
        variant={toast?.variant ?? 'success'}
        onHide={() => setToast(null)}
      />
      <Confetti trigger={confetti} onDone={() => setConfetti(false)} />

      {/* Execution modal */}
      {logTaskId && (
        <ExecutionModal
          taskId={logTaskId}
          memberId={selectedMember}
          members={members}
          onClose={() => setLogTaskId(null)}
          onSaved={() => handleSaved(logTaskId)}
        />
      )}
    </div>
  )
}
