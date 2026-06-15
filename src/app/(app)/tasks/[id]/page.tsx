'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithDetails, Member, LogEntry } from '@/types'
import { getActiveCadence } from '@/lib/progress'
import CategoryBadge from '@/components/ui/CategoryBadge'
import ExecutionModal from '@/components/tasks/ExecutionModal'

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}:${String(sec).padStart(2, '0')} דקות` : `${m} דקות`
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [task, setTask] = useState<TaskWithDetails | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showLog, setShowLog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({})

  // Edit log state
  const [editLogId, setEditLogId] = useState<string | null>(null)
  const [editCompleted, setEditCompleted] = useState(true)
  const [editMinutes, setEditMinutes] = useState('')
  const [editNotes, setEditNotes] = useState('')

  async function load() {
    const { data: t } = await supabase
      .from('tasks')
      .select('*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)')
      .eq('id', id)
      .single()
    if (!t) return

    const enriched: TaskWithDetails = {
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
    setTask(enriched)

    const { data: membersData } = await supabase
      .from('members')
      .select('*')
      .in('id', t.assigned_members ?? [])
    setMembers((membersData ?? []).map((m: any) => ({
      id: m.id,
      familyId: m.family_id,
      name: m.name,
      avatarColor: m.avatar_color,
      avatarUrl: m.avatar_url ?? null,
      isArchived: m.is_archived,
      createdAt: m.created_at,
    })))

    await loadLogs()
    setLoading(false)
  }

  async function loadLogs() {
    const { data: logsData } = await supabase
      .from('log_entries')
      .select('*')
      .eq('task_id', id)
      .order('logged_at', { ascending: false })
      .limit(20)

    const mapped = (logsData ?? []).map((l: any) => ({
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
    }))
    setLogs(mapped)

    const userIds = [...new Set(mapped.map((l) => l.loggedBy).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, display_name')
        .in('id', userIds)
      const profileMap: Record<string, string> = {}
      ;(profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.display_name })
      setUserProfiles(profileMap)
    }
  }

  useEffect(() => { load() }, [id])

  function startEdit(log: LogEntry) {
    setEditLogId(log.id)
    setEditCompleted(log.completed)
    setEditMinutes(String(log.durationMinutes ?? ''))
    setEditNotes(log.notes ?? '')
  }

  async function saveLog(logId: string) {
    await supabase.rpc('update_log_entry', {
      p_log_id: logId,
      p_completed: editCompleted,
      p_duration_minutes: editMinutes ? parseInt(editMinutes) : null,
      p_duration_seconds: null,
      p_notes: editNotes || null,
    })
    setEditLogId(null)
    await loadLogs()
  }

  async function deleteLog(logId: string) {
    await supabase.rpc('delete_log_entry', { p_log_id: logId })
    setLogs((prev) => prev.filter((l) => l.id !== logId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!task) return null

  const cadence = getActiveCadence(task.cadenceVersions, new Date())

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{task.title}</h1>
            {task.subcategory && (
              <p className="text-xs text-gray-400">{task.subcategory.name}</p>
            )}
          </div>
          <Link href={`/tasks/${id}/edit`} className="text-indigo-600 text-sm font-medium">ערוך</Link>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CategoryBadge category={task.category} />
          {members.map((m) => (
            <span key={m.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: m.avatarColor }} />
              {m.name}
            </span>
          ))}
          {task.endDate && (
            <span className="text-xs text-gray-400">
              מסתיים {new Date(task.endDate).toLocaleDateString('he-IL')}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 space-y-6 overflow-y-auto pb-28">

        {task.description && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">תיאור</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown>{task.description}</ReactMarkdown>
            </div>
          </section>
        )}

        {task.mediaAttachments.length > 0 && (
          <section className="space-y-2">
            {task.mediaAttachments.map((att) => {
              if (att.type === 'youtube') {
                const videoId = att.url.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
                return videoId ? (
                  <div key={att.id} className="rounded-xl overflow-hidden aspect-video bg-black">
                    <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                      className="w-full h-full" allowFullScreen title={att.title ?? 'סרטון'} />
                  </div>
                ) : null
              }
              if (att.type === 'image') {
                return <img key={att.id} src={att.url} alt={att.title ?? ''} className="rounded-xl w-full object-cover max-h-64" />
              }
              if (att.type === 'link') {
                return (
                  <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm text-indigo-600 font-medium">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {att.title ?? att.url}
                  </a>
                )
              }
              return null
            })}
          </section>
        )}

        {task.tags.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">תגיות</h2>
            <div className="flex gap-1.5 flex-wrap">
              {task.tags.map((tag) => (
                <span key={tag.id} className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-gray-200 text-gray-600">
                  {tag.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {cadence && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">יעד</h2>
              <Link href={`/tasks/${id}/cadence`} className="text-xs text-indigo-600 font-medium">עדכן יעד</Link>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-sm text-gray-700">
                {task.taskType === 'duration'
                  ? `${cadence.targetMinutes} דקות ל${cadence.per === 'day' ? 'יום' : cadence.per === 'week' ? 'שבוע' : 'חודש'}`
                  : `${cadence.targetCount} פעמים ל${cadence.per === 'day' ? 'יום' : cadence.per === 'week' ? 'שבוע' : 'חודש'}`}
              </p>
            </div>
          </section>
        )}

        {/* Execution history */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">ביצועים אחרונים</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">אין ביצועים עדיין</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl bg-gray-50 p-3">
                  {editLogId === log.id ? (
                    <div className="space-y-2">
                      {task.taskType === 'done_not_done' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={editCompleted}
                            onChange={(e) => setEditCompleted(e.target.checked)}
                            className="h-4 w-4 accent-indigo-600" />
                          <span className="text-sm text-gray-700">בוצע</span>
                        </label>
                      ) : (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">דקות</label>
                          <input type="number" value={editMinutes}
                            onChange={(e) => setEditMinutes(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">הערות</label>
                        <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                          rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveLog(log.id)}
                          className="flex-1 rounded-lg bg-indigo-600 text-white py-1.5 text-xs font-semibold">שמור</button>
                        <button onClick={() => setEditLogId(null)}
                          className="flex-1 rounded-lg border border-gray-200 text-gray-600 py-1.5 text-xs">ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-3.5 w-3.5 rounded-full shrink-0 ${
                        log.completed || log.durationMinutes || log.durationSeconds ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {log.durationSeconds != null
                            ? formatDuration(log.durationSeconds)
                            : log.durationMinutes
                              ? `${log.durationMinutes} דקות`
                              : log.completed ? 'בוצע' : 'לא בוצע'}
                          {(() => { const m = members.find(m => m.id === log.memberId); return m ? ` · ${m.name}` : '' })()}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(log.executionTime || log.loggedAt).toLocaleString('he-IL', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                          {userProfiles[log.loggedBy] && ` · נרשם ע"י ${userProfiles[log.loggedBy]}`}
                        </p>
                        {log.notes && <p className="text-xs text-gray-500 mt-0.5">{log.notes}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => startEdit(log)}
                          className="text-xs text-indigo-500 hover:text-indigo-700">ערוך</button>
                        <button onClick={() => deleteLog(log.id)}
                          className="text-xs text-gray-400 hover:text-red-500">מחק</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating log button */}
      <div className="fixed bottom-20 inset-x-0 max-w-md mx-auto px-4">
        <button onClick={() => setShowLog(true)}
          className="w-full rounded-2xl bg-indigo-600 text-white py-4 font-bold text-base shadow-lg shadow-indigo-200 active:scale-95 transition-all">
          + רשום ביצוע
        </button>
      </div>

      {showLog && (
        <ExecutionModal
          taskId={id}
          memberId={null}
          members={members}
          onClose={() => setShowLog(false)}
          onSaved={() => { setShowLog(false); loadLogs() }}
        />
      )}
    </div>
  )
}
