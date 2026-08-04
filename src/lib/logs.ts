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
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from('log_entries').select(columns).in('task_id', taskIds)
    if (since) query = query.gte('logged_at', since)

    const { data, error } = await query
      // Deterministic order so paging can't skip or repeat rows
      .order('logged_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error || !data) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
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
