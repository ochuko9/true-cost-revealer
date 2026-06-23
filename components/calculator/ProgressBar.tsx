'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  stepLabels?: string[]
}

export default function ProgressBar({ currentStep, totalSteps, stepLabels }: ProgressBarProps) {
  const pct = Math.round((currentStep / totalSteps) * 100)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-white/50 font-medium uppercase tracking-wider">
          Step {currentStep} of {totalSteps}
        </span>
        {stepLabels && (
          <span className="text-xs text-aqua font-medium">{stepLabels[currentStep - 1]}</span>
        )}
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-aqua to-teal-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
