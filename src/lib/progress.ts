import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns'
import type { TaskWithDetails, CadenceProgress, LogEntry, CadenceVersion } from '@/types'
import type { TimeWindow } from '@/components/feed/FilterBar'

export function getWindowBounds(window: TimeWindow, firstDayOfWeek: 0 | 1 | 6 = 0): [Date, Date] {
  const now = new Date()
  const weekOptions = { weekStartsOn: firstDayOfWeek as 0 | 1 | 6 }
  switch (window) {
    case 'today': return [startOfDay(now), endOfDay(now)]
    case 'week': return [startOfWeek(now, weekOptions), endOfWeek(now, weekOptions)]
    case 'month': return [startOfMonth(now), endOfMonth(now)]
    case 'all': return [new Date(0), new Date(9999, 11, 31)]
  }
}

export function getActiveCadence(versions: CadenceVersion[], date: Date): CadenceVersion | null {
  if (!versions || versions.length === 0) return null
  const sorted = [...versions].sort(
    (a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime()
  )
  let active: CadenceVersion | null = null
  for (const v of sorted) {
    if (new Date(v.effectiveFrom) <= date) active = v
  }
  return active
}

export function computeProgress(
  task: TaskWithDetails,
  memberId: string | null,
  timeWindow: TimeWindow,
  logs?: LogEntry[]
): CadenceProgress {
  const cadence = getActiveCadence(task.cadenceVersions, new Date())
  if (!cadence) {
    return { target: 0, achieved: 0, per: 'week', taskType: task.taskType }
  }

  const target =
    task.taskType === 'duration' ? (cadence.targetMinutes ?? 0) : (cadence.targetCount ?? 0)

  if (!logs || logs.length === 0) {
    return { target, achieved: 0, per: cadence.per, taskType: task.taskType }
  }

  const [start, end] = getWindowBounds(timeWindow)
  const relevantLogs = logs.filter((l) => {
    const d = new Date(l.loggedAt)
    if (d < start || d > end) return false
    if (memberId && l.memberId !== memberId) return false
    return true
  })

  const achieved =
    task.taskType === 'duration'
      ? Math.round(relevantLogs.reduce((sum, l) => {
          const mins = l.durationSeconds != null ? l.durationSeconds / 60 : (l.durationMinutes ?? 0)
          return sum + mins
        }, 0))
      : relevantLogs.filter((l) => l.completed).length

  return { target, achieved, per: cadence.per, taskType: task.taskType }
}
