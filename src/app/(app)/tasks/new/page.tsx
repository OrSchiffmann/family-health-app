import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskForm from '@/components/tasks/TaskForm'

export default async function NewTaskPage() {
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

  const { data: members } = await supabase
    .from('members').select('*').eq('family_id', familyId).eq('is_archived', false)

  const memberIds = (members ?? []).map((m: any) => m.id)

  const [{ data: tags }, { data: cats }] = await Promise.all([
    supabase.from('tags').select('*').eq('family_id', familyId),
    memberIds.length > 0
      ? supabase.from('categories').select('*, subcategories(*)').in('member_id', memberIds)
      : Promise.resolve({ data: [] }),
  ])

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

  return (
    <TaskForm
      familyId={familyId}
      members={mappedMembers}
      categories={mappedCategories}
      tags={tags ?? []}
    />
  )
}
