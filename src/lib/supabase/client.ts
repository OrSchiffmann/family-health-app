import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** The signed-in user's id, without a round trip to the Auth server.
 *  `getUser()` always hits the network; `getClaims()` verifies the session JWT
 *  locally (falling back to the network only for legacy symmetric keys). The
 *  proxy has already authenticated the request, and RLS enforces access on
 *  every query, so a locally verified id is all these pages need. */
export async function getCurrentUser(
  supabase: ReturnType<typeof createClient>,
): Promise<{ id: string } | null> {
  const { data } = await supabase.auth.getClaims()
  const sub = data?.claims?.sub
  return sub ? { id: sub } : null
}
