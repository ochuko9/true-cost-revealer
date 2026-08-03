'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ESpringConfig, PayPalConfig } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Save, Upload, Loader2, CheckCircle, FileText } from 'lucide-react'
import {
  REPORT_SECTIONS, ALL_SECTION_IDS, DEFAULT_PDF_TEMPLATES,
  TEMPLATE_LABELS, TIER_LABELS, type TemplateName, type SectionId, type DownloadTier,
} from '@/lib/report-sections'

type ConfigData = { espring: ESpringConfig; paypal: PayPalConfig }

const TEMPLATE_ORDER: TemplateName[] = ['brief', 'standard', 'full']
const TIER_ORDER: DownloadTier[] = ['none', 'brief', 'standard', 'full']

// Independent preset copy for the live-report floating CTA. The label and button
// are decoupled — each is its own dropdown of presets plus a "Custom…" option —
// so they can be mixed and matched. Both write into the same floating_cta_label /
// floating_cta_button config fields the live bar reads.
const FLOATING_CTA_LABEL_OPTIONS = [
  'Every day you wait costs more',
  'Still bleeding, year after year',
  'What waiting really costs you',
]
const FLOATING_CTA_BUTTON_OPTIONS = [
  'Stop the bleed →',
  'Plug the leak',
  'Fix this now →',
]
// Sentinel <option> value meaning "let me type my own" for either dropdown.
const FLOATING_CTA_CUSTOM = '__custom__'

