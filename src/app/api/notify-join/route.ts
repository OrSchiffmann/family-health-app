import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { familyId, familyName, userName } = await req.json()

  const adminEmail = process.env.ADMIN_EMAIL
  const resendKey = process.env.RESEND_API_KEY

  if (!adminEmail || !resendKey) {
    // Email not configured — silently succeed (approval still works via settings)
    return NextResponse.json({ ok: true })
  }

  const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000'}/settings`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: adminEmail,
      subject: `משתמש חדש מבקש הצטרפות — ${familyName}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0AB5B5;">בקשת הצטרפות חדשה</h2>
          <p>המשתמש <strong>${userName}</strong> (${user.email}) ביקש להצטרף למשפחה <strong>${familyName}</strong>.</p>
          <p>כדי לאשר, היכנסו להגדרות ← משתמשים ← אשרו את הבקשה.</p>
          <a href="${approveUrl}"
            style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0AB5B5;color:white;border-radius:12px;text-decoration:none;font-weight:bold;">
            עבור להגדרות
          </a>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    console.error('Resend error', await res.text())
  }

  return NextResponse.json({ ok: true })
}
