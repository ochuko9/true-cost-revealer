import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'
import { normalizeSectionIds } from '@/lib/report-sections'

const ESPRING_ID = '00000000-0000-0000-0000-000000000001'
const PAYPAL_ID = '00000000-0000-0000-0000-000000000002'

export async function GET() {
  const supabase = createAdminClient()
  const [{ data: espring }, { data: paypal }] = await Promise.all([
    supabase.from('espring_config').select('*').eq('id', ESPRING_ID).single(),
    supabase.from('paypal_config').select('*').eq('id', PAYPAL_ID).single(),
  ])
  return NextResponse.json({ espring, paypal })
}

export async function PATCH(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth

  const supabase = createAdminClient()
  const body = await req.json()

  // Strip fields the client might have echoed back that we don't want to overwrite
  // ourselves (id is the primary key; updated_at is set fresh below).
  const { type, id: _id, updated_at: _ts, ...updates } = body
  void _id; void _ts

  // Permanent guard: force every PDF template's section list into canonical
  // registry order before it lands in the DB, regardless of what the client
  // sent (old UI code that appended on click, manual API calls, etc.). This is
  // the single chokepoint all config writes pass through, so templates can
  // never drift out of sequence again.
  if (updates.pdf_templates && typeof updates.pdf_templates === 'object') {
    updates.pdf_templates = Object.fromEntries(
      Object.entries(updates.pdf_templates).map(([name, ids]) => [name, normalizeSectionIds(ids)]),
    )
  }

  const table = type === 'paypal' ? 'paypal_config' : 'espring_config'
  const rowId = type === 'paypal' ? PAYPAL_ID : ESPRING_ID

  const { data, error } = await supabase
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', rowId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
