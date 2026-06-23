'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalculatorInputs } from '@/types'
import ProgressBar from './ProgressBar'
import StepPersonal from './StepPersonal'
import StepBottledWater from './StepBottledWater'
import StepAdditional from './StepAdditional'
import { Droplets } from 'lucide-react'

const STEPS = ['About You', 'Water Habits', 'Other Spend']

const DEFAULT_INPUTS: CalculatorInputs = {
  firstName: '',
  householdSize: 2,
  country: 'US',
  currencySymbol: '$',
  // Unit and frequency tabs default to common selections, but quantity and
  // cost start at 0 — the customer must enter real numbers. Pre-filled values
  // here would silently produce a fake baseline if someone clicked through.
  purchaseUnit: 'bottle',
  purchaseFrequency: 'week',
  purchaseQuantity: 0,
  costPerUnit: 0,
  bottlesPerCase: 24,
  hasWaterDelivery: false,
  deliveryUnit: 'flat',
  deliveryMonthlyCost: 0,
  deliveryJugsPerMonth: 0,
  deliveryCostPerJug: 0,
  inDeliveryContract: false,
  hasHomeFiltration: false,
  filtrationMonthlyCost: 0,
  otherMonthlyCost: 0,
}

export default function CalculatorForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS)
  const [errors, setErrors] = useState<Partial<Record<keyof CalculatorInputs, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function patch(updates: Partial<CalculatorInputs>) {
    setInputs(prev => ({ ...prev, ...updates }))
  }

  function validateStep1(): boolean {
    const e: typeof errors = {}
    if (!inputs.firstName.trim()) e.firstName = 'Please enter your first name'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // The whole report is built around a real water-spend baseline. If every cost
  // field is still zero, the results would read "$0 → $0" and undercut the pitch.
  // Gate the reveal until there's at least one real number to work with.
  function hasAnyWaterSpend(): boolean {
    const bottled = (inputs.purchaseQuantity || 0) * (inputs.costPerUnit || 0)
    const delivery = inputs.hasWaterDelivery
      ? inputs.deliveryUnit === 'flat'
        ? inputs.deliveryMonthlyCost || 0
        : (inputs.deliveryJugsPerMonth || 0) * (inputs.deliveryCostPerJug || 0)
      : 0
    const filtration = inputs.hasHomeFiltration ? inputs.filtrationMonthlyCost || 0 : 0
    const other = inputs.otherMonthlyCost || 0
    return bottled + delivery + filtration + other > 0
  }

  async function handleSubmit() {
    if (isSubmitting) return
    if (!hasAnyWaterSpend()) {
      setSubmitError('Add at least one water cost above so we can reveal your real number — even a rough estimate works.')
      return
    }
    setSubmitError('')
    setIsSubmitting(true)
    // Store inputs in sessionStorage for the results page
    sessionStorage.setItem('tcr_inputs', JSON.stringify(inputs))
    router.push('/calculator/results')
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <div className="w-9 h-9 rounded-full bg-aqua/20 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-aqua" />
        </div>
        <span className="text-white font-semibold text-sm tracking-wide">True Cost Revealer</span>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 pb-8">
        {/* Progress */}
        <div className="mb-8">
          <ProgressBar currentStep={step} totalSteps={3} stepLabels={STEPS} />
        </div>

        {/* Steps */}
        {step === 1 && (
          <StepPersonal inputs={inputs} onChange={patch} onNext={handleNext} errors={errors} />
        )}
        {step === 2 && (
          <StepBottledWater inputs={inputs} onChange={patch} onNext={handleNext} onBack={handleBack} />
        )}
        {step === 3 && (
          <StepAdditional
            inputs={inputs}
            onChange={patch}
            onNext={handleSubmit}
            onBack={handleBack}
            error={submitError}
          />
        )}
      </div>
    </div>
  )
}
