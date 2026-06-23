import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ valid: false }, { status: 400 })

  const supabase = createAdminClient()
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null
  const ua = req.headers.get('user-agent') ?? null

  const { data, error } = await supabase.rpc('validate_token', {
    p_token: token,
    p_ip: ip,
    p_ua: ua,
  })

  if (error || !data?.valid) {
    return NextResponse.json({ valid: false, reason: data?.reason ?? 'Invalid token' }, { status: 403 })
  }

  // Set a session cookie so subsequent pages don't re-validate on every request
  const cookieStore = cookies()
  cookieStore.set('tcr_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return NextResponse.json({ valid: true, clientId: data.client_id })
}
