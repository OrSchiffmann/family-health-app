import type { LogEntry } from '@/types'

/** PostgREST caps a single response at 1000 rows and truncates *silently* —
 *  no error, no indication. Any query over log_entries can exceed that, so it
 *  must page explicitly or progress calculations quietly go wrong. */
const PAGE_SIZE = 1000

interface FetchOptions {
  /** ISO timestamp; filters on logged_at when provided */
  since?: string
  /** Columns to select — defaults to everything */
  columns?: string
}

export async function fetchLogRows(
  supabase: any,
  taskIds: string[],
  { since, columns = '*' }: FetchOptions = {},
): Promise<any[]> {
  if (taskIds.length === 0) return []

  const rows: any[] = []
  // Keyset paging: each page continues after the last row of the previous one,
  // instead of OFFSET — which makes the database re-read and discard every
  // earlier row, so each page got slower than the last. Needs id and
  // logged_at in the selected columns; falls back to OFFSET otherwise.
  const canKeyset = columns === '*' || (/\bid\b/.test(columns) && /\blogged_at\b/.test(columns))
  let last: { logged_at: string; id: string } | null = null
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from('log_entries').select(columns).in('task_id', taskIds)
    if (since) query = query.gte('logged_at', since)
    if (canKeyset && last) {
      query = query.or(
        `logged_at.lt."${last.logged_at}",and(logged_at.eq."${last.logged_at}",id.lt.${last.id})`,
      )
    }

    // Deterministic order so paging can't skip or repeat rows
    query = query
      .order('logged_at', { ascending: false })
      .order('id', { ascending: false })
    const { data, error } = await (canKeyset
      ? query.limit(PAGE_SIZE)
      : query.range(from, from + PAGE_SIZE - 1))

    if (error || !data) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    last = data[data.length - 1]
  }
  return rows
}

export function mapLogRow(l: any): LogEntry {
  return {
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
  }
}

/** Convenience wrapper returning mapped LogEntry objects. */
export async function fetchLogs(
  supabase: any,
  taskIds: string[],
  options?: FetchOptions,
): Promise<LogEntry[]> {
  return (await fetchLogRows(supabase, taskIds, options)).map(mapLogRow)
}

/** Index logs by task id in a single pass */
export function groupByTask<T extends { taskId: string }>(logs: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const l of logs) {
    const list = map.get(l.taskId)
    if (list) list.push(l)
    else map.set(l.taskId, [l])
  }
  return map
}
