import { CalculationResult, ESpringConfig, PayPalConfig } from '@/types'
import { SectionId, SECTION_BY_ID } from '@/lib/report-sections'
import { formatCurrency } from '@/lib/utils'

/**
 * Print-optimized HTML generators, one per report section.
 *
 * Each returns a self-contained HTML string (inline styles only — html2canvas
 * does not inherit the app's Tailwind sheet). The PDF orchestrator concatenates
 * the selected sections and rasterizes them. Content mirrors the on-screen
 * sections but is laid out for a static A4 page (no tabs, no interactivity).
 */

type Renderer = (r: CalculationResult, espring: ESpringConfig, paypal: PayPalConfig) => string

// ── shared style fragments ───────────────────────────────────────────────────
const SECTION = 'margin-bottom:30px'
const KICKER = 'font-size:11px;font-weight:700;color:#00B4D8;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 4px'
const TITLE = 'font-size:22px;font-weight:800;color:#ffffff;margin:0 0 14px'
const CARD = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px'
const MUTED = 'color:rgba(255,255,255,0.55)'

const BOTTLE_L = 0.5
const KG_PER_L = 1.05

/**
 * Section header. The title is always pulled from the central registry
 * (report-sections.ts) so the PDF headers stay in lockstep with the admin
 * template/tier listing — change a title in one place and it updates here too.
 * The optional kicker is a PDF-only descriptive eyebrow (no section numbers).
 */
function head(id: SectionId, kicker?: string): string {
  const title = SECTION_BY_ID[id].title
  return `${kicker ? `<p style="${KICKER}">${kicker}</p>` : ''}<h3 style="${TITLE}">${title}</h3>`
}

function planRow(label: string, monthly: string, interest: string, total: string, highlight = false): string {
  const bg = highlight ? 'background:rgba(0,180,216,0.08)' : ''
  return `<tr style="${bg}">
    <td style="padding:10px 8px;color:#fff;font-weight:600;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06)">${label}</td>
    <td style="padding:10px 8px;text-align:right;color:rgba(255,255,255,0.8);font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06)">${monthly}</td>
    <td style="padding:10px 8px;text-align:right;color:rgba(255,255,255,0.8);font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06)">${interest}</td>
    <td style="padding:10px 8px;text-align:right;color:#00B4D8;font-weight:700;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06)">${total}</td>
  </tr>`
}

