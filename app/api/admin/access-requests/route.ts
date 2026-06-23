import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

const ESPRING_ID = '00000000-0000-0000-0000-000000000001'

/** List all access requests, newest first. */
export async function GET() {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

/**
 * Convert a request into a client invitation.
 * Creates a client (inheriting the configured default tier), marks the request
 * converted, and returns the new client so the UI can surface the invite link.
 */
export async function POST(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const { id, tier } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing request id' }, { status: 400 })

  // Look up the original request for its email
  const { data: reqRow } = await supabase
    .from('access_requests')
    .select('email')
    .eq('id', id)
    .single()

  // Use the admin-chosen tier if valid, otherwise fall back to the configured default
  const VALID_TIERS = ['none', 'brief', 'standard', 'full']
  let downloadTier: string = VALID_TIERS.includes(tier) ? tier : 'full'
  if (!VALID_TIERS.includes(tier)) {
    const { data: cfg } = await supabase
      .from('espring_config')
      .select('default_client_tier')
      .eq('id', ESPRING_ID)
      .single()
    if (cfg?.default_client_tier) downloadTier = cfg.default_client_tier
  }

  // Create the client
  const { data: client, error: createErr } = await supabase
    .from('clients')
    .insert({ email: reqRow?.email || null, download_tier: downloadTier })
    .select()
    .single()
  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })

  // Mark the request converted
  await supabase.from('access_requests').update({ converted: true }).eq('id', id)

  return NextResponse.json(client)
}

/** Dismiss (delete) an access request. */
export async function DELETE(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing request id' }, { status: 400 })

  const { error } = await supabase.from('access_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
