'use client'

import { useState } from 'react'
import { CalculationResult, ESpringConfig, PayPalConfig } from '@/types'
import {
  DownloadTier, TemplateName, SectionId,
  TIER_TEMPLATES, TEMPLATE_LABELS, TEMPLATE_BLURBS, DEFAULT_PDF_TEMPLATES,
} from '@/lib/report-sections'
import { generateReportPdf } from '@/lib/pdf/generate'
import { Download, Loader2, FileText } from 'lucide-react'

interface Props {
  result: CalculationResult
  espring: ESpringConfig
  paypal: PayPalConfig
  tier: DownloadTier
}

/** Rough page-count hint so the client can pick by context */
function pageHint(count: number): string {
  if (count <= 5) return '~1 page'
  if (count <= 9) return '~2–3 pages'
  if (count <= 13) return '~4–5 pages'
  return '~6–8 pages'
}

export default function ReportDownloadCard({ result, espring, paypal, tier }: Props) {
  const [generating, setGenerating] = useState<TemplateName | null>(null)
  const allowed = TIER_TEMPLATES[tier] ?? []

  // No downloads permitted for this client → hide the card entirely.
  if (allowed.length === 0) return null

  const templates = espring.pdf_templates ?? DEFAULT_PDF_TEMPLATES

  async function download(template: TemplateName) {
    setGenerating(template)
    try {
      const ids = (templates[template] ?? []) as SectionId[]
      if (ids.length === 0) return
      await generateReportPdf({ sectionIds: ids, template, result, espring, paypal })
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-aqua" />
        <p className="text-white font-semibold">Download Your Report</p>
      </div>
      <div className="space-y-2">
        {allowed.map(t => {
          const count = (templates[t] ?? []).length
          const busy = generating === t
          return (
            <button
              key={t}
              onClick={() => download(t)}
              disabled={generating !== null || count === 0}
              className="w-full flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl px-4 py-3.5 transition-all disabled:opacity-50"
            >
              <span className="flex items-center gap-3 min-w-0">
                {busy
                  ? <Loader2 className="w-4 h-4 text-aqua animate-spin flex-shrink-0" />
                  : <Download className="w-4 h-4 text-aqua flex-shrink-0" />}
                <span className="text-left min-w-0">
                  <span className="text-white text-sm font-semibold block">
                    {busy ? 'Generating…' : `${TEMPLATE_LABELS[t]} Report`}
                  </span>
                  <span className="text-white/60 text-xs">{TEMPLATE_BLURBS[t]} · {pageHint(count)}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
