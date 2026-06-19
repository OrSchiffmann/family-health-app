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
import { computeProgress } from '@/lib/progress'
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
  const preLogProgressRef = useRef<CadenceProgress | null>(null)

  const [filters, setFilters] = useState<FeedFilters>({
    timeWindow: 'week',
    categoryIds: [],
    taskType: 'all',
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
        })),
        mediaAttachments: t.attachments,
      }
    })

    setCategories(cats)
    setTasks(enriched)

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

  const filteredTasks = tasks.filter((t) => {
    if (selectedMember && !t.assignedMembers.includes(selectedMember)) return false
    if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(t.categoryId)) return false
    if (filters.taskType !== 'all' && t.taskType !== filters.taskType) return false
    return true
  })

  function getProgress(task: TaskWithDetails): CadenceProgress {
    const taskLogs = logs.filter((l) => l.taskId === task.id)
    return computeProgress(task, selectedMember, taskLogs, firstDayOfWeek)
  }

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
