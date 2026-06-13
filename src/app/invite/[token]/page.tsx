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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-red-500 font-medium">{msg}</p>
          <a href="/feed" className="mt-4 inline-block text-sm text-indigo-600 underline">חזרה לאפליקציה</a>
        </div>
      </div>
    )
  }

  redirect('/feed')
}
