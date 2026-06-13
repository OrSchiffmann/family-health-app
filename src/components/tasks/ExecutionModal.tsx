'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Member, TaskWithDetails } from '@/types'
import { getActiveCadence } from '@/lib/progress'

interface Props {
  taskId: string
  memberId: string | null
  members: Member[]
  onClose: () => void
  onSaved: () => void
}

const TIMER_KEY = 'active_timer'

export default function ExecutionModal({ taskId, memberId, members, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [task, setTask] = useState<TaskWithDetails | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState(memberId ?? '')
  const [completed, setCompleted] = useState(true)
  const [notes, setNotes] = useState('')
  const [executionTime, setExecutionTime] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [timerMode, setTimerMode] = useState(false)
  const [manualMinutes, setManualMinutes] = useState('')
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tasks')
        .select('*, categories(*), subcategories(*), cadence_versions(*), tags(*), attachments(*)')
        .eq('id', taskId)
        .single()
      if (data) {
        setTask({
          ...data,
          assignedMembers: data.assigned_members,
          categoryId: data.category_id,
          subcategoryId: data.subcategory_id,
          taskType: data.task_type,
          endDate: data.end_date,
          isArchived: data.is_archived,
          createdAt: data.created_at,
          createdBy: data.created_by,
          category: data.categories,
          subcategory: data.subcategories,
          cadenceVersions: (data.cadence_versions ?? []).map((v: any) => ({
            id: v.id,
            taskId: v.task_id,
            effectiveFrom: v.effective_from,
            targetCount: v.target_count,
            targetMinutes: v.target_minutes,
            per: v.per,
          })),
          mediaAttachments: data.attachments,
        })
        if (!selectedMemberId && data.assigned_members?.length > 0) {
          setSelectedMemberId(data.assigned_members[0])
        }
      }
    }
    load()

    // Restore timer from localStorage
    const saved = localStorage.getItem(TIMER_KEY)
    if (saved) {
      const { id, startedAt } = JSON.parse(saved)
      if (id === taskId) {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000)
        setTimerSeconds(elapsed)
        setTimerRunning(true)
        setTimerMode(true)
      }
    }
  }, [taskId])

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timerRunning])

  function startTimer() {
    localStorage.setItem(TIMER_KEY, JSON.stringify({ id: taskId, startedAt: Date.now() - timerSeconds * 1000 }))
    setTimerRunning(true)
  }

  function pauseTimer() {
    setTimerRunning(false)
    localStorage.removeItem(TIMER_KEY)
  }

  function stopTimer() {
    setTimerRunning(false)
    localStorage.removeItem(TIMER_KEY)
  }

  function formatTimer(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  async function handleSubmit() {
    if (!task || !selectedMemberId) return
    setSaving(true)
    setError('')

    const cadence = getActiveCadence(task.cadenceVersions, new Date())
    if (!cadence) { setSaving(false); return }

    const useTimerSeconds = task.taskType === 'duration' && timerMode && timerSeconds > 0
    const { error: saveErr } = await supabase.rpc('log_execution', {
      p_task_id: taskId,
      p_member_id: selectedMemberId,
      p_cadence_version_id: cadence.id,
      p_completed: task.taskType === 'done_not_done' ? completed : true,
      p_duration_minutes: task.taskType === 'duration' && !useTimerSeconds ? parseInt(manualMinutes || '0', 10) : null,
      p_duration_seconds: useTimerSeconds ? timerSeconds : null,
      p_notes: notes || null,
      p_execution_time: executionTime || new Date().toISOString(),
      p_tag_ids: selectedTags,
    })

    setSaving(false)
    if (saveErr) {
      setError('שגיאה בשמירת הביצוע')
    } else {
      onSaved()
    }
  }

  const assignedMembers = members.filter((m) => task?.assignedMembers.includes(m.id))
  const cadence = task ? getActiveCadence(task.cadenceVersions, new Date()) : null
  const targetMinutes = cadence?.targetMinutes ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto -mt-2 mb-1" />

        <h2 className="text-lg font-bold text-gray-900">
          {task?.title ?? 'רישום ביצוע'}
        </h2>

        {/* Member selector (if multiple) */}
        {assignedMembers.length > 1 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">מבצע</label>
            <div className="flex gap-2 flex-wrap">
              {assignedMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    selectedMemberId === m.id ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'
                  }`}
                  style={selectedMemberId === m.id ? { backgroundColor: m.avatarColor } : {}}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Done/not done */}
        {task?.taskType === 'done_not_done' && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600 accent-indigo-600"
            />
            <span className="font-medium text-gray-800">בוצע</span>
          </label>
        )}

        {/* Duration */}
        {task?.taskType === 'duration' && (
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex rounded-xl border border-gray-200 p-0.5 gap-0.5">
              {['טיימר', 'ידני'].map((label, i) => (
                <button
                  key={i}
                  onClick={() => setTimerMode(i === 0)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                    timerMode === (i === 0) ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {timerMode ? (
              <div className="text-center space-y-3">
                <div className="text-5xl font-mono font-bold text-gray-900 tabular-nums">
                  {formatTimer(timerSeconds)}
                </div>
                {targetMinutes > 0 && (
                  <p className="text-xs text-gray-400">יעד: {targetMinutes} דקות</p>
                )}
                <div className="flex gap-2 justify-center">
                  {!timerRunning ? (
                    <button onClick={startTimer} className="rounded-full bg-indigo-600 text-white px-6 py-2.5 text-sm font-semibold">
                      {timerSeconds === 0 ? 'התחל' : 'המשך'}
                    </button>
                  ) : (
                    <button onClick={pauseTimer} className="rounded-full bg-amber-500 text-white px-6 py-2.5 text-sm font-semibold">
                      השהה
                    </button>
                  )}
                  {timerSeconds > 0 && (
                    <button onClick={stopTimer} className="rounded-full border border-gray-200 text-gray-600 px-6 py-2.5 text-sm font-semibold">
                      עצור
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">דקות</label>
                <input
                  type="number"
                  min={1}
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="הכנס מספר דקות"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        )}

        {/* When */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">מתי בוצע? (אופציונלי)</label>
          <input
            type="datetime-local"
            value={executionTime}
            onChange={(e) => setExecutionTime(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">הערות (אופציונלי)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="הערות לביצוע..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tags */}
        {task?.tags && task.tags.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">תגיות</label>
            <div className="flex gap-2 flex-wrap">
              {task.tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() =>
                    setSelectedTags((prev) =>
                      prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                    selectedTags.includes(tag.id)
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || (!selectedMemberId)}
          className="w-full rounded-xl bg-indigo-600 text-white py-3.5 font-semibold text-base disabled:opacity-60 active:scale-95 transition-all"
        >
          {saving ? 'שומר...' : 'שמור ביצוע'}
        </button>
      </div>
    </div>
  )
}
