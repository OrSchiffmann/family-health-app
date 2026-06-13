'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [familyName, setFamilyName] = useState('')
  const [firstDay, setFirstDay] = useState<'saturday' | 'sunday' | 'monday'>('sunday')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!familyName.trim()) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: createErr } = await supabase.rpc('create_family', {
      family_name: familyName.trim(),
      first_day: firstDay,
    })

    if (createErr) {
      setError(`שגיאה: ${createErr.message}`)
      setLoading(false)
      return
    }

    router.push('/feed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
          <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">ברוכים הבאים!</h1>
        <p className="text-gray-500 text-center text-sm mb-8">צרו את המשפחה שלכם כדי להתחיל</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">שם המשפחה</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder='משפחת כהן'
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
                    firstDay === value ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-gray-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={!familyName.trim() || loading}
            className="w-full rounded-xl bg-indigo-600 text-white py-3 font-semibold disabled:opacity-60"
          >
            {loading ? 'יוצר...' : 'צרי משפחה'}
          </button>
        </div>
      </div>
    </div>
  )
}
