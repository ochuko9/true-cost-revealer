'use client'

import { CalculatorInputs } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface Props {
  inputs: CalculatorInputs
  onChange: (patch: Partial<CalculatorInputs>) => void
  onNext: () => void
  onBack: () => void
}

const UNIT_TABS: { value: CalculatorInputs['purchaseUnit']; label: string }[] = [
  { value: 'bottle',  label: 'Bottles'       },
  { value: 'case',    label: 'Cases'          },
  { value: '5gallon', label: '5-Gal Jugs'    },
]

const FREQ_TABS: { value: CalculatorInputs['purchaseFrequency']; label: string }[] = [
  { value: 'day',   label: 'Per Day'   },
  { value: 'week',  label: 'Per Week'  },
  { value: 'month', label: 'Per Month' },
]

const BOTTLE_LITRES   = 0.5
const GALLON_5_LITRES = 18.927

/** Normalise any combination to bottles-per-week for the usage label */
function toWeeklyBottles(inputs: CalculatorInputs): number {
  const qty = inputs.purchaseQuantity || 0
  const freqToWeekly = inputs.purchaseFrequency === 'day' ? 7
    : inputs.purchaseFrequency === 'week' ? 1
    : 1 / 4.33

  if (inputs.purchaseUnit === 'bottle')  return qty * freqToWeekly
  if (inputs.purchaseUnit === 'case')    return qty * (inputs.bottlesPerCase || 24) * freqToWeekly
  // 5-gallon → convert litres to equivalent 500ml bottles
  return qty * (GALLON_5_LITRES / BOTTLE_LITRES) * freqToWeekly
}

function usageLabel(weeklyBottles: number): string {
  if (weeklyBottles <= 7)  return 'Light use'
  if (weeklyBottles <= 28) return 'Moderate use'
  if (weeklyBottles <= 70) return 'Heavy use'
  return 'Very heavy use'
}

/** Annual litres driven by purchase inputs */
function annualLitresPreview(inputs: CalculatorInputs): number {
  const qty = inputs.purchaseQuantity || 0
  const freqMultiplier = inputs.purchaseFrequency === 'day' ? 365
    : inputs.purchaseFrequency === 'week' ? 52
    : 12

  if (inputs.purchaseUnit === 'bottle')
    return qty * freqMultiplier * BOTTLE_LITRES
  if (inputs.purchaseUnit === 'case')
    return qty * freqMultiplier * (inputs.bottlesPerCase || 24) * BOTTLE_LITRES
  return qty * freqMultiplier * GALLON_5_LITRES
}

/** Annual cost preview */
function annualCostPreview(inputs: CalculatorInputs): number {
  const qty = inputs.purchaseQuantity || 0
  const freqMultiplier = inputs.purchaseFrequency === 'day' ? 365
    : inputs.purchaseFrequency === 'week' ? 52
    : 12
  return qty * freqMultiplier * (inputs.costPerUnit || 0)
}

function costLabel(unit: CalculatorInputs['purchaseUnit']): string {
  if (unit === 'bottle')  return 'per bottle'
  if (unit === 'case')    return 'per case'
  return 'per 5-gal jug'
}

function costHint(unit: CalculatorInputs['purchaseUnit']): string {
  if (unit === 'bottle')  return 'Most people pay $1.50–$3.00 per bottle'
  if (unit === 'case')    return 'A typical 24-pack runs $4–$12'
  return 'Typical range: $6–$12 per 5-gallon jug'
}

function quantityLabel(unit: CalculatorInputs['purchaseUnit'], freq: CalculatorInputs['purchaseFrequency']): string {
  const u = unit === 'bottle' ? 'bottles' : unit === 'case' ? 'cases' : '5-gal jugs'
  const f = freq === 'day' ? 'day' : freq === 'week' ? 'week' : 'month'
  return `How many ${u} per ${f}?`
}

