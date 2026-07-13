import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ResultsPage from '@/components/results/ResultsPage'
import { ESpringConfig, PayPalConfig } from '@/types'
import { DEFAULT_PDF_TEMPLATES, type DownloadTier, isDownloadTier } from '@/lib/report-sections'

export const metadata = { title: 'Your Water Cost Report — True Cost Revealer' }
// Always re-fetch config from Supabase on each request — otherwise saved admin
// changes wouldn't appear here until the next deploy/rebuild.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ESPRING_ID = '00000000-0000-0000-0000-000000000001'
const PAYPAL_ID = '00000000-0000-0000-0000-000000000002'

const DEFAULT_ESPRING: ESpringConfig = {
  id: ESPRING_ID,
  unit_price: 1299,
  annual_filter_cost: 149,
  uv_lamp_cost: 79,
  uv_lamp_frequency_years: 10,
  filter_capacity_litres: 5000,
  system_lifespan_years: 10,
  warranty_years: 3,
  bottled_water_inflation_rate: 0.03,
  espring_inflation_rate: 0.02,
  cta_text: "Ready to stop paying for water? Let's talk.",
  floating_cta_label: 'Every day you wait costs more',
  floating_cta_button: 'Stop the bleed →',
  floating_cta_url: null,
  logo_url: null,
  consultant_name: null,
  consultant_phone: null,
  consultant_email: null,
  booking_url: null,
  warranty_text: null,
  assumed_return_rate: 0.08,
  pdf_templates: DEFAULT_PDF_TEMPLATES,
  default_client_tier: 'full',
  updated_at: new Date().toISOString(),
}

const DEFAULT_PAYPAL: PayPalConfig = {
  id: PAYPAL_ID,
  provider: 'PayPal',
  down_payment: 0,
  promo_apr: 0,
  standard_apr: 0.26,
  plan_6_monthly: 233.21,
  plan_6_interest: 100.27,
  plan_6_total: 1399.27,
  plan_12_monthly: 124.09,
  plan_12_interest: 190.14,
  plan_12_total: 1489.14,
  plan_24_monthly: 69.98,
  plan_24_interest: 380.60,
  plan_24_total: 1679.60,
  updated_at: new Date().toISOString(),
}

export default async function ResultsRoutePage() {
  let espringConfig = DEFAULT_ESPRING
  let paypalConfig = DEFAULT_PAYPAL
  // The viewing client's download tier. Default to 'full' — the middleware has
  // already verified an invitation cookie is present, so the visitor is a
  // legitimate invited client; if the lookup can't resolve their row we don't
  // want to needlessly block their downloads.
  let downloadTier: DownloadTier = 'full'

  try {
    const supabase = createClient()
    const [{ data: espring }, { data: paypal }] = await Promise.all([
      supabase.from('espring_config').select('*').eq('id', ESPRING_ID).single(),
      supabase.from('paypal_config').select('*').eq('id', PAYPAL_ID).single(),
    ])
    if (espring) espringConfig = espring
    if (paypal) paypalConfig = paypal

    // Resolve the client's tier from the invitation cookie set by /access/[token].
    // The `clients` table is service-role-only under RLS (no public read), so we
    // MUST use the admin client here — the anon client returns null and we'd
    // silently fall back to 'full', showing every download button to everyone.
    const token = cookies().get('tcr_token')?.value
    if (token) {
      const admin = createAdminClient()
      const { data: client } = await admin
        .from('clients')
        .select('download_tier')
        .eq('token', token)
        .single()
      if (client && isDownloadTier(client.download_tier)) downloadTier = client.download_tier
    }
  } catch {
    // Fall back to defaults if Supabase is not configured
  }

  return <ResultsPage espringConfig={espringConfig} paypalConfig={paypalConfig} downloadTier={downloadTier} />
}
