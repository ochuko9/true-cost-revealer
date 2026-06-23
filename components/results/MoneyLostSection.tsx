'use client'

import { useEffect, useState } from 'react'
import { AnnualSpend, CalculatorInputs } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, TrendingDown } from 'lucide-react'

interface Props {
  annualSpend: AnnualSpend
  inputs: CalculatorInputs
  /** Years of bottled-water spending to assume in the historical loss number */
  yearsAssumed?: number
}

/**
 * Loss-aversion section.
 *
 * The previous sections show what the client *will* spend. This section confronts
 * them with what they have *already* spent — historical loss + a live counter that
 * ticks up while the report is open. Loss aversion is ~2× more motivating than
 * equivalent forward-looking gains, so this is the strongest emotional moment in
 * the report.
 */
export default function MoneyLostSection({ annualSpend, inputs, yearsAssumed = 5 }: Props) {
  const sym = inputs.currencySymbol
  const pastSpend = annualSpend.total * yearsAssumed
  const perSecond = annualSpend.total / (365 * 24 * 60 * 60)
  const perDay = annualSpend.total / 365
  const nextDecade = annualSpend.total * 10

  // Adaptive precision so the ticker is *visibly* alive at every spend level.
  // The per-second drip is annualSpend / 31,536,000. To make that drip cause
  // a visible single-unit change in the displayed number, we need at least
  //   N decimals where 10^-N <= perSecond, i.e. N >= log10(1/perSecond).
  // Floored at 2 for clean currency formatting, capped at 6 to keep digits readable.
  const tickerDecimals = perSecond > 0
    ? Math.min(6, Math.max(2, Math.ceil(Math.log10(1 / perSecond))))
    : 2

  // Live ticker — money leaking out since the page opened.
  const [tickerExtra, setTickerExtra] = useState(0)
  useEffect(() => {
    if (perSecond <= 0) return
    const start = Date.now()
    const id = setInterval(() => {
      setTickerExtra(((Date.now() - start) / 1000) * perSecond)
    }, 250)
    return () => clearInterval(id)
  }, [perSecond])

  const totalLost = pastSpend + tickerExtra

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-red-400">A Hard Truth</h2>
        <h3 className="text-2xl font-bold text-white">Where Your Money Has Already Gone</h3>
      </div>

      <div className="bg-gradient-to-br from-red-500/15 via-orange-500/10 to-red-500/15 border border-red-500/30 rounded-3xl p-6 space-y-5">
        {/* Intro line */}
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-white/80 text-sm">
            {inputs.firstName}, if you&apos;ve been buying water this way for the last{' '}
            <span className="font-bold text-white">{yearsAssumed} years</span>,
            you&apos;ve already poured&hellip;
          </p>
        </div>

        {/* Hero loss number — tabular-nums keeps the digits from jumping as the ticker updates */}
        <div className="text-center py-1">
          <p className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-br from-red-300 via-orange-300 to-red-400 bg-clip-text text-transparent leading-none tabular-nums">
            {formatCurrency(totalLost, sym)}
          </p>
          <p className="text-red-200/80 text-sm font-medium mt-2">down the drain</p>
        </div>

        {/* Live ticker — adaptive precision means the digits visibly move on
            every render, regardless of household spend level */}
        <div className="bg-navy-dark/40 border border-red-400/20 rounded-2xl px-4 py-3 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/80 space-y-1">
            <p>
              And the meter is still running —{' '}
              <span className="text-red-300 font-bold tabular-nums">
                {sym}{tickerExtra.toFixed(tickerDecimals)}
              </span>{' '}
              has left your household since this report opened.
            </p>
            <p className="text-xs text-white/55">
              At your pace, that&apos;s{' '}
              <span className="text-red-300 font-semibold tabular-nums">
                {sym}{perDay.toFixed(2)}/day
              </span>{' '}
              — every day, money that simply disappears.
            </p>
          </div>
        </div>

        {/* What that money could have been — the tangible-loss translation.
            Given visual weight (text-sm/70) to match its emotional weight, with
            the loss beats accented red to stay in one emotional language. */}
        <p className="text-sm text-white/70 leading-relaxed">
          That&apos;s a family vacation. A new appliance. Six months of dinners out.{' '}
          <span className="text-red-300 font-semibold">It&apos;s gone</span> — and at your current pace, another{' '}
          <span className="text-red-300 font-semibold">{formatCurrency(nextDecade, sym)}</span>{' '}
          will follow over the next 10 years if nothing changes.
        </p>
      </div>
    </section>
  )
}
