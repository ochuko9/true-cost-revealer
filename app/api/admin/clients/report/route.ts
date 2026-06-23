import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

/**
 * Return a client's saved report bundle ({ result, espring, paypal }) so the
 * admin can regenerate the PDF in-browser. Admin-only.
 */
export async function GET(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing client id' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_reports')
    .select('report_data, updated_at')
    .eq('client_id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'No report found' }, { status: 404 })
  return NextResponse.json(data.report_data)
}
