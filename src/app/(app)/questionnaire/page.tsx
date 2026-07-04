'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Member } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface ExerciseCategory {
  id: string
  name: string
  nameEn: string | null
  target: 'toddler' | 'adult'
  bodyArea: string | null
  color: string
  emoji: string
  sortOrder: number
}

interface Exercise {
  id: string
  categoryId: string
  name: string
  nameEn: string | null
  description: string | null
  instructions: string | null
  target: 'toddler' | 'adult'
  ageMinMonths: number | null
  ageMaxMonths: number | null
  bodyArea: string | null
  youtubeSearchQuery: string | null
  suggestedDurationMinutes: number | null
  suggestedFrequencyCount: number
  suggestedFrequencyPer: 'day' | 'week'
  difficulty: string
  category?: ExerciseCategory
}

type Step = 'member' | 'type' | 'exercises' | 'done'

const BODY_AREAS = [
  { key: 'neck',         label: 'צוואר',        emoji: '🦴' },
  { key: 'pelvic_floor', label: 'רצפת אגן',     emoji: '⚕️' },
  { key: 'back',         label: 'גב',            emoji: '🔙' },
  { key: 'knee',         label: 'ברכיים',        emoji: '🦵' },
]

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'קל', medium: 'בינוני', hard: 'מאתגר',
}

