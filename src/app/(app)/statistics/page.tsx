'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts'
import {
  format, parseISO, eachDayOfInterval,
  startOfDay, endOfDay, addDays,
  startOfWeek, endOfWeek, addWeeks,
  startOfMonth, endOfMonth, addMonths,
  isSameDay,
} from 'date-fns'
import { he } from 'date-fns/locale'
import type { Member, Category, TaskWithDetails, LogEntry } from '@/types'
import { getActiveCadence } from '@/lib/progress'
import MemberChip from '@/components/ui/MemberChip'

type Tab = 'family' | 'task'
type PeriodMode = 'day' | 'week' | 'month'
type Range = '7d' | '30d' | '3m'

function getPeriodBounds(mode: PeriodMode, offset: number, firstDayOfWeek: 0 | 1 | 6 = 0) {
  const now = new Date()
  if (mode === 'day') {
    const d = addDays(startOfDay(now), offset)
    return { start: d, end: endOfDay(d) }
  }
  if (mode === 'week') {
    const ws = addWeeks(startOfWeek(now, { weekStartsOn: firstDayOfWeek }), offset)
    return { start: ws, end: endOfWeek(ws, { weekStartsOn: firstDayOfWeek }) }
  }
  const ms = addMonths(startOfMonth(now), offset)
  return { start: ms, end: endOfMonth(ms) }
}

