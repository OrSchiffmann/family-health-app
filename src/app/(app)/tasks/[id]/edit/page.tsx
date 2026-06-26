import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import TaskForm from '@/components/tasks/TaskForm'
import type { TaskType, CadencePer } from '@/types'

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const { id } = await params
  const { step } = await searchParams
  const initialStep = step ? parseInt(step) : undefined
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: fu } = await supabase
    .from('family_users')
    .select('family_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!fu) redirect('/settings')

  const familyId = fu.family_id

  const { data: t } = await supabase
    .from('tasks')
    .select('*, tags(*), attachments(*), cadence_versions(*)')
    .eq('id', id)
    .single()
  if (!t) notFound()

  const memberIds: string[] = t.assigned_members ?? []

  const [{ data: members }, { data: tags }, { data: cats }] = await Promise.all([
    supabase.from('members').select('*').eq('family_id', familyId).eq('is_archived', false),
    supabase.from('tags').select('*').eq('family_id', familyId),
    memberIds.length > 0
      ? supabase.from('categories').select('*, subcategories(*)').in('member_id', memberIds)
      : Promise.resolve({ data: [] }),
  ])

  const activeCadence = (t.cadence_versions ?? [])
    .sort((a: any, b: any) => new Date(a.effective_from).getTime() - new Date(b.effective_from).getTime())
    .findLast(() => true)

  const mappedMembers = (members ?? []).map((m: any) => ({
    id: m.id,
    familyId: m.family_id,
    name: m.name,
    avatarColor: m.avatar_color,
    avatarUrl: m.avatar_url ?? null,
    isArchived: m.is_archived,
    createdAt: m.created_at,
  }))

  const mappedCategories = (cats ?? []).map((c: any) => ({
    id: c.id,
    memberId: c.member_id,
    name: c.name,
    color: c.color,
    isDefault: c.is_default,
    sortOrder: c.sort_order,
    subcategories: (c.subcategories ?? []).map((s: any) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
      sortOrder: s.sort_order,
    })),
  }))

  const mappedAttachments = (t.attachments ?? []).map((a: any) => ({
    id: a.id,
    taskId: a.task_id,
    type: a.type,
    url: a.url,
    title: a.title,
    thumbnailUrl: a.thumbnail_url,
  }))

  return (
    <TaskForm
      familyId={familyId}
      members={mappedMembers}
      categories={mappedCategories}
      tags={tags ?? []}
      taskId={id}
      initialAttachments={mappedAttachments}
      initialStep={initialStep}
      defaults={{
        title: t.title ?? '',
        assignedMembers: memberIds,
        categoryId: t.category_id ?? '',
        subcategoryId: t.subcategory_id ?? '',
        description: t.description ?? '',
        taskType: (t.task_type as TaskType) ?? 'done_not_done',
        targetCount: String(activeCadence?.target_count ?? 3),
        targetMinutes: String(activeCadence?.target_minutes ?? 30),
        per: (activeCadence?.per as CadencePer) ?? 'week',
        endDate: t.end_date ?? '',
        selectedTags: (t.tags ?? []).map((tag: any) => tag.id),
      }}
    />
  )
}
