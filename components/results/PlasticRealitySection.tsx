'use client'

import { AnnualSpend, CalculatorInputs } from '@/types'
import { AlertCircle, Recycle, Trash2 } from 'lucide-react'

interface Props {
  annualSpend: AnnualSpend
  inputs: CalculatorInputs
}

const BOTTLE_LITRES = 0.5
const BOTTLE_HEIGHT_M = 0.22 // typical 500 ml bottle ≈ 22 cm tall

/**
 * Pick a recognisable visual anchor for the stacked-bottles height.
 * Landmarks chosen for US + Canadian audience familiarity, ordered from tallest
 * down to shortest. The first matching threshold wins.
 */
function visualAnchor(stackHeightMetres: number): { label: string; subtitle: string } {
  const km = (stackHeightMetres / 1000).toFixed(1)
  if (stackHeightMetres > 8848) return { label: 'your household’s own Mount Everest — in plastic',  subtitle: `${km} km of bottles. Climbers train for years to reach 8,848 m. You’ll match it, one purchase at a time, without leaving your kitchen.` }
  if (stackHeightMetres > 4421) return { label: 'higher than Mount Whitney — yours, in plastic',    subtitle: `${km} km of bottles. The tallest peak in the continental US — built quietly by one household, over 10 years.` }
  if (stackHeightMetres > 1000) return { label: `${km} kilometres of plastic — yours`,              subtitle: 'Higher than any building humans have ever built — and it came from one household, one bottle at a time.' }
  if (stackHeightMetres > 828)  return { label: 'taller than the Burj Khalifa — in plastic, from your family',         subtitle: 'The world’s tallest building (828 m), matched by one household’s habit over a decade.' }
  if (stackHeightMetres > 553)  return { label: 'taller than the CN Tower — in plastic, from your family',             subtitle: 'Toronto’s landmark (553 m), stacked end-to-end in disposable bottles.' }
  if (stackHeightMetres > 443)  return { label: 'taller than the Empire State Building — in plastic, from your family',subtitle: 'New York’s 443 m icon, replicated in plastic from one kitchen.' }
  if (stackHeightMetres > 324)  return { label: 'taller than the Eiffel Tower — in plastic, from your family',         subtitle: 'Paris’s 324 m landmark, made entirely of bottled-water waste.' }
  if (stackHeightMetres > 93)   return { label: 'taller than the Statue of Liberty — in plastic, from your family',    subtitle: 'America’s 93 m symbol of welcome — recreated in disposable plastic.' }
  if (stackHeightMetres > 22)   return { label: `a ${Math.round(stackHeightMetres / 3)}-storey building of plastic`,   subtitle: 'stacked end-to-end, all from one household over 10 years' }
  if (stackHeightMetres > 6)    return { label: `${Math.round(stackHeightMetres / 12)} school buses of plastic`,        subtitle: 'laid bumper-to-bumper — one household, one decade' }
  return { label: `${Math.round(stackHeightMetres)} m of plastic`, subtitle: 'stacked end-to-end, all from one household over 10 years' }
}

/**
 * Non-financial pain layer.
 *
 * Converts annual litres of bottled-water consumption into a vivid plastic-waste
 * count, a recognisable physical-comparison anchor, and a microplastics health
 * callout. This is what closes low-spend households who can't be sold on pure
 * economics — parents especially.
 */
export default function PlasticRealitySection({ annualSpend, inputs }: Props) {
  const litresOver10yrs = annualSpend.annualLitres * 10
  const bottlesTotal = Math.round(litresOver10yrs / BOTTLE_LITRES)
  const stackMetres = bottlesTotal * BOTTLE_HEIGHT_M
  const anchor = visualAnchor(stackMetres)
  const sym = inputs.currencySymbol
  void sym // reserved if we add a $/bottle anchor later

  // If household consumes essentially no measurable bottles (e.g. flat-rate
  // delivery only), don't render — the section would just be zeros.
  if (bottlesTotal < 50) return null

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">The Plastic Reality</h2>
        <h3 className="text-2xl font-bold text-white">What Your Family Throws Away</h3>
      </div>

      <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/30 rounded-3xl p-6 space-y-5">
        {/* Hero bottle count */}
        <div className="text-center space-y-2">
          <p className="text-white/60 text-sm">Over the next 10 years, your household will throw away</p>
          <p className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-br from-amber-200 to-orange-300 bg-clip-text text-transparent leading-none tabular-nums">
            {bottlesTotal.toLocaleString()}
          </p>
          <p className="text-amber-200/80 text-sm font-medium">plastic bottles</p>
        </div>

        {/* Visual anchor */}
        <div className="bg-navy-dark/40 border border-amber-400/20 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Trash2 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/80">
              Stacked up, that&apos;s <span className="text-amber-300 font-bold">{anchor.label}</span>.
            </p>
            <p className="text-xs text-white/60 mt-0.5">{anchor.subtitle}</p>
          </div>
        </div>

        {/* Microplastics health callout */}
        <div className="bg-red-500/5 border border-red-400/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-white font-bold text-sm">240,000 plastic particles in every litre</p>
            <p className="text-white/70 text-xs leading-relaxed">
              On average, a litre of bottled water carries about 240,000 individual plastic fragments — 10 to 100 times more than scientists previously believed (Qian et al., <span className="italic">PNAS</span>, Columbia &amp; Rutgers, 2024). <span className="text-white font-semibold">About 90% are nanoplastics small enough to cross the gut into your bloodstream</span> — the same particles have since been detected in human blood, placentas, and brain tissue. Your family drinks every one of them. eSpring&apos;s NSF-certified filtration removes more than 99% of microplastics, lead, mercury, pesticides, and 140+ other contaminants.
            </p>
          </div>
        </div>

        {/* Recycling reality check */}
        <div className="bg-navy-dark/40 border border-amber-400/20 rounded-2xl px-4 py-3 flex items-center gap-3">
          <Recycle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-white/80">
            Globally, only <span className="text-amber-300 font-bold">9%</span> of plastic bottles get recycled.
            The other 91% end up in landfills, oceans, or burned.
          </p>
        </div>
      </div>
    </section>
  )
}
