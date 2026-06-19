'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PendingApprovalPage() {
  const router = useRouter()
  const supabase = createClient()

  // Poll every 10s to check if approved
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('family_users')
        .select('is_approved')
        .eq('user_id', user.id)
        .limit(1)
        .single()
      if (data?.is_approved) router.replace('/feed')
    }
    check()
    const timer = setInterval(check, 10000)
    return () => clearInterval(timer)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#F0FAFA]">
      <div className="max-w-sm w-full text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 h-20 w-20 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #0AB5B5, #06B6D4)' }}>
          <svg className="h-11 w-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">ממתינים לאישור</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          הבקשה שלך להצטרפות למשפחה נשלחה. מנהל המשפחה יקבל הודעה ויוכל לאשר אותך בהגדרות.
          הדף יתעדכן אוטומטית כשתאושרי.
        </p>

        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 mb-8">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span>בודק אישור כל 10 שניות...</span>
        </div>

        <button onClick={handleSignOut}
          className="text-sm text-gray-400 hover:text-gray-600 underline">
          יציאה מהחשבון
        </button>
      </div>
    </div>
  )
}
