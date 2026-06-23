'use client'

import { SavingsEquivalency } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  monthlyFreedBudget: number
  equivalencies: SavingsEquivalency[]
  sym: string
  firstName: string
}

export default function SavingsVisualization({ monthlyFreedBudget, equivalencies, sym, firstName }: Props) {
  const annualFreed = monthlyFreedBudget * 12

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white">What You Could Do Instead</h3>
        <p className="text-white/50 text-sm">
          After your eSpring pays for itself, {firstName}, here&apos;s what your monthly savings could mean.
        </p>
      </div>

      <div className="bg-gradient-to-br from-aqua/10 to-teal-500/5 border border-aqua/20 rounded-2xl p-6 space-y-2 text-center">
        <p className="text-white/60 text-sm">Monthly freed-up budget</p>
        <p className="text-4xl font-extrabold text-aqua">{formatCurrency(monthlyFreedBudget, sym)}</p>
        <p className="text-white/60 text-xs">= {formatCurrency(annualFreed, sym)} per year</p>
      </div>

      {equivalencies.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-white/50">That&apos;s equivalent to&hellip;</p>
          <div className="grid grid-cols-2 gap-3">
            {equivalencies.map((eq, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-3xl">{eq.icon}</div>
                <div>
                  <p className="text-white font-bold text-xl">{eq.count}</p>
                  <p className="text-white/60 text-xs">{eq.label}</p>
                  <p className="text-white/60 text-xs">per year</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-white/60 leading-relaxed">
        Based on {formatCurrency(monthlyFreedBudget, sym)}/month freed after your eSpring system is paid off and filter costs are the only ongoing expense.
      </p>
    </section>
  )
}
