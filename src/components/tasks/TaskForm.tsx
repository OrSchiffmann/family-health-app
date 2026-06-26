'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Member, Category, Tag, TaskType, CadencePer, Attachment, AttachmentType } from '@/types'

interface Props {
  familyId: string
  members: Member[]
  categories: Category[]
  tags: Tag[]
  taskId?: string
  initialAttachments?: Attachment[]
  defaults?: Partial<FormState>
  initialStep?: number
}

interface FormState {
  title: string
  assignedMembers: string[]
  categoryId: string
  subcategoryId: string
  description: string
  taskType: TaskType
  targetCount: string
  targetMinutes: string
  per: CadencePer
  endDate: string
  selectedTags: string[]
}

interface AttachmentDraft {
  id?: string
  type: AttachmentType
  url: string
  title: string
}

function detectType(url: string): AttachmentType {
  if (/youtu(?:be\.com\/watch\?v=|\.be\/)/.test(url)) return 'youtube'
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url)) return 'image'
  return 'link'
}

const STEPS = ['פרטים בסיסיים', 'תיאור וקבצים', 'סוג ויעד', 'תאריך סיום', 'תגיות']

export default function TaskForm({ familyId, members, categories, tags, taskId, initialAttachments, defaults, initialStep }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(initialStep ?? 0)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<FormState>({
    title: '',
    assignedMembers: [],
    categoryId: '',
    subcategoryId: '',
    description: '',
    taskType: 'done_not_done',
    targetCount: '3',
    targetMinutes: '30',
    per: 'week',
    endDate: '',
    selectedTags: [],
    ...defaults,
  })

  const [attachments, setAttachments] = useState<AttachmentDraft[]>(
    (initialAttachments ?? []).map((a) => ({
      id: a.id,
      type: a.type,
      url: a.url,
      title: a.title ?? '',
    }))
  )
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleMember(id: string) {
    const newMembers = form.assignedMembers.includes(id)
      ? form.assignedMembers.filter((m) => m !== id)
      : [...form.assignedMembers, id]
    const stillValid = form.categoryId
      ? categories.some((c) => c.id === form.categoryId && newMembers.includes(c.memberId))
      : true
    setForm((prev) => ({
      ...prev,
      assignedMembers: newMembers,
      categoryId: stillValid ? prev.categoryId : '',
      subcategoryId: stillValid ? prev.subcategoryId : '',
    }))
  }

  function toggleTag(id: string) {
    update('selectedTags',
      form.selectedTags.includes(id)
        ? form.selectedTags.filter((t) => t !== id)
        : [...form.selectedTags, id]
    )
  }

  function addAttachment() {
    const url = newUrl.trim()
    if (!url) return
    setAttachments((prev) => [...prev, { type: detectType(url), url, title: newTitle.trim() }])
    setNewUrl('')
    setNewTitle('')
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const visibleCategories = form.assignedMembers.length > 0
    ? categories.filter((c) => form.assignedMembers.includes(c.memberId))
    : categories
  const selectedCategory = categories.find((c) => c.id === form.categoryId)

  function canProceed() {
    if (step === 0) return form.title.trim() && form.categoryId && form.assignedMembers.length > 0
    if (step === 2) {
      if (form.taskType === 'done_not_done') return parseInt(form.targetCount) > 0
      return parseInt(form.targetMinutes) > 0
    }
    return true
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const taskData = {
      family_id: familyId,
      title: form.title.trim(),
      assigned_members: form.assignedMembers,
      category_id: form.categoryId,
      subcategory_id: form.subcategoryId || null,
      task_type: form.taskType,
      description: form.description || null,
      end_date: form.endDate || null,
      created_by: user.id,
    }

    let savedTaskId = taskId

    if (taskId) {
      await supabase.from('tasks').update(taskData).eq('id', taskId)
    } else {
      const { data } = await supabase.from('tasks').insert(taskData).select().single()
      savedTaskId = data?.id
    }

    if (!savedTaskId) { setSaving(false); return }

    // Always upsert cadence — insert new version (effective today) for both create and edit
    await supabase.from('cadence_versions').insert({
      task_id: savedTaskId,
      effective_from: new Date().toISOString().split('T')[0],
      target_count: form.taskType === 'done_not_done' ? parseInt(form.targetCount) : null,
      target_minutes: form.taskType === 'duration' ? parseInt(form.targetMinutes) : null,
      per: form.per,
    })

    // Sync tags
    await supabase.from('task_tags').delete().eq('task_id', savedTaskId)
    if (form.selectedTags.length > 0) {
      await supabase.from('task_tags').insert(
        form.selectedTags.map((tagId) => ({ task_id: savedTaskId, tag_id: tagId }))
      )
    }

    // Sync attachments
    await supabase.from('attachments').delete().eq('task_id', savedTaskId)
    if (attachments.length > 0) {
      await supabase.from('attachments').insert(
        attachments.map((a) => ({
          task_id: savedTaskId,
          type: a.type,
          url: a.url,
          title: a.title || null,
          thumbnail_url: null,
        }))
      )
    }

    setSaving(false)
    router.push(`/tasks/${savedTaskId}`)
  }

  const attachmentTypeLabel: Record<AttachmentType, string> = {
    youtube: 'YouTube',
    image: 'תמונה',
    link: 'לינק',
    video: 'וידאו',
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => step > 0 ? setStep(step - 1) : router.back()}
            className="text-gray-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{taskId ? 'ערוך משימה' : 'משימה חדשה'}</h1>
            <p className="text-xs text-gray-400">{STEPS[step]}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-teal-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-5 overflow-y-auto pb-28">

        {/* Step 1: Basics */}
        {step === 0 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">כותרת *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="שם המשימה"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">מבצעים *</label>
              <div className="flex gap-2 flex-wrap">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-all ${
                      form.assignedMembers.includes(m.id)
                        ? 'text-white border-transparent'
                        : 'border-gray-200 text-gray-600'
                    }`}
                    style={form.assignedMembers.includes(m.id) ? { backgroundColor: m.avatarColor } : {}}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">קטגוריה *</label>
              {form.assignedMembers.length === 0 && (
                <p className="text-xs text-gray-400 mb-2">בחר/י מבצע כדי לראות קטגוריות</p>
              )}
              <div className="space-y-1.5">
                {visibleCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { update('categoryId', cat.id); update('subcategoryId', '') }}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-4 py-3 border transition-all text-right ${
                      form.categoryId === cat.id
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedCategory && selectedCategory.subcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תת-קטגוריה (אופציונלי)</label>
                <div className="flex gap-2 flex-wrap">
                  {selectedCategory.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => update('subcategoryId', form.subcategoryId === sub.id ? '' : sub.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                        form.subcategoryId === sub.id
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 2: Description + Attachments */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">תיאור (Markdown, אופציונלי)</label>
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={6}
                placeholder="תאר את המשימה... תומך **עיצוב** _markdown_"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono resize-none outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-gray-400 mt-1">תומך בעיצוב Markdown: **מודגש**, _נטוי_, רשימות</p>
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">תמונות ולינקים</label>

              {/* Existing attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        {attachmentTypeLabel[att.type]}
                      </span>
                      <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">
                        {att.title || att.url}
                      </span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new attachment */}
              <div className="space-y-2 rounded-xl border border-dashed border-gray-200 p-3">
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAttachment()}
                  placeholder="הדבק לינק — תמונה, YouTube או אתר"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                  dir="ltr"
                />
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="כותרת (אופציונלי)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={addAttachment}
                  disabled={!newUrl.trim()}
                  className="w-full rounded-lg bg-gray-100 text-gray-700 py-2 text-sm font-medium disabled:opacity-40 hover:bg-gray-200 transition-colors"
                >
                  + הוסף
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Type & Cadence */}
        {step === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">סוג משימה *</label>
              <div className="flex rounded-xl border border-gray-200 p-0.5 gap-0.5">
                {[
                  { value: 'done_not_done', label: 'בוצע / לא בוצע' },
                  { value: 'duration', label: 'משך זמן' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => update('taskType', value as TaskType)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
                      form.taskType === value ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {form.taskType === 'duration' ? 'יעד דקות *' : 'מספר פעמים *'}
              </label>
              <input
                type="number"
                min={1}
                value={form.taskType === 'duration' ? form.targetMinutes : form.targetCount}
                onChange={(e) => update(form.taskType === 'duration' ? 'targetMinutes' : 'targetCount', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">תדירות *</label>
              <div className="flex gap-2">
                {[
                  { value: 'day', label: 'ליום' },
                  { value: 'week', label: 'לשבוע' },
                  { value: 'month', label: 'לחודש' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => update('per', value as CadencePer)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition-all ${
                      form.per === value
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 4: End date */}
        {step === 3 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">תאריך סיום (אופציונלי)</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => update('endDate', e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-2">לאחר תאריך זה, המשימה תועבר לארכיון אוטומטית</p>
          </div>
        )}

        {/* Step 5: Tags */}
        {step === 4 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">תגיות (אופציונלי)</label>
            {tags.length === 0 ? (
              <p className="text-sm text-gray-400">אין תגיות עדיין. צרו תגיות בהגדרות.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                      form.selectedTags.includes(tag.id)
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-20 inset-x-0 max-w-md mx-auto px-4">
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="w-full rounded-2xl bg-teal-600 text-white py-4 font-bold text-base disabled:opacity-50 active:scale-95 transition-all"
          >
            הבא
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-green-600 text-white py-4 font-bold text-base disabled:opacity-50 active:scale-95 transition-all"
          >
            {saving ? 'שומר...' : taskId ? 'שמור שינויים' : 'צור משימה'}
          </button>
        )}
      </div>
    </div>
  )
}