export default function StepBottledWater({ inputs, onChange, onNext, onBack }: Props) {
  const weeklyBottles = toWeeklyBottles(inputs)
  const litres        = annualLitresPreview(inputs)
  const cost          = annualCostPreview(inputs)
  const sym           = inputs.currencySymbol

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Your bottled water habits</h2>
        <p className="text-white/70">Approximate is fine &mdash; we&apos;ll calculate the rest.</p>
      </div>

      <div className="space-y-5">

        {/* ── Unit tabs ── */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">What do you typically buy?</label>
          <div className="grid grid-cols-3 gap-2">
            {UNIT_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => onChange({ purchaseUnit: tab.value })}
                aria-pressed={inputs.purchaseUnit === tab.value}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  inputs.purchaseUnit === tab.value
                    ? 'bg-aqua text-navy border-aqua'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Frequency tabs ── */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/80">How often?</label>
          <div className="grid grid-cols-3 gap-2">
            {FREQ_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => onChange({ purchaseFrequency: tab.value })}
                aria-pressed={inputs.purchaseFrequency === tab.value}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  inputs.purchaseFrequency === tab.value
                    ? 'bg-aqua/20 text-aqua border-aqua/40'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Quantity ── */}
        <Input
          id="purchaseQuantity"
          label={quantityLabel(inputs.purchaseUnit, inputs.purchaseFrequency)}
          type="number"
          min={0}
          placeholder="0"
          value={inputs.purchaseQuantity || ''}
          onChange={e => onChange({ purchaseQuantity: parseFloat(e.target.value) || 0 })}
        />

        {/* ── Bottles per case (case only) ── */}
        {inputs.purchaseUnit === 'case' && (
          <Input
            id="bottlesPerCase"
            label="Bottles per case"
            type="number"
            placeholder="24"
            value={inputs.bottlesPerCase || ''}
            onChange={e => onChange({ bottlesPerCase: parseFloat(e.target.value) || 24 })}
            hint="Standard cases are usually 24 × 500 ml bottles"
          />
        )}

        {/* ── Cost per unit ── */}
        <Input
          id="costPerUnit"
          label={`Average price ${costLabel(inputs.purchaseUnit)}`}
          type="number"
          step="0.01"
          placeholder={inputs.purchaseUnit === 'bottle' ? '1.75' : inputs.purchaseUnit === 'case' ? '6.99' : '8.00'}
          prefix={sym}
          value={inputs.costPerUnit || ''}
          onChange={e => onChange({ costPerUnit: parseFloat(e.target.value) || 0 })}
          hint={costHint(inputs.purchaseUnit)}
        />

        {/* ── Live preview — appears as soon as quantity is entered ── */}
        {inputs.purchaseQuantity > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 space-y-3">
            <p className="text-xs text-white/60 uppercase tracking-wider">Your consumption estimate</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Weekly bottle-equivalent */}
              <div className="space-y-0.5">
                <p className="text-xs text-white/60">Weekly equivalent</p>
                <p className="text-white font-semibold text-sm">
                  ~{weeklyBottles.toFixed(1)} <span className="text-white/50 font-normal">bottles</span>
                </p>
                <p className="text-xs text-white/60">{usageLabel(weeklyBottles)}</p>
              </div>
              {/* Annual litres */}
              <div className="space-y-0.5">
                <p className="text-xs text-white/60">Annual volume</p>
                <p className="text-white font-semibold text-sm">
                  ~{Math.round(litres).toLocaleString()} <span className="text-white/50 font-normal">litres</span>
                </p>
                <p className="text-xs text-white/60">{(litres / 365).toFixed(1)} litres/day</p>
              </div>
              {/* Annual cost — only when cost is also entered */}
              {inputs.costPerUnit > 0 && (
                <div className="col-span-2 pt-2 border-t border-white/10 flex items-center justify-between">
                  <p className="text-xs text-white/60">Estimated annual spend</p>
                  <p className="text-aqua font-bold text-base">{sym}{cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/year</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Water delivery ── */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <label className="block text-sm font-medium text-white/80">
            Do you also pay for home water delivery?
          </label>
          <p className="text-xs text-white/60 -mt-1">e.g. a subscription service that delivers to your door</p>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map(val => (
              <button
                key={String(val)}
                onClick={() => onChange({ hasWaterDelivery: val })}
                aria-pressed={inputs.hasWaterDelivery === val}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  inputs.hasWaterDelivery === val
                    ? 'bg-aqua text-navy border-aqua'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        {inputs.hasWaterDelivery && (
          <div className="space-y-4 pl-4 border-l-2 border-aqua/30">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">How do you pay for it?</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'flat',    label: 'Flat monthly rate' },
                  { value: '5gallon', label: 'Per 5-gallon jug'  },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ deliveryUnit: opt.value })}
                    aria-pressed={inputs.deliveryUnit === opt.value}
                    className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                      inputs.deliveryUnit === opt.value
                        ? 'bg-aqua text-navy border-aqua'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {inputs.deliveryUnit === 'flat' ? (
              <Input
                id="deliveryCost"
                label="Monthly delivery cost"
                type="number"
                placeholder="35.00"
                prefix={sym}
                value={inputs.deliveryMonthlyCost || ''}
                onChange={e => onChange({ deliveryMonthlyCost: parseFloat(e.target.value) || 0 })}
              />
            ) : (
              <div className="space-y-3">
                <Input
                  id="deliveryJugs"
                  label="5-gallon jugs per month"
                  type="number"
                  placeholder="4"
                  value={inputs.deliveryJugsPerMonth || ''}
                  onChange={e => onChange({ deliveryJugsPerMonth: parseFloat(e.target.value) || 0 })}
                  hint="Each 5-gallon jug ≈ 18.9 litres"
                />
                <Input
                  id="deliveryCostPerJug"
                  label="Cost per jug"
                  type="number"
                  step="0.01"
                  placeholder="8.00"
                  prefix={sym}
                  value={inputs.deliveryCostPerJug || ''}
                  onChange={e => onChange({ deliveryCostPerJug: parseFloat(e.target.value) || 0 })}
                  hint="Typical range: $6–$12 per 5-gallon jug"
                />
                {inputs.deliveryJugsPerMonth > 0 && inputs.deliveryCostPerJug > 0 && (
                  <p className="text-xs text-aqua/70">
                    ≈ {sym}{(inputs.deliveryJugsPerMonth * inputs.deliveryCostPerJug).toFixed(2)}/month
                    &nbsp;&middot;&nbsp;{(inputs.deliveryJugsPerMonth * GALLON_5_LITRES).toFixed(0)} litres/month
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">Are you in a delivery contract?</label>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => onChange({ inDeliveryContract: val })}
                    aria-pressed={inputs.inDeliveryContract === val}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      inputs.inDeliveryContract === val
                        ? 'bg-aqua/20 text-aqua border-aqua/40'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {val ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
              {inputs.inDeliveryContract && (
                <p className="text-xs text-amber-400/80">
                  Note: Year 1 savings may be reduced by any cancellation fees from your current contract.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={onBack} className="flex-1">
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <Button size="lg" onClick={onNext} className="flex-[2]">
          Continue <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
