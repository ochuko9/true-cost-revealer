'use client'

import { AnnualSpend, CalculatorInputs } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  annualSpend: AnnualSpend
  inputs: CalculatorInputs
  eSpringCostPerLitre: number
}

export default function AnnualSpendSection({ annualSpend, inputs, eSpringCostPerLitre }: Props) {
  const sym = inputs.currencySymbol
  const rows = [
    { label: 'Bottled water', value: annualSpend.bottledWaterAnnual, show: true },
    { label: 'Water delivery', value: annualSpend.deliveryAnnual, show: inputs.hasWaterDelivery },
    { label: 'Home filtration cartridges', value: annualSpend.filtrationAnnual, show: inputs.hasHomeFiltration },
    { label: 'Other water spend', value: annualSpend.otherAnnual, show: annualSpend.otherAnnual > 0 },
  ].filter(r => r.show)

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white">Your Annual Water Spend</h3>
      </div>

      {/* Headline stats — spend + consumption side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-aqua/20 to-teal-500/10 border border-aqua/30 rounded-2xl p-5 text-center space-y-1">
          <p className="text-white/60 text-xs uppercase tracking-wider">Annual spend</p>
          <p className="text-3xl font-extrabold text-white">{formatCurrency(annualSpend.total, sym)}</p>
          <p className="text-white/50 text-xs">every year on water</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center space-y-1">
          <p className="text-white/60 text-xs uppercase tracking-wider">Annual consumption</p>
          <p className="text-3xl font-extrabold text-white">
            {annualSpend.annualLitres > 0
              ? Math.round(annualSpend.annualLitres).toLocaleString()
              : '—'}
          </p>
          <p className="text-white/50 text-xs">litres per year</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white/5 rounded-2xl border border-white/10 divide-y divide-white/5">
        {rows.map(row => (
          <div key={row.label} className="flex justify-between items-center px-5 py-4">
            <span className="text-white/70 text-sm">{row.label}</span>
            <span className="text-white font-semibold">{formatCurrency(row.value, sym)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center px-5 py-4 bg-white/5 rounded-b-2xl">
          <span className="text-white font-bold">Total Annual Spend</span>
          <span className="text-aqua font-bold text-lg">{formatCurrency(annualSpend.total, sym)}</span>
        </div>
      </div>

      {/* Cost per litre comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-1 text-center">
          <p className="text-xs text-white/60 uppercase tracking-wider">Your cost per litre</p>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(annualSpend.costPerLitre, sym)}</p>
          <p className="text-xs text-white/60">current approach</p>
        </div>
        <div className="bg-aqua/10 rounded-2xl border border-aqua/20 p-5 space-y-1 text-center">
          <p className="text-xs text-aqua/60 uppercase tracking-wider">eSpring cost per litre</p>
          <p className="text-2xl font-bold text-aqua">{formatCurrency(eSpringCostPerLitre, sym)}</p>
          <p className="text-xs text-aqua/60">with eSpring</p>
        </div>
      </div>

      {annualSpend.costPerLitre > 0 && (
        <div className="bg-navy-dark/50 border border-white/10 rounded-xl px-5 py-4 text-center">
          <p className="text-white/70 text-sm">
            You&apos;re currently paying{' '}
            <span className="text-white font-semibold">
              {(annualSpend.costPerLitre / eSpringCostPerLitre).toFixed(0)}× more
            </span>{' '}
            per litre than eSpring users.
          </p>
        </div>
      )}
    </section>
  )
}
