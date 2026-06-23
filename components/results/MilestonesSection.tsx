'use client'

import { BreakEven, CalculatorInputs, YearlyProjection } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Calendar, Flag, Trophy } from 'lucide-react'

interface Props {
  breakEven: BreakEven
  projection: YearlyProjection[]
  inputs: CalculatorInputs
}

interface Milestone {
  icon: React.ReactNode
  date: string
  title: string
  detail: string
  highlight?: boolean
}

/**
 * Convert a future month-offset into a calendar label. "April 2027" feels
 * concrete in a way that "Year 3, Month 5" never can.
 */
function dateFromMonths(monthsFromNow: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + monthsFromNow)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function dateFromYears(yearsFromNow: number): string {
  return dateFromMonths(yearsFromNow * 12)
}

/**
 * Future-pacing section.
 *
 * Lines on a chart are abstract. "By April 2029 you're $7,800 ahead — that's a
 * family vacation" is concrete. This section translates each major financial
 * milestone into a specific calendar moment.
 */
export default function MilestonesSection({ breakEven, projection, inputs }: Props) {
  const sym = inputs.currencySymbol
  const fiveYear = projection[4] // index 4 = year 5
  const tenYear = projection[projection.length - 1]
  const fiveYearSavings = Math.max(0, fiveYear.currentSpendCumulative - fiveYear.eSpringCashCumulative)
  const tenYearSavings = Math.max(0, tenYear.currentSpendCumulative - tenYear.eSpringCashCumulative)

  const milestones: Milestone[] = [
    {
      icon: <Flag className="w-5 h-5 text-aqua" />,
      date: dateFromMonths(1),
      title: 'Switch to clean water at home',
      detail: `The last plastic bottle to ever cross your front door`,
    },
    {
      icon: <Trophy className="w-5 h-5 text-emerald-300" />,
      date: breakEven.monthLabel,
      title: 'Your eSpring has paid for itself',
      detail: 'Every dollar you would have spent on water after this date, you keep',
      highlight: true,
    },
    {
      icon: <Calendar className="w-5 h-5 text-emerald-300" />,
      date: dateFromYears(5),
      title: `${formatCurrency(fiveYearSavings, sym)} kept`,
      detail: 'Roughly a kitchen renovation, a used car, or a year of family travel',
    },
    {
      icon: <Calendar className="w-5 h-5 text-emerald-300" />,
      date: dateFromYears(10),
      title: `${formatCurrency(tenYearSavings, sym)} kept`,
      detail: 'Money that was always supposed to be yours',
      highlight: true,
    },
  ]

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-aqua">Your Timeline</h2>
        <h3 className="text-2xl font-bold text-white">Mark Your Calendar</h3>
        <p className="text-white/50 text-sm">The moments your money story actually becomes real.</p>
      </div>

      <div className="space-y-3">
        {milestones.map((m, i) => (
          <div
            key={i}
            className={`relative flex gap-4 rounded-2xl p-4 border ${
              m.highlight
                ? 'bg-gradient-to-r from-emerald-500/10 to-aqua/5 border-emerald-400/40'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {/* Connector line between milestones */}
            {i < milestones.length - 1 && (
              <div className="absolute left-[27px] top-[52px] bottom-[-12px] w-px bg-gradient-to-b from-white/20 to-white/5" />
            )}

            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border ${
                m.highlight ? 'bg-emerald-500/15 border-emerald-400/40' : 'bg-white/5 border-white/10'
              }`}
            >
              {m.icon}
            </div>

            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs text-white/60 uppercase tracking-wider font-semibold">{m.date}</p>
              <p className={`text-base font-bold leading-tight ${m.highlight ? 'text-emerald-300' : 'text-white'}`}>
                {m.title}
              </p>
              <p className="text-xs text-white/60 leading-relaxed">{m.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
