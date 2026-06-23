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
  error?: string
}

export default function StepAdditional({ inputs, onChange, onNext, onBack, error }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Any other water spending?</h2>
        <p className="text-white/70">Enter what you actually pay — everything adds up.</p>
      </div>

      <div className="space-y-6">
        {/* Home filtration */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-white/80">
            Do you use any home filtration currently?
          </label>
          <p className="text-xs text-white/60">e.g. Brita, PUR, Zero Water, pitcher filters</p>
          <div className="grid grid-cols-2 gap-2">
            {[true, false].map(val => (
              <button
                key={String(val)}
                onClick={() => onChange({ hasHomeFiltration: val })}
                aria-pressed={inputs.hasHomeFiltration === val}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  inputs.hasHomeFiltration === val
                    ? 'bg-aqua text-navy border-aqua'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                }`}
              >
                {val ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        </div>

        {inputs.hasHomeFiltration && (
          <div className="pl-4 border-l-2 border-aqua/30">
            <Input
              id="filtrationCost"
              label="Monthly filtration cost (cartridges, etc.)"
              type="number"
              placeholder="7.00"
              prefix={inputs.currencySymbol}
              value={inputs.filtrationMonthlyCost || ''}
              onChange={e => onChange({ filtrationMonthlyCost: parseFloat(e.target.value) || 0 })}
              hint="A typical Brita pitcher cartridge costs ~$7 and lasts ~2 months"
            />
          </div>
        )}

        {/* Other water spend */}
        <Input
          id="otherCost"
          label="Any other monthly water spend? (optional)"
          type="number"
          placeholder="0.00"
          prefix={inputs.currencySymbol}
          value={inputs.otherMonthlyCost || ''}
          onChange={e => onChange({ otherMonthlyCost: parseFloat(e.target.value) || 0 })}
          hint="e.g. sparkling water, mineral water subscriptions"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="text-amber-300 text-sm text-center bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" onClick={onBack} className="flex-1">
          <ChevronLeft className="w-5 h-5" /> Back
        </Button>
        <Button size="lg" onClick={onNext} className="flex-[2]">
          Show My Results <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
