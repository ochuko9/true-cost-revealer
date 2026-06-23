'use client'

import { AlertTriangle } from 'lucide-react'

interface Props {
  annualLitres: number
  filterCapacity: number
  show: boolean
}

export default function FilterWarning({ annualLitres, filterCapacity, show }: Props) {
  if (!show) return null

  return (
    <section>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-amber-400 font-semibold text-sm">Filter Capacity Note</h4>
          <p className="text-amber-300/70 text-sm leading-relaxed">
            Based on your household&apos;s water use (~{Math.round(annualLitres).toLocaleString()} litres/year), you may
            exceed the eSpring filter&apos;s annual capacity of {filterCapacity.toLocaleString()} litres. This could mean
            replacing your filter more than once a year &mdash; we&apos;ve flagged this so you can confirm with your consultant.
          </p>
        </div>
      </div>
    </section>
  )
}