function periodLabel(mode: PeriodMode, offset: number, firstDayOfWeek: 0 | 1 | 6 = 0): string {
  const { start, end } = getPeriodBounds(mode, offset, firstDayOfWeek)
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

export default function StatisticsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('family')
  const [members, setMembers] = useState<Member[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [periodLogs, setPeriodLogs] = useState<LogEntry[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [periodMode, setPeriodMode] = useState<PeriodMode>('week')
  const [periodOffset, setPeriodOffset] = useState(0)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<0 | 1 | 6>(0)
  const [selectedTask, setSelectedTask] = useState<string>('')
  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([])
  const [range, setRange] = useState<Range>('30d')
  const [loading, setLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(false)
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
      setTaskIds(enriched.map((t) => t.id))
      setLoading(false)
    }
    load()
  }, [])

  // Load logs whenever period changes or tasks are loaded
  const loadPeriodLogs = useCallback(async (
    ids: string[], mode: PeriodMode, offset: number, fdow: 0 | 1 | 6
  ) => {
    if (ids.length === 0) return
    setLogsLoading(true)
    const { start, end } = getPeriodBounds(mode, offset, fdow)
    const { data } = await supabase
      .from('log_entries').select('*')
      .in('task_id', ids)
      .gte('logged_at', start.toISOString())
      .lte('logged_at', end.toISOString())
    setPeriodLogs((data ?? []).map((l: any) => ({
      id: l.id, taskId: l.task_id, memberId: l.member_id, loggedBy: l.logged_by,
      loggedAt: l.logged_at, executionTime: l.execution_time,
      cadenceVersionId: l.cadence_version_id, completed: l.completed,
      durationMinutes: l.duration_minutes, durationSeconds: l.duration_seconds,
      notes: l.notes, tags: [],
    })))
    setLogsLoading(false)
  }, [])

  useEffect(() => {
    if (taskIds.length > 0) loadPeriodLogs(taskIds, periodMode, periodOffset, firstDayOfWeek)
  }, [taskIds, periodMode, periodOffset, firstDayOfWeek, loadPeriodLogs])

  useEffect(() => {
    if (tab === 'task' && selectedTask) loadTaskStats(selectedTask)
  }, [selectedTask, range, tab])

  async function loadTaskStats(tid: string) {
    const since = range === '7d' ? new Date(Date.now() - 7 * 86400000)
      : range === '30d' ? new Date(Date.now() - 30 * 86400000)
      : new Date(Date.now() - 90 * 86400000)
    const { data } = await supabase
      .from('log_entries').select('*')
      .eq('task_id', tid)
      .gte('logged_at', since.toISOString())
      .order('logged_at')
    setTaskLogs((data ?? []).map((l: any) => ({
      id: l.id, taskId: l.task_id, memberId: l.member_id, loggedBy: l.logged_by,
      loggedAt: l.logged_at, executionTime: l.execution_time,
      cadenceVersionId: l.cadence_version_id, completed: l.completed,
      durationMinutes: l.duration_minutes, durationSeconds: l.duration_seconds,
      notes: l.notes, tags: [],
    })))
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleSelectMember(memberId: string | null) {
    setSelectedMember(memberId)
    setSelectedCategoryIds([])
  }

  function changePeriod(delta: number) {
    const next = periodOffset + delta
    if (next > 0) return // can't go to future
    setPeriodOffset(next)
  }

  function changePeriodMode(mode: PeriodMode) {
    setPeriodMode(mode)
    setPeriodOffset(0)
  }

  // Filter tasks + logs for family tab
  const filteredTasks = tasks.filter((t) => {
    if (selectedMember && !t.assignedMembers.includes(selectedMember)) return false
    if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(t.categoryId)) return false
    return true
  })

  const filteredLogs = periodLogs.filter((l) => {
    if (selectedMember && l.memberId !== selectedMember) return false
    const task = tasks.find((t) => t.id === l.taskId)
    if (!task) return false
    if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(task.categoryId)) return false
    return true
  })

  const visibleCategories = selectedMember
    ? categories.filter((c) => c.memberId === selectedMember)
    : categories

  // Compute stats for selected period
  const { start: periodStart, end: periodEnd } = getPeriodBounds(periodMode, periodOffset, firstDayOfWeek)

  const familyStats = (() => {
    const totalTasks = filteredTasks.length
    const completedTaskIds = new Set<string>()
    const partialTaskIds = new Set<string>()

    for (const task of filteredTasks) {
      const cadence = getActiveCadence(task.cadenceVersions, periodEnd)
      if (!cadence) continue
      const target = task.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)
      const taskLogs = filteredLogs.filter((l) => l.taskId === task.id)
      const achieved = task.taskType === 'duration'
        ? taskLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : taskLogs.filter((l) => l.completed).length
      if (achieved >= target && target > 0) completedTaskIds.add(task.id)
      else if (achieved > 0) partialTaskIds.add(task.id)
    }

    const perMember = (selectedMember ? members.filter((m) => m.id === selectedMember) : members).map((m) => {
      const mTasks = filteredTasks.filter((t) => t.assignedMembers.includes(m.id))
      const mLogs = filteredLogs.filter((l) => l.memberId === m.id)
      const done = mTasks.filter((t) => {
        const cadence = getActiveCadence(t.cadenceVersions, periodEnd)
        if (!cadence) return false
        const target = t.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)
        const achieved = t.taskType === 'duration'
          ? mLogs.filter((l) => l.taskId === t.id).reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
          : mLogs.filter((l) => l.taskId === t.id && l.completed).length
        return achieved >= target && target > 0
      }).length
      return { member: m, tasks: mTasks.length, done }
    })

    // Bar chart: days in period
    const days = eachDayOfInterval({ start: periodStart, end: periodEnd })
    const barData = days.map((d) => ({
      date: format(d, periodMode === 'month' ? 'd' : 'EEE d/M', { locale: he }),
      completions: filteredLogs.filter((l) => {
        const ld = parseISO(l.loggedAt)
        return isSameDay(ld, d) && (l.completed || (l.durationMinutes ?? 0) > 0)
      }).length,
    }))

    return { totalTasks, completed: completedTaskIds.size, partial: partialTaskIds.size, perMember, barData }
  })()

  const selectedTaskData = tasks.find((t) => t.id === selectedTask)

  function buildTaskChartData() {
    if (!selectedTaskData || taskLogs.length === 0) return []
    const days = eachDayOfInterval({
      start: new Date(Date.now() - (range === '7d' ? 6 : range === '30d' ? 29 : 89) * 86400000),
      end: new Date(),
    })
    return days.map((d) => {
      const dayLogs = taskLogs.filter((l) => isSameDay(parseISO(l.loggedAt), d))
      const value = selectedTaskData.taskType === 'duration'
        ? dayLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : dayLogs.filter((l) => l.completed).length
      const cadence = getActiveCadence(selectedTaskData.cadenceVersions, d)
      const target = selectedTaskData.taskType === 'duration'
        ? (cadence?.targetMinutes ?? 0) : (cadence?.targetCount ?? 0)
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

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-3">סטטיסטיקות</h1>
        <div className="flex gap-1 p-0.5 bg-gray-100 rounded-xl">
          {[
            { value: 'family', label: 'סיכום משפחתי' },
            { value: 'task', label: 'רמת משימה' },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => setTab(value as Tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Period navigation + member/category filter (family tab) */}
      {tab === 'family' && (
        <div className="px-4 pt-3 pb-2 space-y-2.5 bg-white border-b border-gray-100">
          {/* Period mode */}
          <div className="flex gap-1.5">
            {(['day', 'week', 'month'] as PeriodMode[]).map((mode) => (
              <button key={mode} onClick={() => changePeriodMode(mode)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  periodMode === mode ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'
                }`}
                style={periodMode === mode ? { background: 'linear-gradient(135deg, #0AB5B5, #06B6D4)' } : {}}>
                {mode === 'day' ? 'יום' : mode === 'week' ? 'שבוע' : 'חודש'}
              </button>
            ))}
          </div>

          {/* Period navigation */}
          <div className="flex items-center gap-3">
            <button onClick={() => changePeriod(-1)}
              className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-gray-800">
              {logsLoading
                ? <span className="inline-block h-4 w-24 bg-gray-200 rounded animate-pulse" />
                : periodLabel(periodMode, periodOffset, firstDayOfWeek)}
            </span>
            <button onClick={() => changePeriod(1)} disabled={periodOffset >= 0}
              className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-colors shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Member chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <MemberChip
              member={{ id: 'all', name: 'הכל', avatarColor: '#0AB5B5' }}
              selected={selectedMember === null}
              onClick={() => handleSelectMember(null)}
            />
            {members.map((m) => (
              <MemberChip key={m.id} member={m} selected={selectedMember === m.id}
                onClick={() => handleSelectMember(m.id)} />
            ))}
          </div>

          {/* Category chips */}
          {visibleCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleCategories.map((cat) => (
                <button key={cat.id} onClick={() => toggleCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                    selectedCategoryIds.includes(cat.id)
                      ? 'text-white border-transparent'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                  style={selectedCategoryIds.includes(cat.id)
                    ? { backgroundColor: cat.color, borderColor: cat.color }
                    : {}}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {tab === 'family' && (
          <>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
              </div>
            ) : (
              <>
                {/* Overview cards */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="הושלמו" value={`${familyStats.completed}/${familyStats.totalTasks}`} color="green" />
                  <StatCard label="חלקית" value={String(familyStats.partial)} color="amber" />
                  <StatCard label="השלמה" value={`${Math.round(familyStats.completed / Math.max(familyStats.totalTasks, 1) * 100)}%`} color="teal" />
                </div>

                {/* Bar chart */}
                {familyStats.barData.length > 0 && filteredLogs.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 mb-3">ביצועים</h2>
                    <ResponsiveContainer width="100%" height={150}>
                      <ComposedChart data={familyStats.barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                        <XAxis dataKey="date" tick={{ fontSize: periodMode === 'month' ? 9 : 10 }}
                          interval={periodMode === 'month' ? 6 : 0} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="completions" name="ביצועים" fill="#0AB5B5" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </section>
                )}

                {filteredLogs.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-4">אין ביצועים בתקופה זו</p>
                )}

                {/* Per member */}
                {familyStats.perMember.length > 0 && familyStats.totalTasks > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-gray-500 mb-3">לפי חבר משפחה</h2>
                    <div className="space-y-3">
                      {familyStats.perMember.map(({ member, tasks: t, done }: any) => (
                        <div key={member.id} className="flex items-center gap-3">
                          <span className="h-8 w-8 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0 overflow-hidden"
                            style={member.avatarUrl ? undefined : { backgroundColor: member.avatarColor }}>
                            {member.avatarUrl
                              ? <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                              : member.name?.[0]}
                          </span>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-800">{member.name}</span>
                              <span className="text-gray-500">{done}/{t}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{
                                  width: `${t > 0 ? (done / t) * 100 : 0}%`,
                                  background: 'linear-gradient(90deg, #0AB5B5, #06B6D4)',
                                }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {tab === 'task' && (
          <>
            {/* Task selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">בחר משימה</label>
              <select value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">-- בחר משימה --</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Range */}
            <div className="flex gap-2">
              {[
                { value: '7d', label: '7 ימים' },
                { value: '30d', label: '30 ימים' },
                { value: '3m', label: '3 חודשים' },
              ].map(({ value, label }) => (
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
                      <StatCard label="סה״כ דקות" value={String(taskLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0))} color="teal" />
                      <StatCard label="ממוצע ליום"
                        value={String(Math.round(taskLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0) / (range === '7d' ? 7 : range === '30d' ? 30 : 90)))}
                        color="purple" />
                    </>
                  ) : (
                    <>
                      <StatCard label="סה״כ ביצועים" value={String(taskLogs.filter((l) => l.completed).length)} color="teal" />
                      <StatCard label="לא בוצע" value={String(taskLogs.filter((l) => !l.completed).length)} color="amber" />
                    </>
                  )}
                </div>

                <section>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={buildTaskChartData()} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" name={selectedTaskData.taskType === 'duration' ? 'דקות' : 'ביצועים'} fill="#0AB5B5" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="4 2" dot={false} name="יעד" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </section>

                <section>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">רשומות</h2>
                  <div className="space-y-2">
                    {taskLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                        <span className={`mt-0.5 h-4 w-4 rounded-full shrink-0 ${
                          log.completed || (log.durationMinutes ?? 0) > 0 ? 'bg-teal-500' : 'bg-gray-300'
                        }`} />
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

function StatCard({ label, value, color }: { label: string; value: string; color: 'green' | 'amber' | 'teal' | 'purple' }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    teal: 'bg-teal-50 text-teal-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className={`rounded-2xl p-3 text-center ${colors[color]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  )
}
