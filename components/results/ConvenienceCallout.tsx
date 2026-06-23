'use client'

import { AnnualSpend } from '@/types'
import { Clock, Package } from 'lucide-react'

interface Props {
  annualSpend: AnnualSpend
}

// Density of water ≈ 1 kg/L. Bottles add ~5% packaging weight.
const KG_PER_LITRE = 1.05

/** Pick a recognisable comparison for cumulative carried weight */
function weightAnchor(kg: number): string {
  if (kg > 50000) return `a fully loaded semi truck (${(kg / 1000).toFixed(0)} tonnes)`
  if (kg > 10000) return `${(kg / 1000).toFixed(1)} tonnes — about three pickup trucks`
  if (kg > 2000)  return `a mid-size sedan (${kg.toLocaleString()} kg)`
  if (kg > 500)   return `a grand piano (${kg.toLocaleString()} kg)`
  if (kg > 100)   return `${kg.toLocaleString()} kg — a refrigerator`
  return `${kg.toLocaleString()} kg`
}

/**
 * Convenience-cost callout.
 *
 * Quantifies the *physical* cost of bottled water — the weight a household
 * carries through their front door over a decade, plus the time spent on water
 * runs. Targets the convenience-driven buyer who is sick of the routine but
 * may not be moved purely by financial math.
 */
export default function ConvenienceCallout({ annualSpend }: Props) {
  // 10-year cumulative weight
  const kgTenYears = Math.round(annualSpend.annualLitres * KG_PER_LITRE * 10)

  // Time estimate: 30 minutes per shopping trip, one trip per ~50 L purchased
  // (conservative — most people make trips more often than that)
  const tripsTenYears = Math.max(0, Math.round((annualSpend.annualLitres * 10) / 50))
  const hoursTenYears = Math.round(tripsTenYears * 0.5)

  // If household consumes essentially nothing measurable, hide
  if (kgTenYears < 100) return null

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">The Hidden Cost</h2>
        <h3 className="text-2xl font-bold text-white">What Bottled Water Costs You Beyond Money</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Weight tile */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-400/15 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-300" />
            </div>
            <p className="text-xs text-amber-300/80 uppercase tracking-wider font-bold">Weight you carry</p>
          </div>
          <p className="text-3xl font-extrabold text-white tabular-nums">
            {kgTenYears.toLocaleString()} <span className="text-base text-white/50 font-medium">kg</span>
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            Over 10 years you&apos;ll haul the weight of <span className="text-white font-semibold">{weightAnchor(kgTenYears)}</span> through your front door. eSpring eliminates every trip.
          </p>
        </div>

        {/* Time tile */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-400/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-300" />
            </div>
            <p className="text-xs text-amber-300/80 uppercase tracking-wider font-bold">Time you spend</p>
          </div>
          <p className="text-3xl font-extrabold text-white tabular-nums">
            {hoursTenYears.toLocaleString()} <span className="text-base text-white/50 font-medium">hrs</span>
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            That&apos;s {Math.round(hoursTenYears / 8)} full working days spent shopping for, lugging, and storing water that should just come out of the tap.
          </p>
        </div>
      </div>
    </section>
  )
}
