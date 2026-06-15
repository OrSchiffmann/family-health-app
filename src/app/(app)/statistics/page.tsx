'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line,
} from 'recharts'
import { format, subDays, subMonths, eachDayOfInterval, parseISO } from 'date-fns'
import { he } from 'date-fns/locale'
import type { Member, Category, TaskWithDetails, LogEntry, CadenceVersion } from '@/types'
import { getActiveCadence } from '@/lib/progress'

type Tab = 'family' | 'task'
type Range = '7d' | '30d' | '3m'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

export default function StatisticsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('family')
  const [members, setMembers] = useState<Member[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [selectedTask, setSelectedTask] = useState<string>('')
  const [taskLogs, setTaskLogs] = useState<LogEntry[]>([])
  const [range, setRange] = useState<Range>('30d')
  const [familyStats, setFamilyStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: fu } = await supabase
        .from('family_users').select('family_id').eq('user_id', user.id).limit(1).single()
      if (!fu) return

      const [{ data: membersData }, { data: tasksData }] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', fu.family_id),
        supabase.from('tasks').select('*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)')
          .eq('family_id', fu.family_id),
      ])

      setMembers((membersData ?? []).map((m: any) => ({
        id: m.id, familyId: m.family_id, name: m.name,
        avatarColor: m.avatar_color, isArchived: m.is_archived, createdAt: m.created_at,
      })))

      const cats: Category[] = []
      const enriched = (tasksData ?? []).map((t: any) => {
        if (t.categories && !cats.find((c: Category) => c.id === t.categories.id)) {
          cats.push({ ...t.categories, subcategories: [] })
        }
        return {
          ...t,
          assignedMembers: t.assigned_members, categoryId: t.category_id,
          subcategoryId: t.subcategory_id, taskType: t.task_type,
          endDate: t.end_date, isArchived: t.is_archived,
          createdAt: t.created_at, createdBy: t.created_by,
          category: t.categories, subcategory: t.subcategories,
          cadenceVersions: t.cadence_versions, mediaAttachments: t.attachments,
        }
      })

      setCategories(cats)
      setTasks(enriched)
      setLoading(false)

      // Compute family stats
      const since = subDays(new Date(), 30)
      const { data: logs } = await supabase
        .from('log_entries').select('*')
        .in('task_id', (tasksData ?? []).map((t: any) => t.id))
        .gte('logged_at', since.toISOString())

      const mappedLogs = (logs ?? []).map((l: any) => ({
        id: l.id, taskId: l.task_id, memberId: l.member_id, loggedBy: l.logged_by,
        loggedAt: l.logged_at, executionTime: l.execution_time,
        cadenceVersionId: l.cadence_version_id, completed: l.completed,
        durationMinutes: l.duration_minutes, durationSeconds: l.duration_seconds,
        notes: l.notes, tags: [],
      }))
      computeFamilyStats(enriched, mappedLogs, membersData ?? [])
    }
    load()
  }, [])

  function computeFamilyStats(taskList: TaskWithDetails[], logs: LogEntry[], memberList: Member[]) {
    const totalTasks = taskList.filter((t) => !t.isArchived).length
    const completedTaskIds = new Set<string>()
    const partialTaskIds = new Set<string>()

    for (const task of taskList.filter((t) => !t.isArchived)) {
      const cadence = getActiveCadence(task.cadenceVersions, new Date())
      if (!cadence) continue
      const target = task.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)
      const achieved = task.taskType === 'duration'
        ? logs.filter((l) => l.taskId === task.id).reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : logs.filter((l) => l.taskId === task.id && l.completed).length
      if (achieved >= target && target > 0) completedTaskIds.add(task.id)
      else if (achieved > 0) partialTaskIds.add(task.id)
    }

    const perMember = memberList.map((m) => {
      const mTasks = taskList.filter((t) => t.assignedMembers.includes(m.id) && !t.isArchived)
      const mLogs = logs.filter((l) => l.memberId === m.id)
      const done = mTasks.filter((t) => {
        const cadence = getActiveCadence(t.cadenceVersions, new Date())
        if (!cadence) return false
        const target = t.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)
        const achieved = t.taskType === 'duration'
          ? mLogs.filter((l) => l.taskId === t.id).reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
          : mLogs.filter((l) => l.taskId === t.id && l.completed).length
        return achieved >= target && target > 0
      }).length
      return { member: m, tasks: mTasks.length, done }
    })

    // Bar chart: completions per day (last 14 days)
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() })
    const barData = days.map((d) => ({
      date: format(d, 'd/M'),
      completions: logs.filter((l) => {
        const ld = parseISO(l.loggedAt)
        return ld.toDateString() === d.toDateString() && (l.completed || (l.durationMinutes ?? 0) > 0)
      }).length,
    }))

    setFamilyStats({ totalTasks, completed: completedTaskIds.size, partial: partialTaskIds.size, perMember, barData })
  }

  async function loadTaskStats(tid: string) {
    const since =
      range === '7d' ? subDays(new Date(), 7)
      : range === '30d' ? subDays(new Date(), 30)
      : subMonths(new Date(), 3)

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

  useEffect(() => {
    if (tab === 'task' && selectedTask) loadTaskStats(selectedTask)
  }, [selectedTask, range, tab])

  const selectedTaskData = tasks.find((t) => t.id === selectedTask)

  function buildTaskChartData() {
    if (!selectedTaskData || taskLogs.length === 0) return []
    const days = eachDayOfInterval({
      start: subDays(new Date(), range === '7d' ? 6 : range === '30d' ? 29 : 89),
      end: new Date(),
    })
    return days.map((d) => {
      const dayLogs = taskLogs.filter((l) => parseISO(l.loggedAt).toDateString() === d.toDateString())
      const value = selectedTaskData.taskType === 'duration'
        ? dayLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0)
        : dayLogs.filter((l) => l.completed).length
      const cadence = getActiveCadence(selectedTaskData.cadenceVersions, d)
      const target = selectedTaskData.taskType === 'duration'
        ? (cadence?.targetMinutes ?? 0) : (cadence?.targetCount ?? 0)
      return { date: format(d, 'd/M'), value, target }
    })
  }

  // Tag distribution
  function buildTagPieData() {
    const counts: Record<string, { name: string; count: number }> = {}
    for (const log of taskLogs) {
      // tag counting would require join — simplified here
    }
    return Object.values(counts)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
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

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {tab === 'family' && familyStats && (
          <>
            {/* Overview cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="הושלמו" value={`${familyStats.completed}/${familyStats.totalTasks}`} color="green" />
              <StatCard label="חלקית" value={String(familyStats.partial)} color="amber" />
              <StatCard label="השבוע" value={`${Math.round(familyStats.completed / Math.max(familyStats.totalTasks, 1) * 100)}%`} color="indigo" />
            </div>

            {/* Bar chart */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">ביצועים - 14 ימים אחרונים</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={familyStats.barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="completions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            {/* Per member */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">לפי חבר</h2>
              <div className="space-y-3">
                {familyStats.perMember.map(({ member, tasks: t, done }: any) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: member.avatarColor }}>
                      {member.name[0]}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800">{member.name}</span>
                        <span className="text-gray-500">{done}/{t}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${t > 0 ? (done / t) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'task' && (
          <>
            {/* Task selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">בחר משימה</label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
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
                    range === value ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {selectedTaskData && taskLogs.length > 0 && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedTaskData.taskType === 'duration' ? (
                    <>
                      <StatCard label="סה״כ דקות" value={String(taskLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0))} color="indigo" />
                      <StatCard label="ממוצע ליום"
                        value={String(Math.round(taskLogs.reduce((s, l) => s + (l.durationMinutes ?? 0), 0) / (range === '7d' ? 7 : range === '30d' ? 30 : 90)))}
                        color="purple" />
                    </>
                  ) : (
                    <>
                      <StatCard label="סה״כ ביצועים" value={String(taskLogs.filter((l) => l.completed).length)} color="indigo" />
                      <StatCard label="לא בוצע" value={String(taskLogs.filter((l) => !l.completed).length)} color="amber" />
                    </>
                  )}
                </div>

                {/* Chart */}
                <section>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={buildTaskChartData()} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" name={selectedTaskData.taskType === 'duration' ? 'דקות' : 'ביצועים'} fill="#6366f1" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="4 2" dot={false} name="יעד" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </section>

                {/* Log list */}
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">רשומות</h2>
                  <div className="space-y-2">
                    {taskLogs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                        <span className={`mt-0.5 h-4 w-4 rounded-full shrink-0 ${
                          log.completed || (log.durationMinutes ?? 0) > 0 ? 'bg-green-500' : 'bg-gray-300'
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

function StatCard({ label, value, color }: { label: string; value: string; color: 'green' | 'amber' | 'indigo' | 'purple' }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    purple: 'bg-purple-50 text-purple-700',
  }
  return (
    <div className={`rounded-2xl p-3 text-center ${colors[color]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  )
}
