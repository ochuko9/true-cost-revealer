import { CalculationResult, ESpringConfig, PayPalConfig } from '@/types'
import { SectionId, TemplateName, TEMPLATE_LABELS, normalizeSectionIds } from '@/lib/report-sections'
import { SECTION_HTML } from './section-html'

// Page geometry (A4, millimetres)
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_TOP = 10
const MARGIN_BOTTOM = 10
const BLOCK_GAP = 3 // mm of breathing room between stacked sections
const RENDER_WIDTH_PX = 800 // off-screen render width; maps to full page width
const NAVY: [number, number, number] = [10, 22, 40] // #0A1628

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`

/**
 * Generate and download a section-driven PDF.
 *
 * Each section is rendered to its OWN image, then laid out on pages with
 * page-break awareness: a section that won't fit in the remaining space on the
 * current page moves to the next page intact. This avoids the readability
 * problem of slicing one giant canvas at arbitrary page boundaries (which cut
 * through text and callout boxes).
 */
export async function generateReportPdf(opts: {
  sectionIds: SectionId[]
  template: TemplateName
  result: CalculationResult
  espring: ESpringConfig
  paypal: PayPalConfig
}): Promise<void> {
  const { sectionIds: rawSectionIds, template, result, espring, paypal } = opts
  // Backstop: render strictly in registry order even if the passed list (e.g. an
  // older snapshot) is out of sequence. Membership is preserved; only order is fixed.
  const sectionIds = normalizeSectionIds(rawSectionIds)
  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  // Block 0 is the cover header; the rest are the selected sections.
  const headerHtml = `
    <div style="display:flex;align-items:center;gap:14px;padding-bottom:18px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1)">
      ${espring.logo_url ? `<img src="${espring.logo_url}" style="height:42px;object-fit:contain" crossorigin="anonymous" />` : ''}
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0;color:#fff">${result.inputs.firstName}'s Water Cost Report</h1>
        <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0 0">${TEMPLATE_LABELS[template]} report &middot; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
    </div>`

  const blockHtml = [
    headerHtml,
    ...sectionIds.map(id => SECTION_HTML[id]?.(result, espring, paypal) ?? ''),
  ].filter(Boolean)

  // ── Render each block to an image, capturing its aspect ratio ──
  const blocks: { data: string; ratio: number }[] = []
  for (const html of blockHtml) {
    const el = document.createElement('div')
    el.style.cssText =
      `position:fixed;left:-9999px;top:0;width:${RENDER_WIDTH_PX}px;padding:0 44px;` +
      `background:#0A1628;color:#fff;font-family:${FONT};box-sizing:border-box`
    el.innerHTML = html
    document.body.appendChild(el)
    try {
      // small beat so layout (and any logo image) settles
      await new Promise(r => setTimeout(r, 30))
      const canvas = await html2canvas(el, {
        backgroundColor: '#0A1628', useCORS: true, scale: 2, logging: false,
      } as Parameters<typeof html2canvas>[1])
      if (canvas.width > 0) {
        // JPEG (not PNG): sections are opaque over a solid navy background, so
        // there's no alpha to preserve, and JPEG shrinks the gradient-heavy
        // cards ~10× — the difference between a ~30MB and a ~3MB report.
        blocks.push({ data: canvas.toDataURL('image/jpeg', 0.9), ratio: canvas.height / canvas.width })
      }
    } finally {
      document.body.removeChild(el)
    }
  }

  // ── Lay blocks onto pages with page-break logic ──
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const usableH = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM

  const fillBg = () => {
    pdf.setFillColor(...NAVY)
    pdf.rect(0, 0, PAGE_W, PAGE_H, 'F')
  }

  fillBg()
  let cursorY = MARGIN_TOP

  for (const block of blocks) {
    let drawW = PAGE_W
    let drawH = PAGE_W * block.ratio

    // Defensive: if a single block is somehow taller than a full page, scale it
    // down to fit one page (centered) rather than clipping or splitting it.
    if (drawH > usableH) {
      const shrink = usableH / drawH
      drawH = usableH
      drawW = PAGE_W * shrink
    }

    // Move to a fresh page if this block won't fit in the remaining space.
    if (cursorY + drawH > PAGE_H - MARGIN_BOTTOM && cursorY > MARGIN_TOP) {
      pdf.addPage()
      fillBg()
      cursorY = MARGIN_TOP
    }

    const x = (PAGE_W - drawW) / 2 // center (only matters for shrunk blocks)
    pdf.addImage(block.data, 'JPEG', x, cursorY, drawW, drawH)
    cursorY += drawH + BLOCK_GAP
  }

  pdf.save(`${result.inputs.firstName}-water-report-${template}.pdf`)
}
