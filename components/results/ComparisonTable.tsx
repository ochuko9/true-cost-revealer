'use client'

import { useState } from 'react'
import { AnnualSpend, ComparisonRow, PayPalConfig } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Sparkles, TrendingUp, ChevronDown, ChevronUp, PiggyBank, CheckCircle2 } from 'lucide-react'

interface Props {
  rows: ComparisonRow[]
  sym: string
  paypal: PayPalConfig
  annualSpend: AnnualSpend
  monthlyFreedBudget: number
  /** The eSpring unit price — used by the Pay-in-Full tab */
  unitPrice: number
}

type Plan = 'cash' | '6' | '12' | '24'

const PLAN_LABELS: Record<Plan, string> = {
  'cash': 'Pay in Full',
  '6': '6-Month',
  '12': '12-Month',
  '24': '24-Month',
}
const PLAN_MONTHS: Record<Plan, number> = { 'cash': 0, '6': 6, '12': 12, '24': 24 }

function planValue(row: ComparisonRow, plan: Plan): number {
  if (plan === 'cash') return row.eSpringCash
  if (plan === '6')    return row.eSpring6Month
  if (plan === '12')   return row.eSpring12Month
  return row.eSpring24Month
}

/**
 * Plan-specific break-even: when the cumulative eSpring spend first drops below
 * the cumulative current bottled-water spend. Returns the month number and a
 * human-readable date.
 *
 * `upfront` lets the cash-purchase plan start at the unit price (with planMonths=0
 * and planMonthly=0), while financed plans pass 0 and build up monthly.
 */
