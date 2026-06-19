import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/invite/${token}`)
  }

  const { error } = await supabase.rpc('accept_invitation', { p_token: token })

  if (error) {
    const msg = error.message.includes('Invalid or expired')
      ? 'הקישור לא תקף או פג תוקפו'
      : error.message
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0FAFA] px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-red-500 font-medium">{msg}</p>
          <a href="/feed" className="mt-4 inline-block text-sm text-teal-600 underline">חזרה לאפליקציה</a>
        </div>
      </div>
    )
  }

  // Check if this user is pending approval (new join = is_approved false by default)
  const { data: fu } = await supabase
    .from('family_users')
    .select('is_approved, family_id, families(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (fu && !fu.is_approved) {
    // Notify admin via API — fire-and-forget (can't await in server component easily)
    const familyName = (fu.families as any)?.name ?? 'המשפחה'
    const userName = user.user_metadata?.full_name ?? user.email ?? 'משתמש חדש'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    // Use fetch for server-to-server call
    fetch(`${appUrl}/api/notify-join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: '' },
      body: JSON.stringify({ familyId: fu.family_id, familyName, userName }),
    }).catch(() => {})
    redirect('/pending')
  }

  redirect('/feed')
}
