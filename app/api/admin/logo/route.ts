import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin-auth'

const ESPRING_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
  const unauth = await requireAdmin()
  if (unauth) return unauth
  const supabase = createAdminClient()
  const formData = await req.formData()
  const file = formData.get('logo') as File

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop() ?? 'png'
  const filename = `logo-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(filename, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filename)

  await supabase
    .from('espring_config')
    .update({ logo_url: publicUrl })
    .eq('id', ESPRING_ID)

  return NextResponse.json({ url: publicUrl })
}