function planBreakEvenMonth(
  currentMonthly: number,
  planMonthly: number,
  planMonths: number,
  ongoingMonthly: number,
  upfront = 0,
): { month: number; date: string } {
  let cumFin = upfront
  let cumCur = 0
  for (let m = 1; m <= 120; m++) {
    cumCur += currentMonthly
    cumFin += m <= planMonths ? planMonthly : ongoingMonthly
    if (cumFin < cumCur) {
      const d = new Date()
      d.setMonth(d.getMonth() + m)
      return { month: m, date: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
    }
  }
  const d = new Date()
  d.setMonth(d.getMonth() + 120)
  return { month: 120, date: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
}

export default function ComparisonTable({
  rows,
  sym,
  paypal,
  annualSpend,
  monthlyFreedBudget,
  unitPrice,
}: Props) {
  // Default to the 24-month plan — its monthly payment is the lowest, giving the
  // strongest first impression. Users can still switch tabs (including Pay-in-Full).
  const [plan, setPlan] = useState<Plan>('24')
  const [showTable, setShowTable] = useState(false)

  const isCash = plan === 'cash'

  // Plan-specific financial figures. Cash skips the monthly-payment plumbing and
  // pays the unit price up front — interest is therefore zero and "total" is just
  // the unit price.
  const planMonthlyPayment = isCash
    ? 0
    : plan === '6'  ? paypal.plan_6_monthly
    : plan === '12' ? paypal.plan_12_monthly
    : paypal.plan_24_monthly
  const planInterest = isCash
    ? 0
    : plan === '6'  ? paypal.plan_6_interest
    : plan === '12' ? paypal.plan_12_interest
    : paypal.plan_24_interest
  const planTotal = isCash
    ? unitPrice
    : plan === '6'  ? paypal.plan_6_total
    : plan === '12' ? paypal.plan_12_total
    : paypal.plan_24_total
  const planMonths = PLAN_MONTHS[plan]
  const planLabel = PLAN_LABELS[plan]

  // Money-flow figures
  const currentMonthly = annualSpend.total / 12
  const ongoingMonthly = Math.max(0, currentMonthly - monthlyFreedBudget)

  // Hero savings — 10-year cumulative
  const tenYearRow = rows[rows.length - 1]
  const tenYearSavings = Math.max(0, tenYearRow.currentSpend - planValue(tenYearRow, plan))

  // Annual savings, every year after the system is paid off
  const annualPostPayoff = monthlyFreedBudget * 12

  // When the plan turns net-positive vs bottled water. For cash, the upfront
  // lump sum is the unit price.
  const breakEvenForPlan = planBreakEvenMonth(
    currentMonthly,
    planMonthlyPayment,
    planMonths,
    ongoingMonthly,
    isCash ? unitPrice : 0,
  )
  // "Save from day one" doesn't apply to cash — there's an up-front outlay.
  const isImmediateWin = !isCash && planMonthlyPayment <= currentMonthly

  // Timeline (120 months = 10 years). Cash has no financing period to render —
  // the entire bar is "no more payments" territory.
  const payoffPct = Math.min(100, (planMonths / 120) * 100)
  const breakEvenPct = Math.min(100, (breakEvenForPlan.month / 120) * 100)

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white">Your Money Story</h3>
        <p className="text-white/50 text-sm">Pick a plan — see what it really means for your wallet.</p>
      </div>

      {/* Plan selector tabs — Pay in Full first, then 6/12/24-month financing */}
      <div className="space-y-2">
        <p className="text-xs text-white/60 uppercase tracking-wider">Payment plan</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['cash', '6', '12', '24'] as Plan[]).map(p => {
            const isThisCash = p === 'cash'
            const monthlyValue = p === '6'  ? paypal.plan_6_monthly
                               : p === '12' ? paypal.plan_12_monthly
                               : p === '24' ? paypal.plan_24_monthly
                               : 0
            const subtitle = isThisCash
              ? `${sym}${unitPrice.toFixed(0)} once`
              : `${sym}${monthlyValue.toFixed(0)}/mo`
            return (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  plan === p
                    ? 'bg-aqua text-navy border-aqua shadow-lg shadow-aqua/20'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="font-bold">{PLAN_LABELS[p]}</div>
                <div className={`text-xs ${plan === p ? 'text-navy/70' : 'text-white/60'}`}>
                  {subtitle}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ============ PLAN TERMS — financing transparency ============ */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-white/70 uppercase tracking-wider font-bold">{planLabel} — Terms</p>
          <p className="text-[10px] text-white/60">{isCash ? 'No financing — owned outright' : 'Financing via PayPal'}</p>
        </div>

        {/* Four-number breakdown. Labels adapt for cash: there's no monthly, the
            term is "paid in full", interest is zero, and total equals the unit price. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">{isCash ? 'One-time' : 'Monthly'}</p>
            <p className="text-base font-extrabold text-white tabular-nums">
              {isCash ? `${sym}${unitPrice.toFixed(2)}` : `${sym}${planMonthlyPayment.toFixed(2)}`}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Term</p>
            <p className="text-base font-extrabold text-white tabular-nums">
              {isCash ? 'Paid in full' : `${planMonths} months`}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-white/60 uppercase tracking-wider">Interest</p>
            <p className={`text-base font-extrabold tabular-nums ${isCash ? 'text-emerald-300' : 'text-white'}`}>
              {sym}{planInterest.toFixed(2)}
            </p>
          </div>
          <div className="bg-aqua/10 border border-aqua/30 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-aqua/70 uppercase tracking-wider">Total to pay</p>
            <p className="text-base font-extrabold text-aqua tabular-nums">{sym}{planTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* "Fully paid off" statement — adapts for cash (paid from day 1) */}
        <div className="bg-emerald-500/5 border border-emerald-400/30 rounded-xl px-3 py-2.5 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white leading-relaxed">
            {isCash ? (
              <>
                <span className="font-bold text-emerald-300">Paid in full from day one.</span>{' '}
                You own your eSpring outright immediately — zero interest, no monthly payments, no debt.
              </>
            ) : (
              <>
                <span className="font-bold text-emerald-300">Fully paid off after month {planMonths}.</span>{' '}
                No further payments — you own your eSpring outright for the rest of its life.
              </>
            )}
          </p>
        </div>

        {!isCash && (
          <p className="text-[10px] text-white/60 leading-relaxed">
            Estimated APR {(paypal.standard_apr * 100).toFixed(0)}%. Qualifying customers may receive {(paypal.promo_apr * 100).toFixed(0)}% promotional APR. No down payment, no late fees.
          </p>
        )}
        {isCash && (
          <p className="text-[10px] text-white/60 leading-relaxed">
            Pay-in-full saves <span className="text-emerald-300 font-semibold">{sym}{paypal.plan_24_interest.toFixed(2)}</span> in interest compared to the 24-month plan, and <span className="text-emerald-300 font-semibold">{sym}{paypal.plan_12_interest.toFixed(2)}</span> compared to the 12-month plan.
          </p>
        )}
      </div>

      {/* ============ SAVINGS SPOTLIGHT ============ */}
      <div className="space-y-5 bg-gradient-to-br from-emerald-500/10 via-aqua/5 to-teal-500/10 border border-emerald-400/30 rounded-3xl p-6">
        {/* Hero number */}
        <div className="text-center space-y-2">
          <p className="text-white/60 text-sm">
            With the <span className="text-white font-semibold">{planLabel} plan</span>, over the next 10 years you&apos;ll keep
          </p>
          <div className="py-1">
            <p className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-br from-emerald-300 via-aqua to-teal-300 bg-clip-text text-transparent leading-none">
              {formatCurrency(tenYearSavings, sym)}
            </p>
          </div>
          <p className="text-emerald-300/90 text-sm font-medium">in your pocket instead of in plastic bottles</p>
        </div>

        {/* Cash-flow story: three tiles — "out, out, back" pattern
            Plain-English captions; no ± math signs that confuse readers.
            Middle tile adapts for cash (one-time payment, not monthly). */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-red-500/5 border border-red-400/30 rounded-2xl p-3 text-center space-y-1">
            <p className="text-[10px] text-red-300/70 uppercase tracking-wider font-bold">Today</p>
            <p className="text-2xl font-extrabold text-red-300 leading-none">{sym}{Math.round(currentMonthly)}</p>
            <p className="text-[10px] text-white/50 leading-tight">leaves your wallet every month for water</p>
          </div>
          <div className="bg-aqua/5 border border-aqua/30 rounded-2xl p-3 text-center space-y-1">
            <p className="text-[10px] text-aqua/80 uppercase tracking-wider font-bold">
              {isCash ? 'Day 1' : `Months 1–${planMonths}`}
            </p>
            <p className="text-2xl font-extrabold text-aqua leading-none">
              {isCash ? `${sym}${Math.round(unitPrice)}` : `${sym}${Math.round(planMonthlyPayment)}`}
            </p>
            <p className="text-[10px] text-white/50 leading-tight">
              {isCash ? 'paid in full — one and done' : 'monthly payment toward your eSpring'}
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-400/40 rounded-2xl p-3 text-center space-y-1">
            <p className="text-[10px] text-emerald-300/80 uppercase tracking-wider font-bold">
              {isCash ? 'From day 1' : `From month ${planMonths + 1}`}
            </p>
            <p className="text-2xl font-extrabold text-emerald-300 leading-none">{sym}{Math.round(monthlyFreedBudget)}</p>
            <p className="text-[10px] text-white/50 leading-tight">stays in your wallet every month — for life</p>
          </div>
        </div>

        {/* Explicit "savings start" line so the user sees exactly when the wallet flips */}
        {monthlyFreedBudget > 1 && (
          <div className="bg-emerald-500/5 border border-emerald-400/20 rounded-xl px-4 py-2.5 text-center">
            <p className="text-emerald-200 text-sm">
              {isCash ? (
                <>
                  <span className="font-bold">From day one:</span> the{' '}
                  <span className="text-emerald-300 font-bold">{sym}{Math.round(monthlyFreedBudget)}</span>{' '}
                  you used to spend on bottled water stays in your account — every month, for life.
                </>
              ) : (
                <>
                  <span className="font-bold">Month {planMonths + 1} onward:</span> the{' '}
                  <span className="text-emerald-300 font-bold">{sym}{Math.round(monthlyFreedBudget)}</span>{' '}
                  you used to spend on bottled water stays in your account
                  {planMonths === 6 && ' — starting month 7, every month after, for life.'}
                  {planMonths === 12 && ' — starting just after your first year.'}
                  {planMonths === 24 && ' — starting just after year two.'}
                </>
              )}
            </p>
          </div>
        )}

        {/* Day-1 winner badge OR break-even moment */}
        {isImmediateWin ? (
          <div className="bg-emerald-500/15 border border-emerald-400/40 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <p className="text-white text-sm">
                <span className="text-emerald-300 font-bold">Save from day one.</span> Your monthly payment is{' '}
                <span className="text-emerald-300 font-bold">{sym}{Math.round(currentMonthly - planMonthlyPayment)}/month less</span>{' '}
                than what you pay for bottled water right now.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-navy-dark/40 border border-emerald-400/20 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-0.5">
              <p className="text-white text-sm">
                Your eSpring <span className="text-emerald-300 font-bold">pays for itself by {breakEvenForPlan.date}</span>
              </p>
              <p className="text-white/50 text-xs">
                Every dollar you would have spent on water after that, you keep.
              </p>
            </div>
          </div>
        )}

        {/* 10-year timeline visualisation.
            Aqua segment = financing period (months 1 to N).
            Emerald segment = no more payments (months N+1 to 120).
            Break-even marker = when bottled-water column catches up. */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-white/60 uppercase tracking-wider font-semibold">
            <span>Now</span>
            <span>10 years from now</span>
          </div>
          <div className="relative h-7 bg-white/5 rounded-full overflow-hidden border border-white/10">
            {/* Paying-off segment — exactly the financing period */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-aqua/50 to-aqua/40"
              style={{ width: `${payoffPct}%` }}
              title={`Paying off (${planMonths} months)`}
            />
            {/* No-payments segment — starts the moment financing ends */}
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-emerald-400/50 via-emerald-300/55 to-emerald-300/65"
              style={{ left: `${payoffPct}%`, right: 0 }}
              title={`No more payments (${(10 - planMonths / 12).toFixed(1)} years)`}
            />
            {/* "Paid off" marker — a bright vertical line right at the handoff */}
            <div
              className="absolute -inset-y-1 w-0.5 bg-emerald-200 shadow-[0_0_8px_rgba(167,243,208,0.9)]"
              style={{ left: `${payoffPct}%` }}
            />
            {/* Break-even marker — a subtler line, only render if it differs from payoff */}
            {Math.abs(breakEvenPct - payoffPct) > 1 && (
              <div
                className="absolute -inset-y-1 w-0.5 bg-emerald-300/60"
                style={{ left: `${breakEvenPct}%` }}
                title="Break-even — your bottled-water spend would have exceeded eSpring spend here"
              />
            )}
          </div>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/50">
            {!isCash && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-aqua/70" />
                Paying off ({planMonths} mo)
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300/80" />
              {isCash
                ? 'Owned outright (10 yrs)'
                : `No more payments (${(10 - planMonths / 12).toFixed(1)} yrs)`}
            </span>
          </div>
        </div>

        {/* Annual savings post-payoff — "yearly bonus" framing */}
        {annualPostPayoff > 100 && (
          <div className="bg-emerald-500/10 border border-emerald-400/40 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                <PiggyBank className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">Every year after payoff, you keep</p>
                <p className="text-white/50 text-xs">Like giving yourself a yearly bonus</p>
              </div>
            </div>
            <p className="text-emerald-300 font-extrabold text-xl whitespace-nowrap">
              +{sym}{Math.round(annualPostPayoff).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Detail table — collapsed by default to keep the spotlight as hero */}
      <div className="space-y-3">
        <button
          onClick={() => setShowTable(s => !s)}
          className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition-all"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-white/60" />
            <span className="text-white/80 text-sm font-medium">See the full year-by-year breakdown</span>
          </div>
          {showTable ? <ChevronUp className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
        </button>

        {showTable && (
          <div className="overflow-x-auto -mx-4 px-4 animate-fade-in">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr>
                  <th className="text-left text-xs text-white/60 uppercase tracking-wider pb-3 font-medium"></th>
                  <th className="text-right text-xs text-red-400/80 uppercase tracking-wider pb-3 font-medium">Current</th>
                  <th className="text-right text-xs text-aqua/80 uppercase tracking-wider pb-3 font-medium">eSpring Cash</th>
                  {!isCash && (
                    <th className="text-right text-xs text-teal-400/80 uppercase tracking-wider pb-3 font-medium">eSpring {planLabel}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, i) => {
                  const financed = planValue(row, plan)
                  const cashSaving = row.currentSpend - row.eSpringCash
                  const financedSaving = row.currentSpend - financed

                  // Net-position chip under each eSpring total. Friendly 3rd-grade
                  // language: "Saved $X" when ahead, "$X to go" when still inside
                  // the payback window. No jargon, no minus signs.
                  const netChip = (delta: number) =>
                    delta >= 0 ? (
                      <div className="text-xs text-emerald-400/90 font-medium mt-0.5">
                        Saved {formatCurrency(delta, sym)}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-300/80 mt-0.5">
                        {formatCurrency(-delta, sym)} to go
                      </div>
                    )

                  return (
                    <tr key={row.label} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                      <td className="py-4 pl-2 text-sm text-white/70 font-medium">{row.label}</td>
                      <td className="py-4 pr-2 text-right">
                        <span className="text-red-300 font-semibold text-sm">{formatCurrency(row.currentSpend, sym)}</span>
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <div>
                          <span className="text-aqua font-semibold text-sm">{formatCurrency(row.eSpringCash, sym)}</span>
                          {netChip(cashSaving)}
                        </div>
                      </td>
                      {!isCash && (
                        <td className="py-4 pr-2 text-right">
                          <div>
                            <span className="text-teal-300 font-semibold text-sm">{formatCurrency(financed, sym)}</span>
                            {netChip(financedSaving)}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="text-xs text-white/60 leading-relaxed mt-3">
              <span className="text-emerald-400/90 font-semibold">Saved</span> means you&apos;ve already spent less on eSpring than you would have on bottled water — you&apos;re ahead.{' '}
              <span className="text-amber-300/80 font-semibold">&ldquo;X to go&rdquo;</span> means you&apos;re still paying off your eSpring; in a few more months, the bottled-water column catches up and you flip to <span className="text-emerald-400/90 font-semibold">Saved</span>. The Spotlight above shows the monthly view.
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-white/60 leading-relaxed">
        Cumulative spend, year by year, across the eSpring&apos;s 10-year design lifetime. Estimated APR 26%. Some customers may qualify for 0% promotional APR. No down payment, no late fees. Financing provided by PayPal. Bottled water costs projected with 3% annual inflation; eSpring ongoing costs with 2% inflation. Filter cartridge and UV-C LED both wear on a usage basis (litres processed) — the UV-C LED is rated for the full life of the unit, so most households never replace it.
      </p>
    </section>
  )
}