export const SECTION_HTML: Record<SectionId, Renderer> = {
  inputs: (r) => {
    const { inputs: i, annualSpend: a } = r
    const sym = i.currencySymbol
    const unit = i.purchaseUnit === 'bottle' ? 'bottle(s)' : i.purchaseUnit === 'case' ? 'case(s)' : '5-gallon jug(s)'
    const freq = i.purchaseFrequency === 'day' ? 'per day' : i.purchaseFrequency === 'week' ? 'per week' : 'per month'
    const rows: string[] = []
    rows.push(`<p style="margin:0 0 8px;color:#fff;font-size:13px">Household: <b>${i.householdSize}</b> &nbsp;·&nbsp; Country: <b>${i.country === 'CA' ? 'Canada' : 'United States'}</b></p>`)
    rows.push(`<p style="margin:0 0 8px;color:#fff;font-size:13px">Bottled water: <b>${i.purchaseQuantity} ${unit} ${freq}</b> at <b>${sym}${i.costPerUnit.toFixed(2)}</b> each = <b>${formatCurrency(a.bottledWaterAnnual, sym)}/yr</b></p>`)
    if (i.hasWaterDelivery) rows.push(`<p style="margin:0 0 8px;color:#fff;font-size:13px">Water delivery: <b>${formatCurrency(a.deliveryAnnual, sym)}/yr</b></p>`)
    if (i.hasHomeFiltration) rows.push(`<p style="margin:0 0 8px;color:#fff;font-size:13px">Home filtration: <b>${formatCurrency(a.filtrationAnnual, sym)}/yr</b></p>`)
    if (a.otherAnnual > 0) rows.push(`<p style="margin:0 0 8px;color:#fff;font-size:13px">Other water spend: <b>${formatCurrency(a.otherAnnual, sym)}/yr</b></p>`)
    return `<div style="${SECTION}">${head('inputs')}<div style="${CARD}">${rows.join('')}</div></div>`
  },

  annual_spend: (r) => {
    const { annualSpend: a, inputs: i, eSpringCostPerLitre } = r
    const sym = i.currencySymbol
    return `<div style="${SECTION}">${head('annual_spend')}
      <div style="background:linear-gradient(135deg,rgba(0,180,216,0.2),rgba(0,150,180,0.1));border:1px solid rgba(0,180,216,0.3);border-radius:14px;padding:26px;text-align:center;margin-bottom:14px">
        <p style="${MUTED};font-size:13px;margin:0 0 6px">You currently spend</p>
        <p style="font-size:46px;font-weight:900;color:#fff;margin:0;line-height:1">${formatCurrency(a.total, sym)}</p>
        <p style="${MUTED};font-size:13px;margin:6px 0 0">every year on water &nbsp;·&nbsp; ${Math.round(a.annualLitres).toLocaleString()} litres/year</p>
      </div>
      <div style="display:flex;gap:12px">
        <div style="flex:1;${CARD};text-align:center">
          <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:0 0 6px;text-transform:uppercase">Your cost per litre</p>
          <p style="font-size:24px;font-weight:800;color:#f87171;margin:0">${formatCurrency(a.costPerLitre, sym)}</p>
        </div>
        <div style="flex:1;background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.2);border-radius:14px;padding:20px;text-align:center">
          <p style="font-size:11px;color:rgba(0,180,216,0.7);margin:0 0 6px;text-transform:uppercase">eSpring per litre</p>
          <p style="font-size:24px;font-weight:800;color:#00B4D8;margin:0">${formatCurrency(eSpringCostPerLitre, sym)}</p>
        </div>
      </div></div>`
  },

  money_lost: (r) => {
    const { annualSpend: a, inputs: i } = r
    const sym = i.currencySymbol
    const past = a.total * 5
    const perDay = a.total / 365
    return `<div style="${SECTION}">${head('money_lost', 'A Hard Truth')}
      <div style="background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(249,115,22,0.1));border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:26px;text-align:center">
        <p style="${MUTED};font-size:13px;margin:0 0 6px">If you&rsquo;ve bought water this way for 5 years, you&rsquo;ve already poured</p>
        <p style="font-size:42px;font-weight:900;color:#fca5a5;margin:0;line-height:1">${formatCurrency(past, sym)}</p>
        <p style="color:rgba(252,165,165,0.8);font-size:13px;margin:8px 0 0">down the drain — about ${formatCurrency(perDay, sym)}/day, every day.</p>
      </div></div>`
  },

  payment_plans: (r, espring, paypal) => {
    const sym = r.inputs.currencySymbol
    return `<div style="${SECTION}">${head('payment_plans')}
      <table style="width:100%;border-collapse:collapse;${CARD};padding:0;overflow:hidden">
        <thead><tr style="background:rgba(255,255,255,0.04)">
          <th style="text-align:left;padding:10px 8px;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase">Plan</th>
          <th style="text-align:right;padding:10px 8px;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase">Monthly</th>
          <th style="text-align:right;padding:10px 8px;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase">Interest</th>
          <th style="text-align:right;padding:10px 8px;font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase">Total</th>
        </tr></thead>
        <tbody>
          ${planRow('Pay in Full', '—', formatCurrency(0, sym), formatCurrency(espring.unit_price, sym), true)}
          ${planRow('6-Month', `${sym}${paypal.plan_6_monthly.toFixed(2)}`, formatCurrency(paypal.plan_6_interest, sym), formatCurrency(paypal.plan_6_total, sym))}
          ${planRow('12-Month', `${sym}${paypal.plan_12_monthly.toFixed(2)}`, formatCurrency(paypal.plan_12_interest, sym), formatCurrency(paypal.plan_12_total, sym))}
          ${planRow('24-Month', `${sym}${paypal.plan_24_monthly.toFixed(2)}`, formatCurrency(paypal.plan_24_interest, sym), formatCurrency(paypal.plan_24_total, sym))}
        </tbody>
      </table>
      <p style="font-size:10px;${MUTED};margin:8px 0 0">Est. APR ${(paypal.standard_apr * 100).toFixed(0)}%. Qualifying customers may receive ${(paypal.promo_apr * 100).toFixed(0)}% promotional APR. Financing via PayPal.</p></div>`
  },

  money_story: (r) => {
    const { inputs: i, comparisonRows, monthlyFreedBudget, annualSpend } = r
    const sym = i.currencySymbol
    const tenYear = comparisonRows[comparisonRows.length - 1]
    const savings = Math.max(0, tenYear.currentSpend - tenYear.eSpringCash)
    const currentMonthly = annualSpend.total / 12
    return `<div style="${SECTION}">${head('money_story')}
      <div style="background:linear-gradient(135deg,rgba(52,211,153,0.12),rgba(0,180,216,0.08));border:1px solid rgba(52,211,153,0.3);border-radius:14px;padding:26px;text-align:center;margin-bottom:14px">
        <p style="${MUTED};font-size:13px;margin:0 0 6px">Paying cash, over 10 years you&rsquo;ll keep</p>
        <p style="font-size:46px;font-weight:900;color:#6ee7b7;margin:0;line-height:1">${formatCurrency(savings, sym)}</p>
        <p style="color:rgba(110,231,183,0.85);font-size:13px;margin:6px 0 0">in your pocket instead of in plastic bottles</p>
      </div>
      <div style="display:flex;gap:10px">
        <div style="flex:1;${CARD};text-align:center"><p style="font-size:10px;color:#fca5a5;margin:0 0 4px;text-transform:uppercase">Today</p><p style="font-size:22px;font-weight:800;color:#fca5a5;margin:0">${sym}${Math.round(currentMonthly)}</p><p style="font-size:10px;${MUTED};margin:4px 0 0">/mo out on water</p></div>
        <div style="flex:1;${CARD};text-align:center"><p style="font-size:10px;color:#00B4D8;margin:0 0 4px;text-transform:uppercase">After payoff</p><p style="font-size:22px;font-weight:800;color:#6ee7b7;margin:0">${sym}${Math.round(monthlyFreedBudget)}</p><p style="font-size:10px;${MUTED};margin:4px 0 0">/mo back in pocket</p></div>
      </div></div>`
  },

  yearly_breakdown: (r) => {
    const { inputs: i, comparisonRows } = r
    const sym = i.currencySymbol
    const body = comparisonRows.map((row, idx) => {
      const save = Math.max(0, row.currentSpend - row.eSpringCash)
      return `<tr style="${idx % 2 ? 'background:rgba(255,255,255,0.02)' : ''}">
        <td style="padding:7px 8px;color:rgba(255,255,255,0.7);font-size:12px">${row.label}</td>
        <td style="padding:7px 8px;text-align:right;color:#fca5a5;font-size:12px">${formatCurrency(row.currentSpend, sym)}</td>
        <td style="padding:7px 8px;text-align:right;color:#00B4D8;font-size:12px">${formatCurrency(row.eSpringCash, sym)}</td>
        <td style="padding:7px 8px;text-align:right;color:#6ee7b7;font-weight:600;font-size:12px">${formatCurrency(save, sym)}</td>
      </tr>`
    }).join('')
    return `<div style="${SECTION}">${head('yearly_breakdown')}
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
          <th style="text-align:left;padding:7px 8px;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase"></th>
          <th style="text-align:right;padding:7px 8px;font-size:10px;color:#f87171;text-transform:uppercase">Current</th>
          <th style="text-align:right;padding:7px 8px;font-size:10px;color:#00B4D8;text-transform:uppercase">eSpring Cash</th>
          <th style="text-align:right;padding:7px 8px;font-size:10px;color:#34d399;text-transform:uppercase">You Save</th>
        </tr></thead><tbody>${body}</tbody>
      </table></div>`
  },

  plastic_volume: (r) => {
    const { annualSpend: a } = r
    const bottles = Math.round((a.annualLitres * 10) / BOTTLE_L)
    if (bottles < 50) return ''
    return `<div style="${SECTION}">${head('plastic_volume', 'The Plastic Reality')}
      <div style="background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(249,115,22,0.08));border:1px solid rgba(245,158,11,0.3);border-radius:14px;padding:26px;text-align:center">
        <p style="${MUTED};font-size:13px;margin:0 0 6px">Over the next 10 years, your household will throw away</p>
        <p style="font-size:44px;font-weight:900;color:#fcd34d;margin:0;line-height:1">${bottles.toLocaleString()}</p>
        <p style="color:rgba(252,211,77,0.85);font-size:13px;margin:6px 0 0">plastic bottles</p>
      </div></div>`
  },

  plastic_scale: (r) => {
    const { annualSpend: a } = r
    const bottles = Math.round((a.annualLitres * 10) / BOTTLE_L)
    if (bottles < 50) return ''
    const km = (bottles * 0.22 / 1000).toFixed(1)
    const m = bottles * 0.22
    const anchor = m > 8848 ? `taller than Mount Everest (${km} km of plastic)`
      : m > 4421 ? `taller than Mount Whitney (${km} km of plastic)`
      : m > 1000 ? `${km} km of plastic — higher than any building on Earth`
      : m > 553 ? 'taller than the CN Tower in Toronto'
      : m > 93 ? 'taller than the Statue of Liberty'
      : `${Math.round(m)} m of plastic`
    return `<div style="${SECTION}"><div style="${CARD}">
      <p style="color:#fff;font-size:14px;margin:0">Stacked end-to-end, that&rsquo;s <b style="color:#fcd34d">${anchor}</b> — all from one household, one bottle at a time.</p>
    </div></div>`
  },

  microplastics: () => {
    return `<div style="${SECTION}"><div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.3);border-radius:14px;padding:20px">
      <p style="color:#fff;font-weight:700;font-size:15px;margin:0 0 6px">240,000 plastic particles in every litre</p>
      <p style="color:rgba(255,255,255,0.7);font-size:12px;line-height:1.6;margin:0">On average, a litre of bottled water carries about 240,000 plastic fragments — 10 to 100× more than scientists previously believed (Qian et al., PNAS, Columbia &amp; Rutgers, 2024). About 90% are nanoplastics small enough to cross the gut into the bloodstream; the same particles have been detected in human blood, placentas, and brain tissue. eSpring&rsquo;s NSF-certified filtration removes more than 99% of microplastics, lead, mercury, pesticides, and 140+ other contaminants.</p>
    </div></div>`
  },

  recycling_myth: () => {
    return `<div style="${SECTION}"><div style="${CARD}">
      <p style="color:#fff;font-size:14px;margin:0">Globally, only <b style="color:#fcd34d">9%</b> of plastic bottles are recycled. The other 91% end up in landfills, oceans, or are burned.</p>
    </div></div>`
  },

  convenience_weight: (r) => {
    const { annualSpend: a } = r
    const kg = Math.round(a.annualLitres * KG_PER_L * 10)
    if (kg < 100) return ''
    return `<div style="${SECTION}">${head('convenience_weight', 'The Hidden Cost')}
      <div style="${CARD}"><p style="font-size:30px;font-weight:900;color:#fff;margin:0">${kg.toLocaleString()} <span style="font-size:15px;${MUTED}">kg</span></p>
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:6px 0 0">Over 10 years you&rsquo;ll haul this much water through your front door. eSpring eliminates every trip.</p></div></div>`
  },

  convenience_time: (r) => {
    const { annualSpend: a } = r
    const hours = Math.round(((a.annualLitres * 10) / 50) * 0.5)
    if (hours < 1) return ''
    return `<div style="${SECTION}"><div style="${CARD}"><p style="font-size:30px;font-weight:900;color:#fff;margin:0">${hours.toLocaleString()} <span style="font-size:15px;${MUTED}">hrs</span></p>
      <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:6px 0 0">About ${Math.round(hours / 8)} full days over 10 years spent shopping for, lugging, and storing water.</p></div></div>`
  },

  break_even: (r) => {
    const { breakEven: b, inputs: i, monthlyFreedBudget } = r
    const sym = i.currencySymbol
    return `<div style="${SECTION}">${head('break_even')}
      <div style="background:linear-gradient(135deg,rgba(52,211,153,0.18),rgba(0,180,216,0.08));border:1px solid rgba(52,211,153,0.3);border-radius:14px;padding:24px;margin-bottom:14px">
        <p style="${MUTED};font-size:13px;margin:0 0 4px">${i.firstName}, your eSpring pays for itself by</p>
        <p style="font-size:30px;font-weight:900;color:#fff;margin:0">${b.monthLabel}</p>
        <p style="${MUTED};font-size:12px;margin:8px 0 0">After that, you keep about ${formatCurrency(monthlyFreedBudget, sym)} every month.</p>
      </div>
      <div style="display:flex;gap:12px">
        <div style="flex:1;${CARD};text-align:center"><p style="font-size:11px;${MUTED};margin:0 0 4px;text-transform:uppercase">5-Year Savings</p><p style="font-size:22px;font-weight:800;color:#34d399;margin:0">${formatCurrency(b.totalSavedAt5Years, sym)}</p></div>
        <div style="flex:1;${CARD};text-align:center"><p style="font-size:11px;${MUTED};margin:0 0 4px;text-transform:uppercase">10-Year Savings</p><p style="font-size:22px;font-weight:800;color:#34d399;margin:0">${formatCurrency(b.totalSavedAt10Years, sym)}</p></div>
      </div></div>`
  },

  ten_year_chart: (r) => {
    const { tenYearProjection: p, inputs: i } = r
    const sym = i.currencySymbol
    const max = Math.max(...p.map(y => Math.max(y.currentSpendCumulative, y.eSpringCashCumulative)))
    const bars = p.map(y => {
      const cur = (y.currentSpendCumulative / max) * 100
      const esp = (y.eSpringCashCumulative / max) * 100
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="width:30px;font-size:10px;${MUTED};text-align:right">Yr ${y.year}</span>
        <div style="flex:1;position:relative;height:14px">
          <div style="position:absolute;inset:0 ${100 - cur}% 0 0;background:rgba(248,113,113,0.5);border-radius:3px"></div>
          <div style="position:absolute;inset:0 ${100 - esp}% 0 0;background:rgba(0,180,216,0.7);border-radius:3px"></div>
        </div>
        <span style="width:64px;font-size:10px;color:#fca5a5;text-align:right">${formatCurrency(y.currentSpendCumulative, sym)}</span>
      </div>`
    }).join('')
    return `<div style="${SECTION}">${head('ten_year_chart')}
      <div style="${CARD}">${bars}
      <p style="font-size:10px;${MUTED};margin:10px 0 0"><span style="color:#fca5a5">■</span> Bottled water (cumulative) &nbsp; <span style="color:#00B4D8">■</span> eSpring (cumulative)</p></div></div>`
  },

  wealth_ladder: (r, espring) => {
    const { inputs: i, tenYearProjection: p } = r
    const sym = i.currencySymbol
    const tenYear = p[p.length - 1]
    const seed = Math.max(0, tenYear.currentSpendCumulative - tenYear.eSpringCashCumulative)
    if (seed < 500) return ''
    const rate = espring.assumed_return_rate * 100
    const yrs = rate > 0 ? 72 / rate : 0
    const rows = [0, 1, 2, 3, 4].map(n => {
      const amt = seed * Math.pow(2, n)
      const label = n === 0 ? 'Seed' : `+${Math.round(yrs * n)} yrs`
      return `<tr><td style="padding:6px 8px;color:#00B4D8;font-weight:700;font-size:12px">${label}</td>
        <td style="padding:6px 8px;text-align:right;color:#fff;font-weight:700;font-size:13px">${formatCurrency(amt, sym)}</td>
        <td style="padding:6px 8px;text-align:right;${MUTED};font-size:11px">${n === 0 ? '' : `×${Math.pow(2, n)}`}</td></tr>`
    }).join('')
    return `<div style="${SECTION}">${head('wealth_ladder', 'What This Becomes')}
      <p style="${MUTED};font-size:12px;margin:0 0 10px">At ${rate.toFixed(0)}% (S&amp;P 500 / TSX long-run average), the Rule of 72 says your savings double roughly every ${yrs.toFixed(0)} years.</p>
      <table style="width:100%;border-collapse:collapse;${CARD};padding:6px">${rows}</table>
      <p style="font-size:10px;${MUTED};margin:8px 0 0">Illustrative only — not investment advice. Past performance does not guarantee future results.</p></div>`
  },

  wealth_destinations: (r) => {
    const { inputs: i, tenYearProjection: p } = r
    const sym = i.currencySymbol
    const tenYear = p[p.length - 1]
    const seed = Math.max(0, tenYear.currentSpendCumulative - tenYear.eSpringCashCumulative)
    if (seed < 500) return ''
    const isCA = i.country === 'CA'
    const items = [
      `${formatCurrency(seed, sym)} — an emergency fund for your family`,
      `${formatCurrency(seed * 2, sym)} — ${isCA ? 'roughly 3 years of undergraduate university tuition' : 'about one year of in-state college tuition'}`,
      `${formatCurrency(seed * 4, sym)} — a down payment on a starter home`,
      `${formatCurrency(seed * 8, sym)} — a meaningful ${isCA ? 'RRSP/TFSA' : '401(k)/IRA'} boost at retirement`,
    ].map(t => `<li style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 6px">${t}</li>`).join('')
    return `<div style="${SECTION}"><div style="${CARD}"><p style="color:#fff;font-weight:700;font-size:13px;margin:0 0 10px">What that money could fund</p><ul style="margin:0;padding-left:18px">${items}</ul></div></div>`
  },

  milestones: (r) => {
    const { breakEven: b, tenYearProjection: p, inputs: i } = r
    const sym = i.currencySymbol
    const d = (yrs: number) => { const x = new Date(); x.setFullYear(x.getFullYear() + yrs); return x.getFullYear() }
    const fiveYr = Math.max(0, p[4].currentSpendCumulative - p[4].eSpringCashCumulative)
    const tenYr = Math.max(0, p[9].currentSpendCumulative - p[9].eSpringCashCumulative)
    const items = [
      `<b style="color:#00B4D8">Next month</b> — switch to clean water; the last plastic bottle crosses your door`,
      `<b style="color:#6ee7b7">${b.monthLabel}</b> — your eSpring has paid for itself`,
      `<b style="color:#6ee7b7">${d(5)}</b> — ${formatCurrency(fiveYr, sym)} kept`,
      `<b style="color:#6ee7b7">${d(10)}</b> — ${formatCurrency(tenYr, sym)} kept`,
    ].map(t => `<li style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 7px">${t}</li>`).join('')
    return `<div style="${SECTION}">${head('milestones', 'Your Timeline')}<div style="${CARD}"><ul style="margin:0;padding-left:18px">${items}</ul></div></div>`
  },

  closing_cta: (r, espring) => {
    const { inputs: i, tenYearProjection: p } = r
    const sym = i.currencySymbol
    const tenYear = p[p.length - 1]
    const savings = Math.max(0, tenYear.currentSpendCumulative - tenYear.eSpringCashCumulative)
    const contact: string[] = []
    if (espring.consultant_name) contact.push(`<p style="color:#fff;font-size:13px;margin:0 0 6px">Talk to <b style="color:#00B4D8">${espring.consultant_name}</b> today</p>`)
    if (espring.consultant_phone) contact.push(`<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px">📞 ${espring.consultant_phone}</p>`)
    if (espring.consultant_email) contact.push(`<p style="color:rgba(255,255,255,0.8);font-size:13px;margin:0 0 4px">✉ ${espring.consultant_email}</p>`)
    if (espring.booking_url) contact.push(`<p style="color:#00B4D8;font-size:13px;margin:6px 0 0">${espring.booking_url}</p>`)
    const warranty = (espring.warranty_text && espring.warranty_text.trim())
      || `eSpring uses NSF-certified components engineered to last the unit's full design life. If anything fails during the warranty period, you're fully covered.`
    return `<div style="${SECTION}">
      <div style="background:linear-gradient(135deg,rgba(0,180,216,0.15),rgba(52,211,153,0.1));border:2px solid rgba(0,180,216,0.4);border-radius:16px;padding:28px;text-align:center">
        <h3 style="font-size:22px;font-weight:900;color:#fff;margin:0 0 6px">${i.firstName}, ready to keep ${formatCurrency(savings, sym)}?</h3>
        <p style="${MUTED};font-size:13px;margin:0 0 16px">${espring.cta_text}</p>
        ${contact.length ? `<div style="${CARD};margin-bottom:14px">${contact.join('')}</div>` : ''}
        <p style="color:rgba(255,255,255,0.6);font-size:11px;line-height:1.6;margin:0">${warranty}</p>
      </div></div>`
  },
}
