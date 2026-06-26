'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Cell } from 'recharts'
import {
  format, parseISO, eachDayOfInterval,
  startOfDay, endOfDay, addDays,
  startOfWeek, endOfWeek, addWeeks,
  startOfMonth, endOfMonth, addMonths,
  subDays, isSameDay,
} from 'date-fns'
import { he } from 'date-fns/locale'
import type { Member, Category, TaskWithDetails, LogEntry } from '@/types'
import { getActiveCadence } from '@/lib/progress'
import MemberChip from '@/components/ui/MemberChip'

type Tab = 'summary' | 'consistency' | 'categories' | 'task'
type PeriodMode = 'day' | 'week' | 'month'
type Range = '7d' | '30d' | '3m'

function getPeriodBounds(mode: PeriodMode, offset: number, fdow: 0 | 1 | 6 = 0) {
  const now = new Date()
  if (mode === 'day') {
    const d = addDays(startOfDay(now), offset)
    return { start: d, end: endOfDay(d) }
  }
  if (mode === 'week') {
    const ws = addWeeks(startOfWeek(now, { weekStartsOn: fdow }), offset)
    return { start: ws, end: endOfWeek(ws, { weekStartsOn: fdow }) }
  }
  const ms = addMonths(startOfMonth(now), offset)
  return { start: ms, end: endOfMonth(ms) }
}

function periodLabel(mode: PeriodMode, offset: number, fdow: 0 | 1 | 6 = 0): string {
  const { start, end } = getPeriodBounds(mode, offset, fdow)
  if (mode === 'day') {
    if (offset === 0) return 'היום'
    if (offset === -1) return 'אתמול'
    return format(start, 'EEEE, d MMMM yyyy', { locale: he })
  }
  if (mode === 'week') {
    if (offset === 0) return 'השבוע הנוכחי'
    if (offset === -1) return 'שבוע שעבר'
    return `${format(start, 'd MMM', { locale: he })} – ${format(end, 'd MMM yyyy', { locale: he })}`
  }
  if (offset === 0) return 'החודש הנוכחי'
  if (offset === -1) return 'חודש שעבר'
  return format(start, 'MMMM yyyy', { locale: he })
}

function logsInPeriod(logs: LogEntry[], mode: PeriodMode, offset: number, fdow: 0 | 1 | 6) {
  const { start, end } = getPeriodBounds(mode, offset, fdow)
  return logs.filter((l) => {
    const d = new Date(l.loggedAt)
    return d >= start && d <= end
  })
}