export default function ConfigEditor() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [saving, setSaving] = useState<'espring' | 'paypal' | null>(null)
  const [saved, setSaved] = useState<'espring' | 'paypal' | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Set when the config fetch succeeds but espring/paypal come back null (e.g. a
  // Supabase hiccup or the singleton row missing) — distinct from `error`, which is
  // for save/upload failures. Kept separate from `config` so a bad response can't
  // put the rest of this component in a state where it reads null fields and crashes.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  // Whether each floating-CTA dropdown is on a preset or in free-text "Custom" mode.
  // null = not yet chosen by the admin this session → derived from the saved value.
  const [labelMode, setLabelMode] = useState<'preset' | 'custom' | null>(null)
  const [buttonMode, setButtonMode] = useState<'preset' | 'custom' | null>(null)

  function loadConfig() {
    setLoadError(null)
    // cache: 'no-store' guarantees we always get the latest config from Supabase,
    // not a stale browser/HTTP cache from a previous session.
    fetch('/api/admin/config', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: ConfigData) => {
        if (!data?.espring || !data?.paypal) {
          setLoadError('Configuration failed to load from the database (got an empty response). This usually means a temporary Supabase connection issue — try reloading.')
          return
        }
        // Backfill defaults for deployments where the migration hasn't run yet,
        // so the templates UI always has something valid to render/edit.
        if (!data.espring.pdf_templates) data.espring.pdf_templates = DEFAULT_PDF_TEMPLATES
        if (!data.espring.default_client_tier) data.espring.default_client_tier = 'full'
        if (!data.espring.floating_cta_label) data.espring.floating_cta_label = 'Every day you wait costs more'
        if (!data.espring.floating_cta_button) data.espring.floating_cta_button = 'Stop the bleed →'
        setConfig(data)
      })
      .catch(() => setLoadError('Configuration failed to load — network error while reaching the server.'))
  }

  useEffect(() => { loadConfig() }, [])

  // ── PDF template helpers ──────────────────────────────────────────────
  function isInTemplate(template: TemplateName, sectionId: SectionId): boolean {
    return Boolean(config?.espring.pdf_templates?.[template]?.includes(sectionId))
  }

  function toggleSection(template: TemplateName, sectionId: SectionId) {
    setConfig(prev => {
      if (!prev) return prev
      const current = prev.espring.pdf_templates?.[template] ?? []
      const member = new Set(current)
      if (member.has(sectionId)) member.delete(sectionId)
      else member.add(sectionId)
      // Rebuild in canonical registry order so the saved template — and therefore
      // the generated PDF — always matches the grid's top-to-bottom sequence,
      // regardless of the order the admin clicked the checkboxes.
      const next = ALL_SECTION_IDS.filter(id => member.has(id))
      return {
        ...prev,
        espring: { ...prev.espring, pdf_templates: { ...prev.espring.pdf_templates, [template]: next } },
      }
    })
  }

  function setTemplate(template: TemplateName, ids: SectionId[]) {
    setConfig(prev => prev ? {
      ...prev,
      espring: { ...prev.espring, pdf_templates: { ...prev.espring.pdf_templates, [template]: ids } },
    } : prev)
  }

  function patchEspring(patch: Partial<ESpringConfig>) {
    setConfig(prev => prev ? { ...prev, espring: { ...prev.espring, ...patch } } : prev)
  }

  function patchPaypal(patch: Partial<PayPalConfig>) {
    setConfig(prev => prev ? { ...prev, paypal: { ...prev.paypal, ...patch } } : prev)
  }

  async function persist(type: 'espring' | 'paypal') {
    if (!config) return
    setSaving(type)
    setError(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ type, ...config[type] }),
      })
      if (res.status === 401) {
        setSaving(null)
        setError('Your admin session has expired. Redirecting to login…')
        setTimeout(() => router.push('/admin/login'), 1500)
        return
      }
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: 'Save failed' }))
        setSaving(null)
        setError(msg ?? `Save failed (HTTP ${res.status})`)
        return
      }
      const fresh = await res.json()
      // Hydrate UI from the server's authoritative response — proves the save landed
      setConfig(prev => prev ? { ...prev, [type]: fresh } : prev)
      setSaving(null)
      setSaved(type)
      setTimeout(() => setSaved(null), 2500)
    } catch (e) {
      setSaving(null)
      setError(e instanceof Error ? e.message : 'Network error while saving')
    }
  }

  const saveEspring = () => persist('espring')
  const savePaypal = () => persist('paypal')

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setError(null)
    const form = new FormData()
    form.append('logo', file)
    const res = await fetch('/api/admin/logo', { method: 'POST', body: form, cache: 'no-store' })
    if (res.status === 401) {
      setUploadingLogo(false)
      setError('Your admin session has expired. Redirecting to login…')
      setTimeout(() => router.push('/admin/login'), 1500)
      return
    }
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: 'Upload failed' }))
      setUploadingLogo(false)
      setError(msg ?? `Upload failed (HTTP ${res.status})`)
      return
    }
    const { url } = await res.json()
    if (url) patchEspring({ logo_url: url })
    setUploadingLogo(false)
  }

  if (loadError) {
    return (
      <div className="bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-6 text-center space-y-3">
        <p className="text-red-200 text-sm">{loadError}</p>
        <Button onClick={loadConfig} size="sm" variant="ghost">Retry</Button>
      </div>
    )
  }

  if (!config) return <div className="text-white/50 text-sm py-8 text-center">Loading config…</div>

  const { espring, paypal } = config
  // Each dropdown shows "Custom…" when the admin chose it, or when the saved value
  // matches no preset. Falls back to the derived state until they pick this session.
  const labelIsCustom = (labelMode ?? (FLOATING_CTA_LABEL_OPTIONS.includes(espring.floating_cta_label) ? 'preset' : 'custom')) === 'custom'
  const buttonIsCustom = (buttonMode ?? (FLOATING_CTA_BUTTON_OPTIONS.includes(espring.floating_cta_button) ? 'preset' : 'custom')) === 'custom'

  return (
    <div className="space-y-10">
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* eSpring Config */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">eSpring Configuration</h2>
            <p className="text-white/50 text-sm">Applied dynamically to all client sessions</p>
          </div>
          <Button onClick={saveEspring} disabled={saving === 'espring'} size="sm">
            {saving === 'espring' ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'espring' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saved === 'espring' ? 'Saved!' : 'Save'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Unit Price ($)" type="number" step="0.01" value={espring.unit_price} onChange={e => patchEspring({ unit_price: parseFloat(e.target.value) })} prefix="$" />
          <Input label="Annual Filter Cost ($)" type="number" step="0.01" value={espring.annual_filter_cost} onChange={e => patchEspring({ annual_filter_cost: parseFloat(e.target.value) })} prefix="$" />
          <Input label="UV Lamp Cost ($)" type="number" step="0.01" value={espring.uv_lamp_cost} onChange={e => patchEspring({ uv_lamp_cost: parseFloat(e.target.value) })} prefix="$" hint="Cost to replace UV-C LED at end of life" />
          <Input label="UV Lamp Frequency (years)" type="number" value={espring.uv_lamp_frequency_years} onChange={e => patchEspring({ uv_lamp_frequency_years: parseInt(e.target.value) })} hint="Use 10 — UV-C LED is rated for the full lifetime of the unit" />
          <Input label="Filter Capacity (litres)" type="number" value={espring.filter_capacity_litres} onChange={e => patchEspring({ filter_capacity_litres: parseInt(e.target.value) })} hint="Total litres one cartridge processes before replacement (~5,000)" />
          <Input label="System Lifespan (years)" type="number" value={espring.system_lifespan_years} onChange={e => patchEspring({ system_lifespan_years: parseInt(e.target.value) })} />
          <Input label="Warranty Period (years)" type="number" value={espring.warranty_years} onChange={e => patchEspring({ warranty_years: parseInt(e.target.value) })} />
          <Input label="Bottled Water Inflation Rate" type="number" step="0.001" value={(espring.bottled_water_inflation_rate * 100).toFixed(1)} onChange={e => patchEspring({ bottled_water_inflation_rate: parseFloat(e.target.value) / 100 })} suffix="%" hint="e.g. 3 for 3%" />
          <Input label="eSpring Cost Inflation Rate" type="number" step="0.001" value={(espring.espring_inflation_rate * 100).toFixed(1)} onChange={e => patchEspring({ espring_inflation_rate: parseFloat(e.target.value) / 100 })} suffix="%" />
          <Input label="Investment Return Rate" type="number" step="0.1" value={(espring.assumed_return_rate * 100).toFixed(1)} onChange={e => patchEspring({ assumed_return_rate: parseFloat(e.target.value) / 100 })} suffix="%" hint="Rule of 72 in Wealth Building section. Default 8% (S&P 500 / TSX long-run average)" />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">PDF Call-to-Action Text</label>
          <textarea
            rows={2}
            value={espring.cta_text}
            onChange={e => patchEspring({ cta_text: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 py-3 px-4 focus:outline-none focus:border-aqua/60 transition-all resize-none"
          />
        </div>

        {/* Floating CTA (live report) — independent label + button dropdowns. Each
            is a list of preset copy plus a "Custom…" option that reveals a free-text
            field, so the label and button can be mixed and matched freely. Both write
            into the floating_cta_label / floating_cta_button fields the live bar reads. */}
        <div className="space-y-4 bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Floating CTA (Live Report)</h3>
            <p className="text-xs text-white/50">The sticky bar that slides up as the client scrolls. The dollar figure is calculated automatically — choose a preset for each, mix and match, or pick Custom to write your own.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Label selector */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/80">Stakes label</label>
              <select
                value={labelIsCustom ? FLOATING_CTA_CUSTOM : espring.floating_cta_label}
                onChange={e => {
                  if (e.target.value === FLOATING_CTA_CUSTOM) { setLabelMode('custom'); return }
                  setLabelMode('preset')
                  patchEspring({ floating_cta_label: e.target.value })
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white py-3.5 px-4 focus:outline-none focus:border-aqua/60 transition-all"
              >
                {FLOATING_CTA_LABEL_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-navy">{opt}</option>)}
                <option value={FLOATING_CTA_CUSTOM} className="bg-navy">Custom…</option>
              </select>
              {labelIsCustom && (
                <Input id="floatingCtaLabelCustom" type="text" value={espring.floating_cta_label ?? ''} onChange={e => patchEspring({ floating_cta_label: e.target.value })} placeholder="Your own stakes label" hint="Appears above the savings figure" />
              )}
            </div>
            {/* Button selector */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-white/80">Button text</label>
              <select
                value={buttonIsCustom ? FLOATING_CTA_CUSTOM : espring.floating_cta_button}
                onChange={e => {
                  if (e.target.value === FLOATING_CTA_CUSTOM) { setButtonMode('custom'); return }
                  setButtonMode('preset')
                  patchEspring({ floating_cta_button: e.target.value })
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white py-3.5 px-4 focus:outline-none focus:border-aqua/60 transition-all"
              >
                {FLOATING_CTA_BUTTON_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-navy">{opt}</option>)}
                <option value={FLOATING_CTA_CUSTOM} className="bg-navy">Custom…</option>
              </select>
              {buttonIsCustom && (
                <Input id="floatingCtaButtonCustom" type="text" value={espring.floating_cta_button ?? ''} onChange={e => patchEspring({ floating_cta_button: e.target.value })} placeholder="Your own button text" hint="The call-to-action button" />
              )}
            </div>
          </div>
          <Input
            label="Button link"
            type="url"
            value={espring.floating_cta_url ?? ''}
            onChange={e => patchEspring({ floating_cta_url: e.target.value || null })}
            placeholder="https://your-landing-page.com"
            hint="Where the button sends the client. Leave blank to just scroll to the CTA section below."
          />
          {/* Live preview of the resulting (possibly mixed) pairing */}
          <div className="rounded-xl border border-white/10 bg-navy/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1.5">Preview</p>
            <p className="text-white/70 text-xs">{espring.floating_cta_label || '—'}</p>
            <span className="inline-block mt-2 text-xs font-semibold rounded-full bg-aqua text-navy px-3 py-1">{espring.floating_cta_button || '—'}</span>
          </div>
        </div>

        {/* Consultant / closing-CTA contact details */}
        <div className="space-y-3 bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div>
            <h3 className="text-white font-semibold text-sm">Consultant Contact (Closing CTA)</h3>
            <p className="text-xs text-white/50">Surfaced in the final &ldquo;take action&rdquo; section of the client report.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Consultant Name" type="text" value={espring.consultant_name ?? ''} onChange={e => patchEspring({ consultant_name: e.target.value || null })} hint="Shown as the named contact" />
            <Input label="Consultant Phone" type="tel" value={espring.consultant_phone ?? ''} onChange={e => patchEspring({ consultant_phone: e.target.value || null })} hint="Click-to-call link" />
            <Input label="Consultant Email" type="email" value={espring.consultant_email ?? ''} onChange={e => patchEspring({ consultant_email: e.target.value || null })} hint="Click-to-email link" />
            <Input label="Booking URL" type="url" value={espring.booking_url ?? ''} onChange={e => patchEspring({ booking_url: e.target.value || null })} hint="Calendly / Cal.com / your own scheduler" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">Warranty / Risk-Reversal Statement</label>
            <textarea
              rows={2}
              value={espring.warranty_text ?? ''}
              placeholder="e.g. eSpring is backed by a 3-year manufacturer&apos;s warranty and NSF-certified components."
              onChange={e => patchEspring({ warranty_text: e.target.value || null })}
              className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/50 py-3 px-4 focus:outline-none focus:border-aqua/60 transition-all resize-none text-sm"
            />
          </div>
        </div>

        {/* Logo upload */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white/80">PDF Branding Logo</label>
          {espring.logo_url && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={espring.logo_url} alt="Logo" className="h-10 object-contain rounded border border-white/10 bg-white/5 p-1" />
              <span className="text-xs text-white/60">Current logo</span>
            </div>
          )}
          <label className="flex items-center gap-3 bg-white/5 border border-white/10 border-dashed rounded-xl px-5 py-4 cursor-pointer hover:bg-white/10 transition-all">
            <Upload className="w-5 h-5 text-white/60" />
            <span className="text-white/60 text-sm">{uploadingLogo ? 'Uploading…' : 'Upload logo (PNG, SVG, JPG)'}</span>
            <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" disabled={uploadingLogo} />
          </label>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* ── Report PDF Templates ── */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-aqua" /> Report PDF Templates
            </h2>
            <p className="text-white/50 text-sm">Choose which sections appear in each downloadable report.</p>
          </div>
          <Button onClick={saveEspring} disabled={saving === 'espring'} size="sm">
            {saving === 'espring' ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'espring' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saved === 'espring' ? 'Saved!' : 'Save'}
          </Button>
        </div>

        {/* Default client tier */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-white text-sm font-medium">Default tier for new clients</p>
            <p className="text-white/60 text-xs">Which reports a newly-invited client can download (you can change it per client).</p>
          </div>
          <select
            value={espring.default_client_tier ?? 'full'}
            onChange={e => patchEspring({ default_client_tier: e.target.value as DownloadTier })}
            className="bg-white/5 border border-white/10 rounded-lg text-white text-sm py-2 px-3 focus:outline-none focus:border-aqua/60"
          >
            {TIER_ORDER.map(t => <option key={t} value={t} className="bg-navy">{TIER_LABELS[t]}</option>)}
          </select>
        </div>

        {/* Section checkbox grid */}
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[460px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs text-white/60 uppercase tracking-wider pb-2 font-medium">Section</th>
                {TEMPLATE_ORDER.map(t => (
                  <th key={t} className="text-center text-xs text-white/60 uppercase tracking-wider pb-2 font-semibold w-24">
                    {TEMPLATE_LABELS[t]}
                  </th>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 text-[10px] text-white/60">Quick toggle →</td>
                {TEMPLATE_ORDER.map(t => (
                  <td key={t} className="text-center py-1.5">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => setTemplate(t, [...ALL_SECTION_IDS])} className="text-[10px] text-aqua/80 hover:text-aqua">All</button>
                      <button onClick={() => setTemplate(t, [])} className="text-[10px] text-white/60 hover:text-white/70">Clear</button>
                    </div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {REPORT_SECTIONS.map(section => (
                <tr key={section.id} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-2">
                    <div className="text-sm text-white/80">
                      <span className="text-white/60 tabular-nums mr-1.5">{section.number}.</span>
                      {section.title}
                    </div>
                    <div className="text-[10px] text-white/60 leading-tight">{section.description}</div>
                  </td>
                  {TEMPLATE_ORDER.map(t => (
                    <td key={t} className="text-center py-2.5">
                      <input
                        type="checkbox"
                        checked={isInTemplate(t, section.id)}
                        onChange={() => toggleSection(t, section.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-aqua focus:ring-aqua/50 cursor-pointer accent-aqua"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-white/60 leading-relaxed">
          Brief = quick summary · Standard = the main story · Full = every detail. A client&apos;s download tier (set per client) controls which of these they can actually download.
        </p>
      </div>

      <div className="h-px bg-white/10" />

      {/* PayPal Config */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">PayPal Financing</h2>
            <p className="text-white/50 text-sm">Hard-coded from Amway published values — update if pricing changes</p>
          </div>
          <Button onClick={savePaypal} disabled={saving === 'paypal'} size="sm">
            {saving === 'paypal' ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'paypal' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saved === 'paypal' ? 'Saved!' : 'Save'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Standard APR" type="number" step="0.1" value={(paypal.standard_apr * 100).toFixed(0)} onChange={e => patchPaypal({ standard_apr: parseFloat(e.target.value) / 100 })} suffix="%" hint="Displayed as informational only" />
          <Input label="Promotional APR (best case)" type="number" step="0.1" value={(paypal.promo_apr * 100).toFixed(0)} onChange={e => patchPaypal({ promo_apr: parseFloat(e.target.value) / 100 })} suffix="%" />
        </div>

        {/* 6-month plan */}
        <div className="space-y-3 bg-white/3 border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-semibold text-sm">6-Month Plan</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Monthly payment" type="number" step="0.01" value={paypal.plan_6_monthly} onChange={e => patchPaypal({ plan_6_monthly: parseFloat(e.target.value) })} prefix="$" />
            <Input label="Total interest" type="number" step="0.01" value={paypal.plan_6_interest} onChange={e => patchPaypal({ plan_6_interest: parseFloat(e.target.value) })} prefix="$" />
            <Input label="Total paid" type="number" step="0.01" value={paypal.plan_6_total} onChange={e => patchPaypal({ plan_6_total: parseFloat(e.target.value) })} prefix="$" />
          </div>
        </div>

        {/* 12-month plan */}
        <div className="space-y-3 bg-white/3 border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-semibold text-sm">12-Month Plan</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Monthly payment" type="number" step="0.01" value={paypal.plan_12_monthly} onChange={e => patchPaypal({ plan_12_monthly: parseFloat(e.target.value) })} prefix="$" />
            <Input label="Total interest" type="number" step="0.01" value={paypal.plan_12_interest} onChange={e => patchPaypal({ plan_12_interest: parseFloat(e.target.value) })} prefix="$" />
            <Input label="Total paid" type="number" step="0.01" value={paypal.plan_12_total} onChange={e => patchPaypal({ plan_12_total: parseFloat(e.target.value) })} prefix="$" />
          </div>
        </div>

        {/* 24-month plan */}
        <div className="space-y-3 bg-white/3 border border-white/5 rounded-xl p-4">
          <h3 className="text-white font-semibold text-sm">24-Month Plan</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Monthly payment" type="number" step="0.01" value={paypal.plan_24_monthly} onChange={e => patchPaypal({ plan_24_monthly: parseFloat(e.target.value) })} prefix="$" />
            <Input label="Total interest" type="number" step="0.01" value={paypal.plan_24_interest} onChange={e => patchPaypal({ plan_24_interest: parseFloat(e.target.value) })} prefix="$" />
            <Input label="Total paid" type="number" step="0.01" value={paypal.plan_24_total} onChange={e => patchPaypal({ plan_24_total: parseFloat(e.target.value) })} prefix="$" />
          </div>
        </div>
      </div>
    </div>
  )
}
