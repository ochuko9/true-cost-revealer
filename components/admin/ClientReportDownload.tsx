'use client'

import { useState } from 'react'
import { SavedReport } from '@/types'
import {
  TemplateName, SectionId,
  TEMPLATE_LABELS, DEFAULT_PDF_TEMPLATES,
} from '@/lib/report-sections'
import { generateReportPdf } from '@/lib/pdf/generate'
import { FileDown, Loader2, ChevronDown } from 'lucide-react'

// The admin can regenerate any template regardless of the client's download tier.
const TEMPLATES: TemplateName[] = ['brief', 'standard', 'full']

export default function ClientReportDownload({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [bundle, setBundle] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<TemplateName | null>(null)
  const [error, setError] = useState('')

  async function ensureBundle(): Promise<SavedReport | null> {
    if (bundle) return bundle
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/clients/report?id=${clientId}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'No saved report for this client yet.' : 'Failed to load report.')
        return null
      }
      const data = (await res.json()) as SavedReport
      setBundle(data)
      return data
    } catch {
      setError('Failed to load report.')
      return null
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle() {
    const next = !open
    setOpen(next)
    if (next) await ensureBundle()
  }

  async function download(template: TemplateName) {
    const data = bundle ?? (await ensureBundle())
    if (!data) return
    setBusy(template)
    try {
      const templates = data.espring.pdf_templates ?? DEFAULT_PDF_TEMPLATES
      const ids = (templates[template] ?? []) as SectionId[]
      if (ids.length === 0) return
      await generateReportPdf({
        sectionIds: ids,
        template,
        result: data.result,
        espring: data.espring,
        paypal: data.paypal,
      })
    } catch (e) {
      console.error('Admin PDF generation failed:', e)
      setError('PDF generation failed.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="pt-1">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-aqua/80 hover:text-aqua transition-colors"
      >
        <FileDown className="w-3.5 h-3.5" />
        {open ? 'Hide report' : 'Download report'}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
          {loading && (
            <p className="text-white/60 text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading report…
            </p>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          {bundle && (
            <>
              <p className="text-white/60 text-xs">Generate as:</p>
              <div className="flex gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t}
                    onClick={() => download(t)}
                    disabled={busy !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white transition-all disabled:opacity-50"
                  >
                    {busy === t
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-aqua" />
                      : <FileDown className="w-3.5 h-3.5 text-aqua" />}
                    {TEMPLATE_LABELS[t]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
