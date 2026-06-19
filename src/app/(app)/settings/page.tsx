'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Member, FamilyUser, Tag, Family } from '@/types'

type SettingsTab = 'family' | 'members' | 'users' | 'tags' | 'account'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<SettingsTab>('family')
  const [family, setFamily] = useState<Family | null>(null)
  const [familyId, setFamilyId] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [users, setUsers] = useState<FamilyUser[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  // New category form
  const [newCatMemberId, setNewCatMemberId] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')

  // Edit member
  const [editMemberId, setEditMemberId] = useState<string | null>(null)
  const [editMemberName, setEditMemberName] = useState('')
  const [editMemberColor, setEditMemberColor] = useState('')

  // Edit category
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatColor, setEditCatColor] = useState('')

  // Family form
  const [familyName, setFamilyName] = useState('')
  const [firstDay, setFirstDay] = useState<'saturday' | 'sunday' | 'monday'>('sunday')

  // New member form
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberColor, setNewMemberColor] = useState(AVATAR_COLORS[0])

  // New tag form
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')

  // Invite
  const [currentUser, setCurrentUser] = useState<{ id: string; displayName: string; avatarUrl: string | null } | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'user' | 'viewer'>('user')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: fu } = await supabase
        .from('family_users').select('*, families(*)').eq('user_id', user.id).limit(1).single()
      if (!fu) return

      const fid = fu.family_id
      setFamilyId(fid)

      const { data: profile } = await supabase
        .from('user_profiles').select('id, display_name, avatar_url').eq('id', user.id).single()
      if (profile) setCurrentUser({ id: profile.id, displayName: profile.display_name, avatarUrl: profile.avatar_url })
      setFamily(fu.families as any)
      setFamilyName(fu.families?.name ?? '')
      setFirstDay(fu.families?.first_day_of_week ?? 'sunday')

      const [{ data: membersData }, { data: usersData }, { data: tagsData }] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', fid),
        supabase.from('family_users').select('*, user_profiles(display_name, avatar_url)').eq('family_id', fid),
        supabase.from('tags').select('*').eq('family_id', fid),
      ])
      setMembers((membersData ?? []).map((m: any) => ({
        id: m.id, familyId: m.family_id, name: m.name,
        avatarColor: m.avatar_color, avatarUrl: m.avatar_url ?? null,
        isArchived: m.is_archived, createdAt: m.created_at,
      })))
      const allUsers = (usersData ?? []).map((u: any) => ({
        ...u,
        displayName: u.user_profiles?.display_name ?? u.user_id,
        email: '',
        joinedAt: u.joined_at,
      }))
      setUsers(allUsers.filter((u: any) => u.is_approved !== false))
      setPendingUsers(allUsers.filter((u: any) => u.is_approved === false))
      setTags(tagsData ?? [])

      if ((membersData ?? []).length > 0) {
        const memberIds = membersData!.map((m: any) => m.id)
        const { data: catsData } = await supabase
          .from('categories').select('*').in('member_id', memberIds)
        setCategories(catsData ?? [])
        if (!newCatMemberId && memberIds.length > 0) setNewCatMemberId(memberIds[0])
      }
    }
    load()
  }, [])

  async function saveFamily() {
    setSaving(true)
    await supabase.from('families').update({ name: familyName, first_day_of_week: firstDay }).eq('id', familyId)
    setSaving(false)
  }

  async function addCategory() {
    if (!newCatName.trim() || !newCatMemberId) return
    const { data: id } = await supabase.rpc('add_category', {
      p_member_id: newCatMemberId,
      p_name: newCatName.trim(),
      p_color: newCatColor,
    })
    if (id) setCategories((prev) => [...prev, { id, member_id: newCatMemberId, name: newCatName.trim(), color: newCatColor, sort_order: 0 }])
    setNewCatName('')
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  async function saveMember() {
    if (!editMemberId || !editMemberName.trim()) return
    await supabase.rpc('update_member', { p_member_id: editMemberId, p_name: editMemberName.trim(), p_color: editMemberColor })
    setMembers((prev) => prev.map((m) => m.id === editMemberId ? { ...m, name: editMemberName, avatarColor: editMemberColor } : m))
    setEditMemberId(null)
  }

  async function uploadMemberAvatar(memberId: string, file: File) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `member-${memberId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      alert(`שגיאה בהעלאת תמונה: ${error.message}`)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('members').update({ avatar_url: publicUrl }).eq('id', memberId)
    if (dbErr) { alert(`שגיאה בשמירה: ${dbErr.message}`); return }
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, avatarUrl: publicUrl } : m))
  }

  async function saveCat() {
    if (!editCatId || !editCatName.trim()) return
    await supabase.rpc('update_category', { p_category_id: editCatId, p_name: editCatName.trim(), p_color: editCatColor })
    setCategories((prev) => prev.map((c) => c.id === editCatId ? { ...c, name: editCatName, color: editCatColor } : c))
    setEditCatId(null)
  }

  async function addMember() {
    if (!newMemberName.trim()) return
    const { data } = await supabase.from('members')
      .insert({ family_id: familyId, name: newMemberName.trim(), avatar_color: newMemberColor })
      .select().single()
    if (data) setMembers((prev) => [...prev, data])
    setNewMemberName('')
  }

  async function archiveMember(id: string) {
    await supabase.from('members').update({ is_archived: true }).eq('id', id)
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, isArchived: true } : m))
  }

  async function unarchiveMember(id: string) {
    await supabase.from('members').update({ is_archived: false }).eq('id', id)
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, isArchived: false } : m))
  }

  async function approveUser(userId: string) {
    await supabase.from('family_users').update({ is_approved: true }).eq('user_id', userId).eq('family_id', familyId)
    setPendingUsers((prev) => {
      const approved = prev.find((u) => u.user_id === userId)
      if (approved) setUsers((u) => [...u, { ...approved, is_approved: true }])
      return prev.filter((u) => u.user_id !== userId)
    })
  }

  async function rejectUser(userId: string) {
    await supabase.from('family_users').delete().eq('user_id', userId).eq('family_id', familyId)
    setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId))
  }

  async function addTag() {
    if (!newTagName.trim()) return
    const { data } = await supabase.from('tags')
      .insert({ family_id: familyId, name: newTagName.trim(), color: newTagColor })
      .select().single()
    if (data) setTags((prev) => [...prev, data])
    setNewTagName('')
  }

  async function deleteTag(id: string) {
    await supabase.from('tags').delete().eq('id', id)
    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  function copyInviteLink() {
    try {
      navigator.clipboard.writeText(inviteLink)
    } catch {
      const el = document.createElement('textarea')
      el.value = inviteLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setSaving(true)
    const { data: token, error } = await supabase.rpc('create_invitation', {
      p_email: inviteEmail.trim(),
      p_role: inviteRole,
    })
    if (!error && token) {
      setInviteLink(`${window.location.origin}/invite/${token}`)
      setInviteEmail('')
    }
    setSaving(false)
  }

  async function handleAvatarUpload(file: File) {
    if (!currentUser) return
    setAvatarUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${currentUser.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', currentUser.id)
      setCurrentUser((prev) => prev ? { ...prev, avatarUrl: publicUrl } : prev)
    }
    setAvatarUploading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tabs: { value: SettingsTab; label: string }[] = [
    { value: 'family', label: 'משפחה' },
    { value: 'members', label: 'חברים' },
    { value: 'users', label: 'משתמשים' },
    { value: 'tags', label: 'תגיות' },
    { value: 'account', label: 'חשבון' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-0 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-3">הגדרות</h1>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0">
          {tabs.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                tab === value ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Family */}
        {tab === 'family' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">שם המשפחה</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">יום ראשון בשבוע</label>
              <div className="flex gap-2">
                {[
                  { value: 'sunday', label: 'ראשון' },
                  { value: 'monday', label: 'שני' },
                  { value: 'saturday', label: 'שבת' },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => setFirstDay(value as any)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition-all ${
                      firstDay === value ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-200 text-gray-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={saveFamily} disabled={saving}
              className="w-full rounded-xl bg-teal-600 text-white py-3 font-semibold disabled:opacity-60">
              {saving ? 'שומר...' : 'שמור'}
            </button>

            <div className="pt-2">
              <button onClick={() => router.push('/archive')}
                className="w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 flex items-center justify-center gap-2">
                <span>ארכיון</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7l-7 7 7 7" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* Members */}
        {tab === 'members' && (
          <>
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-3">
                  {editMemberId === m.id ? (
                    <div className="space-y-2">
                      <input
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">צבע:</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {AVATAR_COLORS.map((c) => (
                            <button key={c} onClick={() => setEditMemberColor(c)}
                              className={`h-6 w-6 rounded-full transition-all ${editMemberColor === c ? 'ring-2 ring-offset-1 ring-teal-600 scale-110' : ''}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveMember} className="flex-1 rounded-lg bg-teal-600 text-white py-1.5 text-xs font-semibold">שמור</button>
                        <button onClick={() => setEditMemberId(null)} className="flex-1 rounded-lg border border-gray-200 text-gray-600 py-1.5 text-xs">ביטול</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <label className="relative cursor-pointer shrink-0 group">
                        <span className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-base overflow-hidden block"
                          style={m.avatarUrl ? undefined : { backgroundColor: m.avatarColor }}>
                          {m.avatarUrl
                            ? <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                            : m.name[0]}
                        </span>
                        <span className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                        <input type="file" accept="image/*" className="sr-only"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMemberAvatar(m.id, f) }} />
                      </label>
                      <span className="flex-1 font-medium text-gray-800">
                        {m.name}
                        {m.isArchived && <span className="mr-1 text-xs text-gray-400 font-normal">(בארכיון)</span>}
                      </span>
                      <button onClick={() => { setEditMemberId(m.id); setEditMemberName(m.name); setEditMemberColor(m.avatarColor) }}
                        className="text-xs text-teal-500 hover:text-teal-700 transition-colors">ערוך</button>
                      {m.isArchived ? (
                        <button onClick={() => unarchiveMember(m.id)}
                          className="text-xs text-teal-500 hover:text-teal-700 transition-colors">שחזר</button>
                      ) : (
                        <button onClick={() => archiveMember(m.id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors">ארכיון</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">קטגוריות</h3>
              {members.length === 0 ? (
                <p className="text-xs text-gray-400">הוסיפו חברים תחילה</p>
              ) : (
                <>
                  {/* Grouped by member */}
                  {members.map((m: any) => {
                    const memberCats = categories.filter((c) => c.member_id === m.id)
                    return (
                      <div key={m.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                        {/* Member header */}
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: m.avatar_color ?? m.avatarColor }}>
                            {m.name[0]}
                          </span>
                          <span className="text-sm font-medium text-gray-700">{m.name}</span>
                        </div>

                        {/* Category chips */}
                        <div className="flex flex-wrap gap-2">
                          {memberCats.map((cat) => (
                            <div key={cat.id}>
                              {editCatId === cat.id ? (
                                <div className="rounded-xl border border-teal-200 bg-white p-2 space-y-1.5 w-52">
                                  <div className="flex gap-1.5">
                                    <input value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-teal-500" />
                                    <input type="color" value={editCatColor} onChange={(e) => setEditCatColor(e.target.value)}
                                      className="h-7 w-8 rounded cursor-pointer border border-gray-200" />
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button onClick={saveCat} className="flex-1 rounded-lg bg-teal-600 text-white py-1 text-xs font-semibold">שמור</button>
                                    <button onClick={() => setEditCatId(null)} className="flex-1 rounded-lg border border-gray-200 text-gray-600 py-1 text-xs">ביטול</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="group flex items-center gap-1.5 rounded-full border border-gray-200 bg-white pl-2 pr-3 py-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                  <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                                    <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatColor(cat.color) }}
                                      className="text-teal-400 hover:text-teal-600 transition-colors">
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                    <button onClick={() => deleteCategory(cat.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Inline add for this member */}
                          {newCatMemberId === m.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={newCatName}
                                onChange={(e) => setNewCatName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                placeholder="שם קטגוריה"
                                autoFocus
                                className="w-28 rounded-full border border-teal-300 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)}
                                className="h-7 w-7 rounded-full cursor-pointer border border-gray-200" />
                              <button onClick={addCategory} disabled={!newCatName.trim()}
                                className="rounded-full bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                                הוסף
                              </button>
                              <button onClick={() => { setNewCatMemberId(''); setNewCatName('') }}
                                className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setNewCatMemberId(m.id); setNewCatName('') }}
                              className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                              הוסף
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">הוסף חבר</h3>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="שם החבר"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewMemberColor(c)}
                    className={`h-7 w-7 rounded-full transition-all ${newMemberColor === c ? 'ring-2 ring-offset-1 ring-teal-600 scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={addMember} disabled={!newMemberName.trim()}
                className="w-full rounded-xl bg-teal-600 text-white py-2.5 text-sm font-semibold disabled:opacity-50">
                הוסף
              </button>
            </div>
          </>
        )}

        {/* Users */}
        {tab === 'users' && (
          <>
            {/* Pending approval */}
            {pendingUsers.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-sm font-semibold text-amber-800">ממתינים לאישור ({pendingUsers.length})</h3>
                </div>
                <div className="space-y-2">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl bg-white border border-amber-100 p-3">
                      <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {u.displayName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{u.displayName}</p>
                        <p className="text-xs text-gray-400">מבקש הצטרפות</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => approveUser(u.user_id)}
                          className="rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold">
                          אשר
                        </button>
                        <button onClick={() => rejectUser(u.user_id)}
                          className="rounded-lg border border-gray-200 text-gray-500 px-3 py-1.5 text-xs">
                          דחה
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
                  <div className="h-9 w-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                    {u.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{u.displayName}</p>
                    <p className="text-xs text-gray-400">{roleLabel(u.role)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">הזמן משתמש</h3>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="כתובת אימייל"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex gap-2">
                {[
                  { value: 'editor', label: 'עורך' },
                  { value: 'user', label: 'משתמש' },
                  { value: 'viewer', label: 'צופה' },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => setInviteRole(value as any)}
                    className={`flex-1 rounded-xl py-2 text-xs font-medium border transition-all ${
                      inviteRole === value ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-200 text-gray-600'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={handleInvite} disabled={!inviteEmail.trim() || saving}
                className="w-full rounded-xl bg-teal-600 text-white py-2.5 text-sm font-semibold disabled:opacity-50">
                {saving ? 'יוצר קישור...' : 'צור קישור הזמנה'}
              </button>

              {inviteLink && (
                <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 space-y-2">
                  <p className="text-xs text-teal-700 font-medium">שלחי את הקישור הזה:</p>
                  <div className="flex gap-2">
                    <input readOnly value={inviteLink}
                      className="flex-1 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs text-gray-700 outline-none" />
                    <button onClick={copyInviteLink}
                      className="shrink-0 rounded-lg bg-teal-600 text-white px-3 py-1.5 text-xs font-medium transition-colors">
                      {copied ? '✓ הועתק' : 'העתק'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tags */}
        {tab === 'tags' && (
          <>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5">
                  {tag.color && (
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  )}
                  <span className="text-sm text-gray-700">{tag.name}</span>
                  <button onClick={() => deleteTag(tag.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors mr-0.5">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">הוסף תגית</h3>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="שם התגית"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600">צבע:</label>
                <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-8 w-14 rounded cursor-pointer border border-gray-200" />
              </div>
              <button onClick={addTag} disabled={!newTagName.trim()}
                className="w-full rounded-xl bg-teal-600 text-white py-2.5 text-sm font-semibold disabled:opacity-50">
                הוסף
              </button>
            </div>
          </>
        )}

        {/* Account */}
        {tab === 'account' && (
          <div className="space-y-5">
            {/* Avatar */}
            {currentUser && (
              <div className="flex flex-col items-center gap-4 py-2">
                <label className="relative cursor-pointer group">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-teal-100 flex items-center justify-center ring-4 ring-white shadow-md">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.displayName}
                        className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-teal-400">
                        {currentUser.displayName?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {avatarUploading ? (
                      <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }}
                  />
                </label>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">{currentUser.displayName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">לחץ על התמונה להחלפה</p>
                </div>
              </div>
            )}

            <button onClick={handleSignOut}
              className="w-full rounded-xl border border-red-200 text-red-600 py-3 text-sm font-semibold">
              התנתקות
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function roleLabel(role: string) {
  return { admin: 'מנהל', editor: 'עורך', user: 'משתמש', viewer: 'צופה' }[role] ?? role
}
