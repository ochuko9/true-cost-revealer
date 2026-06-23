import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

// Guard against a tampered client stuffing the DB. A genuine bundle is ~2-4 KB.
const MAX_BYTES = 100_000

/**
 * Persist a client's completed report so the admin can retrieve / re-download it.
 *
 * Identity comes from the httpOnly `tcr_token` invitation cookie — the same one
 * the middleware checks — so only an invited client can save, and only against
 * their own row. The `clients` table is service-role-only under RLS, hence the
 * admin client for the token lookup.
 */
export async function POST(req: NextRequest) {
  const token = cookies().get('tcr_token')?.value
  if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const { result, espring, paypal } = (body ?? {}) as {
    result?: { inputs?: { firstName?: unknown }; annualSpend?: unknown }
    espring?: unknown
    paypal?: unknown
  }

  // Minimal shape guard — only persist genuine report bundles
  if (
    typeof result?.inputs?.firstName !== 'string' ||
    !result?.annualSpend ||
    !espring ||
    !paypal
  ) {
    return NextResponse.json({ error: 'Invalid report payload' }, { status: 400 })
  }

  const payload = { result, espring, paypal }
  if (JSON.stringify(payload).length > MAX_BYTES) {
    return NextResponse.json({ error: 'Report too large' }, { status: 413 })
  }

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('token', token)
    .single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('client_reports')
    .upsert({ client_id: client.id, report_data: payload, updated_at: now }, { onConflict: 'client_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark completion — this is the only place the flag gets set.
  await supabase.from('clients').update({ completed_calculator: true }).eq('id', client.id)

  return NextResponse.json({ ok: true })
}
