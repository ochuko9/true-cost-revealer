'use client'

import { AnnualSpend, CalculatorInputs } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Droplet, Truck, Filter, Coins, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  inputs: CalculatorInputs
  annualSpend: AnnualSpend
}

/** Plain-English version of the purchase-unit token */
function unitLabel(unit: CalculatorInputs['purchaseUnit'], qty: number): string {
  const plural = qty === 1 ? '' : 's'
  if (unit === 'bottle')  return `bottle${plural}`
  if (unit === 'case')    return `case${plural}`
  return `5-gallon jug${plural}`
}

/** Plain-English version of the frequency token */
function freqLabel(freq: CalculatorInputs['purchaseFrequency']): string {
  if (freq === 'day')   return 'per day'
  if (freq === 'week')  return 'per week'
  return 'per month'
}

/**
 * "What You Told Us" verification card.
 *
 * Surfaces every input the client typed into the calculator, in plain English,
 * along with the derived annual figure for each. Lets a rep or customer
 * IMMEDIATELY spot a typo (e.g. cost entered as $6.33 instead of $9.60) before
 * they waste time interpreting downstream numbers that were built on bad data.
 */
export default function InputsSummary({ inputs, annualSpend }: Props) {
  const router = useRouter()
  const sym = inputs.currencySymbol

  // Bottled-water purchase line
  const purchaseLine = inputs.purchaseQuantity > 0 && inputs.costPerUnit > 0
    ? (
      <>
        <span className="text-white font-semibold">
          {inputs.purchaseQuantity} × {unitLabel(inputs.purchaseUnit, inputs.purchaseQuantity)}
        </span>
        {' '}{freqLabel(inputs.purchaseFrequency)} at{' '}
        <span className="text-white font-semibold">
          {sym}{inputs.costPerUnit.toFixed(2)}
        </span>
        {' '}each
        {inputs.purchaseUnit === 'case' && (
          <span className="text-white/50"> ({inputs.bottlesPerCase} bottles per case)</span>
        )}
      </>
    )
    : <span className="text-white/60 italic">no bottled-water purchases entered</span>

  // Delivery line
  let deliveryLine: React.ReactNode = <span className="text-white/60 italic">none</span>
  if (inputs.hasWaterDelivery) {
    if (inputs.deliveryUnit === '5gallon') {
      deliveryLine = (
        <>
          <span className="text-white font-semibold">{inputs.deliveryJugsPerMonth}</span> × 5-gallon jugs per month at{' '}
          <span className="text-white font-semibold">{sym}{inputs.deliveryCostPerJug.toFixed(2)}</span> each
        </>
      )
    } else {
      deliveryLine = (
        <>
          flat rate of <span className="text-white font-semibold">{sym}{inputs.deliveryMonthlyCost.toFixed(2)}/month</span>
        </>
      )
    }
  }

  return (
    <section className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl font-bold text-white">What You Told Us</h3>
        <button
          onClick={() => router.push('/calculator')}
          className="flex items-center gap-1.5 text-xs text-aqua/80 hover:text-aqua transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Edit
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {/* Household */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Coins className="w-3.5 h-3.5 text-white/60" />
          </div>
          <div className="flex-1 leading-relaxed">
            <span className="text-white/60">Household:</span>{' '}
            <span className="text-white font-semibold">{inputs.householdSize} {inputs.householdSize === 1 ? 'person' : 'people'}</span>
            {' · '}
            <span className="text-white/60">Country:</span>{' '}
            <span className="text-white font-semibold">{inputs.country === 'CA' ? 'Canada' : 'United States'}</span>
          </div>
        </div>

        {/* Bottled water */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-aqua/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Droplet className="w-3.5 h-3.5 text-aqua" />
          </div>
          <div className="flex-1 leading-relaxed">
            <span className="text-white/60">Bottled water:</span> {purchaseLine}
            {annualSpend.bottledWaterAnnual > 0 && (
              <span className="text-white/60">
                {' '}= <span className="text-white font-semibold">{formatCurrency(annualSpend.bottledWaterAnnual, sym)}/year</span>
              </span>
            )}
          </div>
        </div>

        {/* Delivery */}
        <div className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${inputs.hasWaterDelivery ? 'bg-aqua/15' : 'bg-white/5'}`}>
            <Truck className={`w-3.5 h-3.5 ${inputs.hasWaterDelivery ? 'text-aqua' : 'text-white/60'}`} />
          </div>
          <div className="flex-1 leading-relaxed">
            <span className="text-white/60">Water delivery:</span> {deliveryLine}
            {annualSpend.deliveryAnnual > 0 && (
              <span className="text-white/60">
                {' '}= <span className="text-white font-semibold">{formatCurrency(annualSpend.deliveryAnnual, sym)}/year</span>
              </span>
            )}
            {inputs.hasWaterDelivery && inputs.inDeliveryContract && (
              <span className="text-amber-300/80 text-xs"> · currently in a contract</span>
            )}
          </div>
        </div>

        {/* Home filtration */}
        <div className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${inputs.hasHomeFiltration ? 'bg-aqua/15' : 'bg-white/5'}`}>
            <Filter className={`w-3.5 h-3.5 ${inputs.hasHomeFiltration ? 'text-aqua' : 'text-white/60'}`} />
          </div>
          <div className="flex-1 leading-relaxed">
            <span className="text-white/60">Home filtration:</span>{' '}
            {inputs.hasHomeFiltration && inputs.filtrationMonthlyCost > 0 ? (
              <>
                <span className="text-white font-semibold">{sym}{inputs.filtrationMonthlyCost.toFixed(2)}/month</span>
                <span className="text-white/60">
                  {' '}= <span className="text-white font-semibold">{formatCurrency(annualSpend.filtrationAnnual, sym)}/year</span>
                </span>
              </>
            ) : (
              <span className="text-white/60 italic">none</span>
            )}
          </div>
        </div>

        {/* Other spend (only if > 0) */}
        {inputs.otherMonthlyCost > 0 && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-aqua/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Coins className="w-3.5 h-3.5 text-aqua" />
            </div>
            <div className="flex-1 leading-relaxed">
              <span className="text-white/60">Other water spend:</span>{' '}
              <span className="text-white font-semibold">{sym}{inputs.otherMonthlyCost.toFixed(2)}/month</span>
              <span className="text-white/60">
                {' '}= <span className="text-white font-semibold">{formatCurrency(annualSpend.otherAnnual, sym)}/year</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-white/60 leading-relaxed pt-1 border-t border-white/10">
        If any of these numbers look wrong, click <span className="text-aqua/80">Edit</span> to recalculate. Every result in this report is built from these inputs.
      </p>
    </section>
  )
}
