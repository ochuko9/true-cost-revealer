'use client'

import { CalculatorInputs } from '@/types'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { ChevronRight } from 'lucide-react'

interface Props {
  inputs: CalculatorInputs
  onChange: (patch: Partial<CalculatorInputs>) => void
  onNext: () => void
  errors: Partial<Record<keyof CalculatorInputs, string>>
}

const HOUSEHOLD_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8+']

export default function StepPersonal({ inputs, onChange, onNext, errors }: Props) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Let&apos;s start with you</h2>
        <p className="text-white/70">We&apos;ll use this to personalize your report.</p>
      </div>

      <div className="space-y-4">
        <Input
          id="firstName"
          label="Your first name"
          placeholder="e.g. Sarah"
          value={inputs.firstName}
          onChange={e => onChange({ firstName: e.target.value })}
          error={errors.firstName}
          autoFocus
        />

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Household size</label>
          <div className="grid grid-cols-4 gap-2">
            {HOUSEHOLD_OPTIONS.map(opt => {
              const val = opt === '8+' ? 8 : parseInt(opt)
              return (
                <button
                  key={opt}
                  onClick={() => onChange({ householdSize: val })}
                  aria-pressed={inputs.householdSize === val}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                    inputs.householdSize === val
                      ? 'bg-aqua text-navy border-aqua'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">Currency</label>
          <select
            value={inputs.currencySymbol}
            onChange={e => onChange({ currencySymbol: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl text-white py-3.5 px-4 focus:outline-none focus:border-aqua/60 transition-all"
          >
            <option value="$">$ — US Dollar (USD)</option>
            <option value="CA$">CA$ — Canadian Dollar (CAD)</option>
            <option value="£">£ — British Pound (GBP)</option>
            <option value="€">€ — Euro (EUR)</option>
            <option value="A$">A$ — Australian Dollar (AUD)</option>
          </select>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={onNext}
        disabled={!inputs.firstName.trim()}
      >
        Continue <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  )
}
