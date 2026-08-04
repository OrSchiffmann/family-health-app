import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns'
import type { TaskWithDetails, CadenceProgress, LogEntry, CadenceVersion, CadencePer } from '@/types'

export function getWindowBounds(per: CadencePer, firstDayOfWeek: 0 | 1 | 6 = 0): [Date, Date] {
  const now = new Date()
  const weekOptions = { weekStartsOn: firstDayOfWeek as 0 | 1 | 6 }
  switch (per) {
    case 'day': return [startOfDay(now), endOfDay(now)]
    case 'week': return [startOfWeek(now, weekOptions), endOfWeek(now, weekOptions)]
    case 'month': return [startOfMonth(now), endOfMonth(now)]
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

// Consecutive days (ending today or yesterday) where the member logged
// at least `requiredPerDay` completions. Powers the 🔥 streak badge.
export function computeDayStreak(logs: LogEntry[], memberId: string | null, requiredPerDay = 1): number {
  const counts: Record<string, number> = {}
  for (const l of logs) {
    if (!l.completed) continue
    if (memberId && l.memberId !== memberId) continue
    const d = new Date(l.executionTime ?? l.loggedAt)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    counts[key] = (counts[key] ?? 0) + 1
  }
  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  let streak = 0
  const cursor = new Date()
  // Today counts if already done, but an unfinished today doesn't break the streak
  if ((counts[keyOf(cursor)] ?? 0) >= requiredPerDay) streak++
  cursor.setDate(cursor.getDate() - 1)
  while ((counts[keyOf(cursor)] ?? 0) >= requiredPerDay) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeProgress(
  task: TaskWithDetails,
  memberId: string | null,
  logs?: LogEntry[],
  firstDayOfWeek: 0 | 1 | 6 = 0
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

  const [start, end] = getWindowBounds(cadence.per, firstDayOfWeek)
  const relevantLogs = logs.filter((l) => {
    // Use executionTime for retroactive entries, fall back to loggedAt
    const d = new Date(l.executionTime ?? l.loggedAt)
    if (d < start || d > end) return false
    if (memberId && l.memberId !== memberId) return false
    return true
  })

  let achieved: number
  if (task.taskType === 'duration') {
    achieved = Math.round(relevantLogs.reduce((sum, l) => {
      const mins = l.durationSeconds != null ? l.durationSeconds / 60 : (l.durationMinutes ?? 0)
      return sum + mins
    }, 0))
  } else if (cadence.timesPerDay && cadence.per !== 'day') {
    // Compound cadence (X/day across Y days): count days meeting the daily quota.
    // Only meaningful for week/month — for a daily cadence targetCount already IS
    // the per-day quota, and counting days would cap achieved at 1 vs a target of N.
    const byDay: Record<string, number> = {}
    for (const l of relevantLogs.filter((l) => l.completed)) {
      // Local date key — a UTC key would push after-midnight logs into the previous day
      const d = new Date(l.executionTime ?? l.loggedAt)
      const day = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      byDay[day] = (byDay[day] ?? 0) + 1
    }
    achieved = Object.values(byDay).filter((c) => c >= cadence.timesPerDay!).length
  } else {
    achieved = relevantLogs.filter((l) => l.completed).length
  }

  // Only report timesPerDay when it actually drives the calculation, so the UI
  // doesn't label a daily task's progress as "days"
  const effectiveTimesPerDay = cadence.per === 'day' ? null : cadence.timesPerDay

  return { target, achieved, per: cadence.per, taskType: task.taskType, timesPerDay: effectiveTimesPerDay }
}