export default function StatisticsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('summary')
  const [members, setMembers] = useState<Member[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [allLogs, setAllLogs] = useState<LogEntry[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [periodMode, setPeriodMode] = useState<PeriodMode>('week')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<0 | 1 | 6>(0)
  const [selectedTask, setSelectedTask] = useState<string>('')
  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([])
  const [range, setRange] = useState<Range>('30d')
  const [loading, setLoading] = useState(true)
  const [taskIds, setTaskIds] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: fu } = await supabase
        .from('family_users').select('family_id').eq('user_id', user.id).limit(1).single()
      if (!fu) return

      const [{ data: familyData }, { data: membersData }, { data: tasksData }] = await Promise.all([
        supabase.from('families').select('first_day_of_week').eq('id', fu.family_id).single(),
        supabase.from('members').select('*').eq('family_id', fu.family_id).eq('is_archived', false),
        supabase.from('tasks').select('*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)')
          .eq('family_id', fu.family_id).eq('is_archived', false),
      ])

      if (familyData?.first_day_of_week) {
        const d = familyData.first_day_of_week
        setFirstDayOfWeek(d === 'sunday' ? 0 : d === 'monday' ? 1 : 6)
      }

      setMembers((membersData ?? []).map((m: any) => ({
        id: m.id, familyId: m.family_id, name: m.name,
        avatarColor: m.avatar_color, avatarUrl: m.avatar_url ?? null,
        isArchived: m.is_archived, createdAt: m.created_at,
      })))

      const cats: Category[] = []
      const enriched: TaskWithDetails[] = (tasksData ?? []).map((t: any) => {
        if (t.categories && !cats.find((c: Category) => c.id === t.categories.id)) {
          cats.push({
            id: t.categories.id, memberId: t.categories.member_id,
            name: t.categories.name, color: t.categories.color,
            isDefault: t.categories.is_default, sortOrder: t.categories.sort_order,
            subcategories: [],
          })
        }
        return {
          ...t,
          assignedMembers: t.assigned_members, categoryId: t.category_id,
          subcategoryId: t.subcategory_id, taskType: t.task_type,
          endDate: t.end_date, isArchived: t.is_archived,
          createdAt: t.created_at, createdBy: t.created_by,
          category: t.categories, subcategory: t.subcategories,
          cadenceVersions: (t.cadence_versions ?? []).map((v: any) => ({
            id: v.id, taskId: v.task_id, effectiveFrom: v.effective_from,
            targetCount: v.target_count, targetMinutes: v.target_minutes, per: v.per,
          })),
          mediaAttachments: t.attachments,
        }
      })
      setCategories(cats)
      setTasks(enriched)
      const ids = enriched.map((t) => t.id)
      setTaskIds(ids)

      if (ids.length > 0) {
        const { data: logsData } = await supabase
          .from('log_entries').select('*')
          .in('task_id', ids)
          .gte('logged_at', subDays(new Date(), 90).toISOString())
        setAllLogs((logsData ?? []).map((l: any) => ({
          id: l.id, taskId: l.task_id, memberId: l.member_id, loggedBy: l.logged_by,
          loggedAt: l.logged_at, executionTime: l.execution_time,
          cadenceVersionId: l.cadence_version_id, completed: l.completed,
          durationMinutes: l.duration_minutes, durationSeconds: l.duration_seconds,
          notes: l.notes, tags: [],
        })))
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (tab === 'task' && selectedTask) loadTaskStats(selectedTask)
  }, [selectedTask, range, tab])

  async function loadTaskStats(tid: string) {
    const since = range === '7d' ? new Date(Date.now() - 7 * 86400000)
      : range === '30d' ? new Date(Date.now() - 30 * 86400000)
      : new Date(Date.now() - 90 * 86400000)
    const { data } = await supabase
      .from('log_entries').select('*').eq('task_id', tid)
      .gte('logged_at', since.toISOString()).order('logged_at')
    setTaskLogs((data ?? []).map((l: any) => ({
      id: l.id, taskId: l.task_id, memberId: l.member_id, loggedBy: l.logged_by,
      loggedAt: l.logged_at, executionTime: l.execution_time,
      cadenceVersionId: l.cadence_version_id, completed: l.completed,
      durationMinutes: l.duration_minutes, durationSeconds: l.duration_seconds,
      notes: l.notes, tags: [],
    })))
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id])
  }
  function handleSelectMember(id: string | null) {
    setSelectedMember(id)
    setSelectedCategoryIds([])
  }

  // Filtered tasks for selected member/categories
  const filteredTasks = tasks.filter((t) => {
    if (selectedMember && !t.assignedMembers.includes(selectedMember)) return false
    if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(t.categoryId)) return false
    return true
  })
  const visibleCategories = selectedMember ? categories.filter((c) => c.memberId === selectedMember) : categories

  // Logs for current and previous period, filtered by member/category
  function filterLogs(logs: LogEntry[]) {
    return logs.filter((l) => {
      if (selectedMember && l.memberId !== selectedMember) return false
      const task = tasks.find((t) => t.id === l.taskId)
      if (!task) return false
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(task.categoryId)) return false
      return true
    })
  }
  const periodLogs = filterLogs(logsInPeriod(allLogs, periodMode, periodOffset, firstDayOfWeek))
  const prevPeriodLogs = filterLogs(logsInPeriod(allLogs, periodMode, periodOffset - 1, firstDayOfWeek))

  // ── SUMMARY stats ──────────────────────────────────────────────
  function calcCompletion(logs: LogEntry[], taskList: TaskWithDetails[], forPeriodOffset: number) {
    let completed = 0
    for (const task of taskList) {
      const cadence = getActiveCadence(task.cadenceVersions, new Date())
      if (!cadence) continue
      const target = task.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)
      const achieved = task.taskType === 'duration'
        ? logs.filter((l) => l.taskId === task.id).reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : logs.filter((l) => l.taskId === task.id && l.completed).length
      if (achieved >= target && target > 0) completed++
    }
    return { completed, total: taskList.length }
  }
  const curr = calcCompletion(periodLogs, filteredTasks, periodOffset)
  const prev = calcCompletion(prevPeriodLogs, filteredTasks, periodOffset - 1)
  const currPct = curr.total > 0 ? Math.round(curr.completed / curr.total * 100) : 0
  const prevPct = prev.total > 0 ? Math.round(prev.completed / prev.total * 100) : 0
  const delta = currPct - prevPct

  const perMember = (selectedMember ? members.filter((m) => m.id === selectedMember) : members).map((m) => {
    const mTasks = filteredTasks.filter((t) => t.assignedMembers.includes(m.id))
    const mCurr = mTasks.filter((t) => {
      const cadence = getActiveCadence(t.cadenceVersions, new Date())
      if (!cadence) return false
      const target = t.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)
      const logs = periodLogs.filter((l) => l.memberId === m.id && l.taskId === t.id)
      const achieved = t.taskType === 'duration'
        ? logs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : logs.filter((l) => l.completed).length
      return achieved >= target && target > 0
    }).length
    const mPrev = mTasks.filter((t) => {
      const cadence = getActiveCadence(t.cadenceVersions, new Date())
      if (!cadence) return false
      const target = t.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)
      const logs = prevPeriodLogs.filter((l) => l.memberId === m.id && l.taskId === t.id)
      const achieved = t.taskType === 'duration'
        ? logs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : logs.filter((l) => l.completed).length
      return achieved >= target && target > 0
    }).length
    return { member: m, tasks: mTasks.length, curr: mCurr, prev: mPrev }
  })

  // ── CONSISTENCY / STREAK ──────────────────────────────────────
  function computeStreak(memberId: string) {
    // Count consecutive periods backward from current offset with ≥1 completion
    let streak = 0
    let o = periodOffset
    for (let i = 0; i < 52; i++) {
      const logs = filterLogs(logsInPeriod(allLogs.filter((l) => l.memberId === memberId), periodMode, o, firstDayOfWeek))
      if (logs.length === 0) break
      streak++
      o--
    }
    return streak
  }

  // 28-day heatmap (always daily)
  const heatmapDays = eachDayOfInterval({ start: subDays(new Date(), 27), end: new Date() })
  function heatmapCount(memberId: string | null, day: Date) {
    return allLogs.filter((l) => {
      if (memberId && l.memberId !== memberId) return false
      return isSameDay(new Date(l.loggedAt), day) && (l.completed || (l.durationMinutes ?? 0) > 0)
    }).length
  }

  // ── CATEGORY DISTRIBUTION ──────────────────────────────────────
  const categoryStats = categories
    .filter((c) => !selectedMember || c.memberId === selectedMember)
    .map((cat) => {
      const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id)
      const catLogs = periodLogs.filter((l) => catTasks.some((t) => t.id === l.taskId))
      const completions = catLogs.filter((l) => l.completed).length
      const minutes = catLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
      return { cat, completions, minutes, total: completions + minutes }
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  // ── TASK tab ──────────────────────────────────────────────────
  const selectedTaskData = tasks.find((t) => t.id === selectedTask)
  function buildTaskChartData() {
    if (!selectedTaskData || taskLogs.length === 0) return []
    const days = eachDayOfInterval({
      start: subDays(new Date(), range === '7d' ? 6 : range === '30d' ? 29 : 89),
      end: new Date(),
    })
    return days.map((d) => {
      const dayLogs = taskLogs.filter((l) => isSameDay(parseISO(l.loggedAt), d))
      const value = selectedTaskData.taskType === 'duration'
        ? dayLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : dayLogs.filter((l) => l.completed).length
      const cadence = getActiveCadence(selectedTaskData.cadenceVersions, d)
      const target = selectedTaskData.taskType === 'duration' ? (cadence?.targetMinutes ?? 0) : (cadence?.targetCount ?? 0)
      return { date: format(d, 'd/M'), value, target }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const TABS: { value: Tab; label: string }[] = [
    { value: 'summary', label: 'סיכום' },
    { value: 'consistency', label: 'עקביות' },
    { value: 'categories', label: 'קטגוריות' },
    { value: 'task', label: 'משימה' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-gray-900 mb-3">סטטיסטיקות</h1>
          {/* Tabs */}
          <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-xl mb-3">
            {TABS.map(({ value, label }) => (
              <button key={value} onClick={() => setTab(value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Period nav — hidden on task tab */}
          {tab !== 'task' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                  {(['day', 'week', 'month'] as PeriodMode[]).map((m) => (
                    <button key={m} onClick={() => { setPeriodMode(m); setPeriodOffset(0) }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        periodMode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                      }`}>
                      {m === 'day' ? 'יום' : m === 'week' ? 'שבוע' : 'חודש'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPeriodOffset((o) => o - 1)}
                    className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <span className="text-xs font-medium text-gray-700 min-w-[80px] text-center">
                    {periodLabel(periodMode, periodOffset, firstDayOfWeek)}
                  </span>
                  <button onClick={() => setPeriodOffset((o) => Math.min(0, o + 1))}
                    disabled={periodOffset === 0}
                    className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 disabled:opacity-30">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Member chips */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <MemberChip member={{ id: 'all', name: 'הכל', avatarColor: '#0AB5B5' }}
                  selected={selectedMember === null} onClick={() => handleSelectMember(null)} />
                {members.map((m) => (
                  <MemberChip key={m.id} member={m} selected={selectedMember === m.id}
                    onClick={() => handleSelectMember(m.id)} />
                ))}
              </div>

              {/* Category chips */}
              {visibleCategories.length > 0 && tab === 'categories' && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {visibleCategories.map((cat) => (
                    <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                        selectedCategoryIds.includes(cat.id) ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
                      }`}
                      style={selectedCategoryIds.includes(cat.id) ? { backgroundColor: cat.color } : {}}>
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-24">

        {/* ── SUMMARY TAB ── */}
        {tab === 'summary' && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3 text-center bg-teal-50 text-teal-700">
                <p className="text-xl font-bold">{curr.completed}/{curr.total}</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">הושלמו</p>
              </div>
              <div className="rounded-2xl p-3 text-center bg-teal-50 text-teal-700">
                <p className="text-xl font-bold">{currPct}%</p>
                <p className="text-xs font-medium mt-0.5 opacity-80">השלמה</p>
              </div>
              <div className={`rounded-2xl p-3 text-center ${delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <p className="text-xl font-bold flex items-center justify-center gap-0.5">
                  {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
                  {Math.abs(delta)}%
                </p>
                <p className="text-xs font-medium mt-0.5 opacity-80">לעומת קודם</p>
              </div>
            </div>

            {/* Comparison bar: this vs last */}
            {curr.total > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-2">השוואה לתקופה קודמת</h2>
                <ResponsiveContainer width="100%" height={140}>
                  <ComposedChart
                    data={[{ name: 'קודם', value: prevPct }, { name: 'נוכחי', value: currPct }]}
                    margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      <Cell fill="#CBD5E1" />
                      <Cell fill="#0AB5B5" />
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </section>
            )}

            {/* Per member */}
            {perMember.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">לפי חבר משפחה</h2>
                <div className="space-y-3">
                  {perMember.map(({ member, tasks: t, curr: done, prev: prevDone }) => {
                    const pct = t > 0 ? Math.round(done / t * 100) : 0
                    const prevPctM = t > 0 ? Math.round(prevDone / t * 100) : 0
                    const d = pct - prevPctM
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <span className="h-8 w-8 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0 overflow-hidden"
                          style={member.avatarUrl ? undefined : { backgroundColor: member.avatarColor }}>
                          {member.avatarUrl ? <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" /> : member.name?.[0]}
                        </span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-800">{member.name}</span>
                            <span className="text-gray-500 flex items-center gap-1">
                              {done}/{t}
                              {d !== 0 && (
                                <span className={`text-xs font-medium ${d > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {d > 0 ? `+${d}%` : `${d}%`}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #0AB5B5, #06B6D4)' }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {curr.total === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">אין משימות לתצוגה</p>
            )}
          </>
        )}

        {/* ── CONSISTENCY TAB ── */}
        {tab === 'consistency' && (
          <>
            {/* Streaks per member */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">Streak — עקביות ברצף</h2>
              <div className="space-y-3">
                {(selectedMember ? members.filter((m) => m.id === selectedMember) : members).map((m) => {
                  const streak = computeStreak(m.id)
                  return (
                    <div key={m.id} className="rounded-2xl bg-white border border-gray-100 p-3 flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0 overflow-hidden"
                        style={m.avatarUrl ? undefined : { backgroundColor: m.avatarColor }}>
                        {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" /> : m.name?.[0]}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm">{m.name}</p>
                        <p className="text-xs text-gray-500">
                          {streak > 0
                            ? `${streak} ${periodMode === 'day' ? 'ימים' : periodMode === 'week' ? 'שבועות' : 'חודשים'} ברצף`
                            : 'אין רצף פעיל'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: streak > 0 ? '#0AB5B5' : '#D1D5DB' }}>{streak}</p>
                        <p className="text-xs text-gray-400">{streak > 0 ? '🔥' : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* 28-day heatmap */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">28 ימים אחרונים</h2>
              <div className="grid grid-cols-7 gap-1">
                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((d) => (
                  <div key={d} className="text-center text-xs text-gray-400 pb-1">{d}</div>
                ))}
                {heatmapDays.map((day) => {
                  const count = heatmapCount(selectedMember, day)
                  const opacity = count === 0 ? 0 : count === 1 ? 0.3 : count === 2 ? 0.6 : 1
                  return (
                    <div key={day.toISOString()}
                      className="aspect-square rounded-md flex items-center justify-center"
                      style={{
                        backgroundColor: count === 0 ? '#F3F4F6' : `rgba(10, 181, 181, ${opacity})`,
                      }}
                      title={`${format(day, 'd/M', { locale: he })}: ${count} ביצועים`}
                    />
                  )
                })}
              </div>
              <div className="flex items-center gap-2 mt-2 justify-end">
                <span className="text-xs text-gray-400">פחות</span>
                {[0, 0.3, 0.6, 1].map((o, i) => (
                  <div key={i} className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: o === 0 ? '#F3F4F6' : `rgba(10, 181, 181, ${o})` }} />
                ))}
                <span className="text-xs text-gray-400">יותר</span>
              </div>
            </section>
          </>
        )}

        {/* ── CATEGORIES TAB ── */}
        {tab === 'categories' && (
          <>
            {categoryStats.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">אין נתונים לתקופה זו</p>
            ) : (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">פעילות לפי קטגוריה</h2>
                <div className="space-y-3">
                  {categoryStats.map(({ cat, completions, minutes }) => {
                    const maxVal = Math.max(...categoryStats.map((c) => c.completions + c.minutes))
                    const width = maxVal > 0 ? ((completions + minutes) / maxVal) * 100 : 0
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="font-medium text-gray-700">{cat.name}</span>
                          </span>
                          <span className="text-gray-500 text-xs">
                            {completions > 0 && `${completions} ביצועים`}
                            {completions > 0 && minutes > 0 && ' · '}
                            {minutes > 0 && `${minutes} דק'`}
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${width}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Category trend over last periods */}
            {categoryStats.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">טרנד — 4 תקופות אחרונות</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart
                    data={[-3, -2, -1, 0].map((o) => {
                      const logs = filterLogs(logsInPeriod(allLogs, periodMode, periodOffset + o, firstDayOfWeek))
                      const point: any = { label: periodLabel(periodMode, periodOffset + o, firstDayOfWeek).slice(0, 6) }
                      categoryStats.slice(0, 4).forEach(({ cat }) => {
                        const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id)
                        point[cat.name] = logs.filter((l) => catTasks.some((t) => t.id === l.taskId) && (l.completed || (l.durationMinutes ?? 0) > 0)).length
                      })
                      return point
                    })}
                    margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    {categoryStats.slice(0, 4).map(({ cat }) => (
                      <Bar key={cat.id} dataKey={cat.name} fill={cat.color} radius={[3, 3, 0, 0]} stackId="a" />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </section>
            )}
          </>
        )}

        {/* ── TASK TAB ── */}
        {tab === 'task' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">בחר משימה</label>
              <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">-- בחר משימה --</option>
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              {[{ value: '7d', label: '7 ימים' }, { value: '30d', label: '30 ימים' }, { value: '3m', label: '3 חודשים' }].map(({ value, label }) => (
                <button key={value} onClick={() => setRange(value as Range)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                    range === value ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-200 text-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {selectedTaskData && taskLogs.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {selectedTaskData.taskType === 'duration' ? (
                    <>
                      <div className="rounded-2xl p-3 text-center bg-teal-50 text-teal-700">
                        <p className="text-xl font-bold">{taskLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)}</p>
                        <p className="text-xs font-medium mt-0.5 opacity-80">סה״כ דקות</p>
                      </div>
                      <div className="rounded-2xl p-3 text-center bg-purple-50 text-purple-700">
                        <p className="text-xl font-bold">{Math.round(taskLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0) / (range === '7d' ? 7 : range === '30d' ? 30 : 90))}</p>
                        <p className="text-xs font-medium mt-0.5 opacity-80">ממוצע ליום</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl p-3 text-center bg-teal-50 text-teal-700">
                        <p className="text-xl font-bold">{taskLogs.filter((l) => l.completed).length}</p>
                        <p className="text-xs font-medium mt-0.5 opacity-80">סה״כ ביצועים</p>
                      </div>
                      <div className="rounded-2xl p-3 text-center bg-amber-50 text-amber-700">
                        <p className="text-xl font-bold">{taskLogs.filter((l) => !l.completed).length}</p>
                        <p className="text-xs font-medium mt-0.5 opacity-80">לא בוצע</p>
                      </div>
                    </>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={buildTaskChartData()} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name={selectedTaskData.taskType === 'duration' ? 'דקות' : 'ביצועים'} fill="#0AB5B5" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="4 2" dot={false} name="יעד" />
                  </ComposedChart>
                </ResponsiveContainer>

                <section>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">רשומות</h2>
                  <div className="space-y-2">
                    {taskLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                        <span className={`mt-0.5 h-4 w-4 rounded-full shrink-0 ${log.completed || (log.durationMinutes ?? 0) > 0 ? 'bg-teal-500' : 'bg-gray-300'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {log.durationMinutes ? `${log.durationMinutes} דקות` : log.completed ? 'בוצע' : 'לא בוצע'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(parseISO(log.loggedAt), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </p>
                          {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {selectedTask && taskLogs.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">אין נתונים לתקופה זו</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
