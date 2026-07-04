import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Public lead-capture endpoint for the /request-access page.
 * Writes an access_requests row the admin can later convert into a client invite.
 */
export async function POST(req: NextRequest) {
  const { name, email, phone } = await req.json().catch(() => ({ name: null, email: null, phone: null }))

  if (!email && !phone) {
    return NextResponse.json({ error: 'Provide an email or phone number.' }, { status: 400 })
  }

  // Basic length guards to keep junk out
  const cleanName = typeof name === 'string' ? name.slice(0, 120) : null
  const cleanEmail = typeof email === 'string' ? email.slice(0, 200) : null
  const cleanPhone = typeof phone === 'string' ? phone.slice(0, 50) : null

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('access_requests')
    .insert({ name: cleanName, email: cleanEmail, phone: cleanPhone })

  if (error) {
    console.error('[access-request] Supabase error:', error.message, error.code, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
