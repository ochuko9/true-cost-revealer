'use client'

import { CalculatorInputs, YearlyProjection } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { GraduationCap, Heart, Home, Plane, ShieldCheck, Sunset, TrendingUp } from 'lucide-react'

interface Props {
  inputs: CalculatorInputs
  projection: YearlyProjection[]
  /** Annual market-return assumption, e.g. 0.08 = 8% */
  assumedReturnRate: number
}

/** Calendar year, N years from today */
function calendarYearFromNow(yearsFromNow: number): number {
  return new Date().getFullYear() + Math.round(yearsFromNow)
}

/**
 * Wealth-Building section.
 *
 * Replaces the old indulgent-equivalencies block. Three stacked layers:
 *
 *   1. LADDER       — Rule of 72 doubling timeline (the math)
 *   2. DESTINATIONS — what those amounts would actually FUND in real life
 *                     (country-aware between US and Canada)
 *   3. ANCHORS      — two relatable "spend it" framings for buyers who'd
 *                     rather use the money than invest it
 *
 * Hits three buyer personalities in one section: financially-literate,
 * identity-driven (parents/planners), and present-focused.
 */
export default function WealthBuildingSection({ inputs, projection, assumedReturnRate }: Props) {
  const sym = inputs.currencySymbol
  const tenYear = projection[projection.length - 1]
  const seed = Math.max(0, tenYear.currentSpendCumulative - tenYear.eSpringCashCumulative)

  // No story to tell if there's no meaningful saving
  if (seed < 500) return null

  // Rule of 72
  const ratePct = assumedReturnRate * 100
  const yearsToDouble = ratePct > 0 ? 72 / ratePct : 0
  const ratePctLabel = ratePct.toFixed(ratePct % 1 === 0 ? 0 : 1)

  // Five points: seed, then four doublings.
  //
  // `badge` deliberately surfaces the GAP from the seed in years rather than a
  // calendar-year digit. This is the whole pedagogical point of Rule of 72: the
  // reader sees +N · +2N · +3N · +4N and the doubling rhythm jumps out without
  // any mental arithmetic.
  const gap = (n: number) => `+${Math.round(yearsToDouble * n)}`
  const ladder = [
    { offset: 10,                     amount: seed,      badge: 'Now',      note: 'what you saved from skipping bottled water' },
    { offset: 10 + yearsToDouble * 1, amount: seed * 2,  badge: gap(1),     note: 'one doubling' },
    { offset: 10 + yearsToDouble * 2, amount: seed * 4,  badge: gap(2),     note: 'two doublings' },
    { offset: 10 + yearsToDouble * 3, amount: seed * 8,  badge: gap(3),     note: 'three doublings' },
    { offset: 10 + yearsToDouble * 4, amount: seed * 16, badge: gap(4),     note: 'four doublings' },
  ]

  // Country-aware destinations
  const isCanada = inputs.country === 'CA'
  const tuitionLabel  = isCanada ? 'three years of undergraduate university tuition' : 'one year of in-state college tuition'
  const homeLabel     = isCanada ? 'down payment on a starter home outside Toronto / Vancouver' : 'down payment on a starter home in most US markets'
  const retireAccount = isCanada ? 'RRSP / TFSA' : '401(k) / IRA'

  const destinations = [
    {
      icon: <ShieldCheck className="w-5 h-5 text-aqua" />,
      amount: ladder[0].amount,
      caption: `An emergency fund — three to six months of breathing room for ${inputs.firstName}&apos;s family.`,
    },
    {
      icon: <GraduationCap className="w-5 h-5 text-aqua" />,
      amount: ladder[1].amount,
      caption: `Roughly ${tuitionLabel}.`,
    },
    {
      icon: <Home className="w-5 h-5 text-aqua" />,
      amount: ladder[2].amount,
      caption: `A ${homeLabel}.`,
    },
    {
      icon: <Sunset className="w-5 h-5 text-aqua" />,
      amount: ladder[3].amount,
      caption: `A meaningful boost to your ${retireAccount} when it&apos;s time to slow down.`,
    },
  ]

  // Relatable anchors — for the buyer who'd rather spend it
  const vacationCount = Math.floor(seed / 2500)
  const dateNightYears = Math.floor(seed / (52 * 80)) // $80 weekly date night, 52 weeks/yr
  const anchors = [
    vacationCount >= 1 && {
      icon: <Plane className="w-5 h-5 text-amber-300" />,
      label: `${vacationCount} family vacations`,
      sub: `at roughly ${formatCurrency(2500, sym)} each`,
    },
    dateNightYears >= 1 && {
      icon: <Heart className="w-5 h-5 text-amber-300" />,
      label: `${dateNightYears} years of weekly date nights`,
      sub: `at roughly ${formatCurrency(80, sym)} a week`,
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string; sub: string }>

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-aqua">What This Becomes</h2>
        <h3 className="text-2xl font-bold text-white">
          {inputs.firstName}, Your Water Money — Compounded
        </h3>
        <p className="text-white/50 text-sm">
          Your savings don&apos;t have to sit in a chequing account. At {ratePctLabel}% — the long-run S&amp;P 500 / TSX Composite average — the Rule of 72 says your money doubles roughly every {yearsToDouble.toFixed(0)} years.
        </p>
      </div>

      {/* ============ LAYER 1: LADDER ============ */}
      <div className="bg-gradient-to-br from-aqua/10 via-emerald-500/5 to-aqua/10 border border-aqua/30 rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-aqua" />
          <p className="text-xs text-aqua uppercase tracking-wider font-bold">The compounding ladder</p>
        </div>

        <div className="space-y-2">
          {ladder.map((rung, i) => {
            const isLast = i === ladder.length - 1
            const isSeed = i === 0
            // Multiplier vs. seed — drives both the ×N label and the growth bar width.
            // Width is normalised so the last row fills the bar to 100%.
            const multiplier = Math.pow(2, i)
            const widthPct = (multiplier / Math.pow(2, ladder.length - 1)) * 100
            return (
              <div
                key={i}
                className={`rounded-2xl px-4 py-3 border space-y-2 ${
                  isLast
                    ? 'bg-emerald-500/10 border-emerald-400/40'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {/* Row top: badge + amount + multiplier + calendar year */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`min-w-[52px] h-8 px-2.5 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 tabular-nums ${
                      isLast
                        ? 'bg-emerald-400/20 text-emerald-300'
                        : isSeed
                          ? 'bg-white/10 text-white/70'
                          : 'bg-aqua/15 text-aqua'
                    }`}>
                      {rung.badge}
                    </div>
                    <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                      <p className={`text-base font-extrabold tabular-nums ${isLast ? 'text-emerald-300' : 'text-white'}`}>
                        {formatCurrency(rung.amount, sym)}
                      </p>
                      {!isSeed && (
                        <span className={`text-xs font-bold tabular-nums ${isLast ? 'text-emerald-300/80' : 'text-aqua/80'}`}>
                          ×{multiplier}
                        </span>
                      )}
                      {isSeed && (
                        <span className="text-xs font-bold text-white/60 uppercase tracking-wider">seed</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/60 whitespace-nowrap">by {calendarYearFromNow(rung.offset)}</p>
                </div>

                {/* Proportional growth bar — width literally doubles every row, so
                    the compounding pattern is visible at a glance without reading any numbers. */}
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isLast
                        ? 'bg-gradient-to-r from-emerald-400/60 via-emerald-300/70 to-emerald-200/80'
                        : 'bg-gradient-to-r from-aqua/40 via-aqua/55 to-aqua/70'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                {/* Subtle note line */}
                <p className="text-[11px] text-white/50 leading-tight">
                  {isSeed ? rung.note : `${rung.note} — ${rung.badge} years invested`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============ LAYER 2: DESTINATIONS ============ */}
      <div className="space-y-3">
        <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">What that money could actually fund</p>
        <div className="space-y-2">
          {destinations.map((d, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-aqua/15 flex items-center justify-center flex-shrink-0">
                {d.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm tabular-nums">{formatCurrency(d.amount, sym)}</p>
                <p
                  className="text-white/60 text-xs leading-snug"
                  dangerouslySetInnerHTML={{ __html: d.caption }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ LAYER 3: ANCHORS ============ */}
      {anchors.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">
            Or, if you&apos;d rather spend it
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {anchors.map((a, i) => (
              <div key={i} className="flex items-center gap-3 bg-amber-500/5 border border-amber-400/20 rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-amber-400/15 flex items-center justify-center flex-shrink-0">
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold">{a.label}</p>
                  <p className="text-white/50 text-xs">{a.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closing line */}
      <p className="text-center text-white/70 text-sm font-medium px-2 leading-relaxed">
        The water you stopped buying funded all of this.
      </p>

      {/* Honest footnote */}
      <p className="text-xs text-white/60 leading-relaxed">
        Illustrative only — not investment advice. The {ratePctLabel}% figure reflects the long-run historical average of the S&amp;P 500 (US) and TSX Composite (Canada). Past performance does not guarantee future results. The Rule of 72 is a financial heuristic: years to double ≈ 72 ÷ annual return (%).
      </p>
    </section>
  )
}
