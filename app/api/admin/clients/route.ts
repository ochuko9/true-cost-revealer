import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const unauth = await requireAdmin()
  if (unauth) return unauth
  const supabase = createAdminClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select(`*, access_logs(id, accessed_at, completed)`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(clients)
}

const ESPRING_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth
  const supabase = createAdminClient()
  const { email } = await req.json()

  // New clients inherit the admin-configured default download tier.
  // Fall back to 'full' if the column/config isn't present yet.
  let defaultTier = 'full'
  const { data: cfg } = await supabase
    .from('espring_config')
    .select('default_client_tier')
    .eq('id', ESPRING_ID)
    .single()
  if (cfg?.default_client_tier) defaultTier = cfg.default_client_tier

  const { data, error } = await supabase
    .from('clients')
    .insert({ email: email || null, download_tier: defaultTier })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/access/${data.token}` },
    })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth
  const supabase = createAdminClient()
  const { id, ...updates } = await req.json()

  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth
  const supabase = createAdminClient()
  const { id } = await req.json()

  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