const FREQ_LABEL = (count: number, per: string) => {
  const perHe = per === 'day' ? 'ביום' : 'בשבוע'
  return `${count}× ${perHe}`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function QuestionnairePage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]                       = useState<Step>('member')
  const [members, setMembers]                 = useState<Member[]>([])
  const [familyId, setFamilyId]               = useState('')
  const [userId, setUserId]                   = useState('')
  const [selectedMember, setSelectedMember]   = useState<Member | null>(null)
  const [targetType, setTargetType]           = useState<'toddler' | 'adult' | null>(null)
  const [ageMonths, setAgeMonths]             = useState(12)
  const [selectedBodyAreas, setSelectedBodyAreas] = useState<string[]>([])
  const [exercises, setExercises]             = useState<Exercise[]>([])
  const [categories, setCategories]           = useState<ExerciseCategory[]>([])
  const [selectedIds, setSelectedIds]         = useState<Set<string>>(new Set())
  const [expanded, setExpanded]               = useState<string | null>(null)
  const [loadingEx, setLoadingEx]             = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [addedCount, setAddedCount]           = useState(0)

  // Load members on mount
  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: fu } = await supabase.from('family_users').select('family_id').eq('user_id', user.id).single()
      if (!fu) return
      setFamilyId(fu.family_id)
      const { data: membersData } = await supabase
        .from('members').select('*').eq('family_id', fu.family_id).eq('is_archived', false)
      setMembers((membersData ?? []).map((m: any) => ({
        id: m.id, familyId: m.family_id, name: m.name,
        avatarColor: m.avatar_color, avatarUrl: m.avatar_url ?? null,
        isArchived: m.is_archived, createdAt: m.created_at,
      })))
    })()
  }, [])

  // ── Helpers ──

  function mapCategory(c: any): ExerciseCategory {
    return {
      id: c.id, name: c.name, nameEn: c.name_en,
      target: c.target, bodyArea: c.body_area,
      color: c.color ?? '#0AB5B5', emoji: c.emoji ?? '📋',
      sortOrder: c.sort_order ?? 0,
    }
  }

  function mapExercise(e: any): Exercise {
    return {
      id: e.id, categoryId: e.category_id,
      name: e.name, nameEn: e.name_en,
      description: e.description, instructions: e.instructions,
      target: e.target, ageMinMonths: e.age_min_months, ageMaxMonths: e.age_max_months,
      bodyArea: e.body_area, youtubeSearchQuery: e.youtube_search_query,
      suggestedDurationMinutes: e.suggested_duration_minutes,
      suggestedFrequencyCount: e.suggested_frequency_count ?? 1,
      suggestedFrequencyPer: e.suggested_frequency_per ?? 'day',
      difficulty: e.difficulty ?? 'easy',
      category: undefined,
    }
  }

  const loadExercises = useCallback(async (
    target: 'toddler' | 'adult',
    ageM: number,
    bodyAreas: string[],
  ) => {
    setLoadingEx(true)
    setSelectedIds(new Set())

    let catQuery = supabase
      .from('exercise_library_categories')
      .select('*')
      .eq('target', target)
      .order('sort_order')
    if (target === 'adult' && bodyAreas.length > 0) {
      catQuery = catQuery.in('body_area', bodyAreas)
    }
    const { data: catsData } = await catQuery

    let exQuery = supabase
      .from('exercise_library')
      .select('*')
      .eq('target', target)
      .eq('is_active', true)
      .order('sort_order')
    if (target === 'toddler') {
      exQuery = exQuery.lte('age_min_months', ageM).gte('age_max_months', ageM)
    } else if (bodyAreas.length > 0) {
      exQuery = exQuery.in('body_area', bodyAreas)
    }
    const { data: exData } = await exQuery

    const catsMap = new Map((catsData ?? []).map((c: any) => [c.id, mapCategory(c)]))
    setCategories(Array.from(catsMap.values()))
    setExercises((exData ?? []).map((e: any) => ({ ...mapExercise(e), category: catsMap.get(e.category_id) })))
    setLoadingEx(false)
  }, [supabase])

  // ── Step navigation ──

  async function handleSelectMember(member: Member) {
    setSelectedMember(member)
    // Try to auto-detect toddler from birth_date
    const { data } = await supabase.from('members').select('birth_date').eq('id', member.id).single()
    if (data?.birth_date) {
      const birthDate = new Date(data.birth_date)
      const months = (new Date().getFullYear() - birthDate.getFullYear()) * 12
                   + (new Date().getMonth() - birthDate.getMonth())
      if (months >= 0 && months <= 42) {
        setTargetType('toddler')
        setAgeMonths(months)
        await loadExercises('toddler', months, [])
        setStep('exercises')
        return
      }
    }
    setStep('type')
  }

  async function handleTypeConfirm() {
    if (!targetType) return
    if (targetType === 'toddler') {
      await loadExercises('toddler', ageMonths, [])
      setStep('exercises')
    } else {
      // adult — need area selection
      if (selectedBodyAreas.length === 0) return
      await loadExercises('adult', 0, selectedBodyAreas)
      setStep('exercises')
    }
  }

  function toggleArea(key: string) {
    setSelectedBodyAreas(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function toggleExercise(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Add tasks ──

  async function handleAddTasks() {
    if (!selectedMember || !familyId || selectedIds.size === 0) return
    setSaving(true)

    const selectedExercises = exercises.filter(e => selectedIds.has(e.id))

    // Cache category id per exercise category name to avoid duplicate inserts
    const catCache = new Map<string, string>()

    for (const exercise of selectedExercises) {
      const catName  = exercise.category?.name ?? 'תרגילים'
      const catColor = exercise.category?.color ?? '#0AB5B5'

      let categoryId: string
      if (catCache.has(catName)) {
        categoryId = catCache.get(catName)!
      } else {
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('family_id', familyId)
          .eq('member_id', selectedMember.id)
          .eq('name', catName)
          .maybeSingle()

        if (existing) {
          categoryId = existing.id
        } else {
          const { data: created } = await supabase
            .from('categories')
            .insert({
              family_id: familyId,
              member_id: selectedMember.id,
              name: catName,
              color: catColor,
              is_default: false,
              sort_order: 99,
            })
            .select('id')
            .single()
          categoryId = created!.id
        }
        catCache.set(catName, categoryId)
      }

      const taskType = exercise.suggestedDurationMinutes ? 'duration' : 'done_not_done'
      const descParts: string[] = []
      if (exercise.nameEn) descParts.push(exercise.nameEn)
      if (exercise.description) descParts.push(exercise.description)
      if (exercise.youtubeSearchQuery) {
        const encoded = encodeURIComponent(exercise.youtubeSearchQuery)
        descParts.push(`🎬 YouTube: https://www.youtube.com/results?search_query=${encoded}`)
      }

      const { data: task } = await supabase
        .from('tasks')
        .insert({
          family_id: familyId,
          title: exercise.name,
          description: descParts.join('\n\n') || null,
          category_id: categoryId,
          assigned_members: [selectedMember.id],
          task_type: taskType,
          created_by: userId,
        })
        .select('id')
        .single()

      if (task) {
        await supabase.from('cadence_versions').insert({
          task_id: task.id,
          effective_from: new Date().toISOString().split('T')[0],
          target_count: taskType !== 'duration' ? exercise.suggestedFrequencyCount : null,
          target_minutes: taskType === 'duration' ? exercise.suggestedDurationMinutes : null,
          per: exercise.suggestedFrequencyPer,
        })
      }
    }

    setAddedCount(selectedIds.size)
    setSaving(false)
    setStep('done')
  }

  // ── Derived ──

  const groupedExercises = categories.map(cat => ({
    category: cat,
    exercises: exercises.filter(e => e.categoryId === cat.id),
  })).filter(g => g.exercises.length > 0)

  // ── Render ────────────────────────────────────────────────────────────────

  // ── Step: Done ──
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6">
        <div className="h-20 w-20 rounded-full flex items-center justify-center text-4xl"
             style={{ background: '#E0FAF8' }}>
          ✅
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">נוסף בהצלחה!</h2>
          <p className="text-gray-500 mt-1">
            {addedCount} {addedCount === 1 ? 'תרגיל נוסף' : 'תרגילים נוספו'} ל{selectedMember?.name}
          </p>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => router.push('/feed')}
            className="flex-1 py-3 rounded-2xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#0AB5B5,#06B6D4)' }}
          >
            לפיד
          </button>
          <button
            onClick={() => { setStep('member'); setSelectedMember(null); setTargetType(null); setSelectedBodyAreas([]); setSelectedIds(new Set()) }}
            className="flex-1 py-3 rounded-2xl font-semibold text-teal-700 bg-teal-50"
          >
            שאלון נוסף
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F0FAFA] px-4 pt-5 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              if (step === 'exercises') setStep(targetType === 'toddler' && categories.length > 0 ? 'type' : 'type')
              else if (step === 'type') setStep('member')
              else router.back()
            }}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">שאלון תרגילים</h1>
            <p className="text-xs text-gray-400">
              {step === 'member' ? 'עבור מי?' : step === 'type' ? 'סוג תרגיל' : `${exercises.length} תרגילים זמינים`}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5">
          {(['member', 'type', 'exercises'] as Step[]).map((s, i) => (
            <div
              key={s}
              className="h-1 rounded-full flex-1 transition-all"
              style={{
                background: step === s ? '#0AB5B5' : i < ['member','type','exercises'].indexOf(step) ? '#0AB5B5' : '#E5E7EB',
                opacity: step === s ? 1 : i < ['member','type','exercises'].indexOf(step) ? 0.5 : 0.3,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-32 space-y-4">

        {/* ── Step: member ── */}
        {step === 'member' && (
          <>
            <p className="text-sm text-gray-500 mb-2">בחרי חבר/ת משפחה</p>
            <div className="grid grid-cols-2 gap-3">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMember(m)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white shadow-sm active:scale-95 transition-transform text-right"
                >
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                       style={{ background: m.avatarColor }}>
                    {m.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">{m.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step: type ── */}
        {step === 'type' && selectedMember && (
          <>
            <p className="text-sm text-gray-500">
              תרגילים עבור <strong>{selectedMember.name}</strong>
            </p>

            {/* Toddler / Adult cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setTargetType('toddler'); setSelectedBodyAreas([]) }}
                className="p-4 rounded-2xl border-2 text-center transition-all"
                style={{
                  background: targetType === 'toddler' ? '#E0FAF8' : 'white',
                  borderColor: targetType === 'toddler' ? '#0AB5B5' : '#E5E7EB',
                }}
              >
                <div className="text-3xl mb-1">👶</div>
                <div className="font-semibold text-gray-800 text-sm">פעוט</div>
                <div className="text-xs text-gray-400">עד גיל 3</div>
              </button>
              <button
                onClick={() => { setTargetType('adult'); setAgeMonths(0) }}
                className="p-4 rounded-2xl border-2 text-center transition-all"
                style={{
                  background: targetType === 'adult' ? '#E0FAF8' : 'white',
                  borderColor: targetType === 'adult' ? '#0AB5B5' : '#E5E7EB',
                }}
              >
                <div className="text-3xl mb-1">🧑</div>
                <div className="font-semibold text-gray-800 text-sm">מבוגר</div>
                <div className="text-xs text-gray-400">פיזיותרפיה</div>
              </button>
            </div>

            {/* Toddler age input */}
            {targetType === 'toddler' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="font-semibold text-gray-700 text-sm">גיל (בחודשים)</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAgeMonths(a => Math.max(0, a - 1))}
                    className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600"
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-teal-600">{ageMonths}</span>
                    <span className="text-sm text-gray-400 mr-1">חודשים</span>
                    <div className="text-xs text-gray-400">
                      ({Math.floor(ageMonths / 12)} שנים {ageMonths % 12 > 0 ? `ו-${ageMonths % 12} חודשים` : ''})
                    </div>
                  </div>
                  <button
                    onClick={() => setAgeMonths(a => Math.min(36, a + 1))}
                    className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600"
                  >+</button>
                </div>
                <input
                  type="range" min={0} max={36} value={ageMonths}
                  onChange={e => setAgeMonths(Number(e.target.value))}
                  className="w-full accent-teal-500"
                />
                <div className="flex justify-between text-xs text-gray-300">
                  <span>לידה</span><span>6 חו'</span><span>12 חו'</span><span>18 חו'</span><span>24 חו'</span><span>30 חו'</span><span>36 חו'</span>
                </div>
              </div>
            )}

            {/* Adult body area selection */}
            {targetType === 'adult' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="font-semibold text-gray-700 text-sm">בחרי אזורי פיזיותרפיה (ניתן לבחור כמה)</p>
                <div className="grid grid-cols-2 gap-2">
                  {BODY_AREAS.map(area => (
                    <button
                      key={area.key}
                      onClick={() => toggleArea(area.key)}
                      className="flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-right"
                      style={{
                        background: selectedBodyAreas.includes(area.key) ? '#E0FAF8' : '#F9FAFB',
                        borderColor: selectedBodyAreas.includes(area.key) ? '#0AB5B5' : '#E5E7EB',
                      }}
                    >
                      <span className="text-xl">{area.emoji}</span>
                      <span className="font-semibold text-sm text-gray-700">{area.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Proceed button */}
            <button
              onClick={handleTypeConfirm}
              disabled={!targetType || (targetType === 'adult' && selectedBodyAreas.length === 0)}
              className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#0AB5B5,#06B6D4)' }}
            >
              הצגת תרגילים →
            </button>
          </>
        )}

        {/* ── Step: exercises ── */}
        {step === 'exercises' && (
          <>
            {loadingEx ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🤷</div>
                <p>לא נמצאו תרגילים לפרמטרים אלה</p>
              </div>
            ) : (
              <>
                {/* Select/deselect all */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {selectedIds.size} נבחרו מתוך {exercises.length}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedIds.size === exercises.length) setSelectedIds(new Set())
                      else setSelectedIds(new Set(exercises.map(e => e.id)))
                    }}
                    className="text-sm font-semibold text-teal-600"
                  >
                    {selectedIds.size === exercises.length ? 'בטל הכל' : 'בחר הכל'}
                  </button>
                </div>

                {/* Exercise groups */}
                {groupedExercises.map(({ category, exercises: catExercises }) => (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-2 mt-3">
                      <span className="text-lg">{category.emoji}</span>
                      <h3 className="font-bold text-gray-800">{category.name}</h3>
                      {category.nameEn && (
                        <span className="text-xs text-gray-400">{category.nameEn}</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {catExercises.map(ex => (
                        <ExerciseCard
                          key={ex.id}
                          exercise={ex}
                          selected={selectedIds.has(ex.id)}
                          expanded={expanded === ex.id}
                          onToggle={() => toggleExercise(ex.id)}
                          onExpand={() => setExpanded(expanded === ex.id ? null : ex.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Sticky bottom action bar (exercises step only) ── */}
      {step === 'exercises' && !loadingEx && (
        <div className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-30 px-4 pb-6 pt-3 bg-gradient-to-t from-[#F0FAFA] to-transparent">
          <button
            onClick={handleAddTasks}
            disabled={selectedIds.size === 0 || saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#0AB5B5,#06B6D4)' }}
          >
            {saving ? (
              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>הוסף {selectedIds.size > 0 ? selectedIds.size : ''} תרגילים לפיד</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ── ExerciseCard ───────────────────────────────────────────────────────────

function ExerciseCard({
  exercise, selected, expanded, onToggle, onExpand,
}: {
  exercise: Exercise
  selected: boolean
  expanded: boolean
  onToggle: () => void
  onExpand: () => void
}) {
  const diffColor: Record<string, string> = {
    easy: '#10B981', medium: '#F59E0B', hard: '#EF4444',
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-all"
      style={{ borderColor: selected ? '#0AB5B5' : 'transparent' }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className="h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: selected ? '#0AB5B5' : 'transparent',
            borderColor: selected ? '#0AB5B5' : '#D1D5DB',
          }}
        >
          {selected && (
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Name + tags */}
        <div className="flex-1 min-w-0" onClick={onExpand}>
          <div className="font-semibold text-gray-900 text-sm leading-tight">{exercise.name}</div>
          {exercise.nameEn && (
            <div className="text-xs text-gray-400 truncate">{exercise.nameEn}</div>
          )}
          <div className="flex gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: diffColor[exercise.difficulty] + '20', color: diffColor[exercise.difficulty] }}>
              {DIFFICULTY_LABEL[exercise.difficulty] ?? exercise.difficulty}
            </span>
            <span className="text-[10px] text-gray-400">
              {FREQ_LABEL(exercise.suggestedFrequencyCount, exercise.suggestedFrequencyPer)}
            </span>
            {exercise.suggestedDurationMinutes && (
              <span className="text-[10px] text-gray-400">{exercise.suggestedDurationMinutes} דק׳</span>
            )}
          </div>
        </div>

        {/* Expand arrow */}
        <button onClick={onExpand} className="p-1 text-gray-400">
          <svg
            className="h-4 w-4 transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 space-y-3 text-right" dir="ltr">
          {exercise.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{exercise.description}</p>
          )}
          {exercise.instructions && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1 text-right" dir="rtl">הוראות:</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{exercise.instructions}</p>
            </div>
          )}
          {exercise.youtubeSearchQuery && (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.youtubeSearchQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-red-500"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
              </svg>
              חפשי סרטון ביוטיוב
            </a>
          )}
        </div>
      )}
    </div>
  )
}
