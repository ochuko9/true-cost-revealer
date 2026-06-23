'use client'

import { BreakEven, CalculatorInputs } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

interface Props {
  breakEven: BreakEven
  inputs: CalculatorInputs
}

export default function BreakEvenSection({ breakEven, inputs }: Props) {
  const sym = inputs.currencySymbol
  const months = breakEven.monthNumber
  const years = Math.floor(months / 12)
  const rem = months % 12

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white">Your Break-Even Point</h3>
      </div>

      <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-white/70 text-sm mb-1">{inputs.firstName}, your eSpring system pays for itself by</p>
            <p className="text-3xl font-extrabold text-white">{breakEven.monthLabel}</p>
            <p className="text-white/50 text-sm mt-1">
              {years > 0 && `${years} year${years !== 1 ? 's' : ''} `}
              {rem > 0 && `${rem} month${rem !== 1 ? 's' : ''} `}
              from today
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center space-y-1">
          <p className="text-xs text-white/60 uppercase tracking-wider">5-Year Savings</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(breakEven.totalSavedAt5Years, sym)}</p>
          <p className="text-xs text-white/60">vs. bottled water</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center space-y-1">
          <p className="text-xs text-white/60 uppercase tracking-wider">10-Year Savings</p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(breakEven.totalSavedAt10Years, sym)}</p>
          <p className="text-xs text-white/60">vs. bottled water</p>
        </div>
      </div>
    </section>
  )
}
