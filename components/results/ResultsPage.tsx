'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalculationResult, ESpringConfig, PayPalConfig } from '@/types'
import { runCalculation } from '@/lib/calculations/water-cost'
import { Droplets, RefreshCw } from 'lucide-react'
import AnnualSpendSection from './AnnualSpendSection'
import InputsSummary from './InputsSummary'
import MoneyLostSection from './MoneyLostSection'
import ComparisonTable from './ComparisonTable'
import PlasticRealitySection from './PlasticRealitySection'
import ConvenienceCallout from './ConvenienceCallout'
import BreakEvenSection from './BreakEvenSection'
import CostChart from './CostChart'
import WealthBuildingSection from './WealthBuildingSection'
import MilestonesSection from './MilestonesSection'
import CTASection from './CTASection'
import FilterWarning from './FilterWarning'
import ReportDownloadCard from './ReportDownloadCard'
import type { DownloadTier } from '@/lib/report-sections'
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'

interface Props {
  espringConfig: ESpringConfig
  paypalConfig: PayPalConfig
  /** The viewing client's download tier (from their invitation), governs which PDFs they can download */
  downloadTier: DownloadTier
}

function LoadingBar() {
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Reading your inputs…')

  useEffect(() => {
    const messages = [
      'Reading your inputs…',
      'Calculating your annual spend…',
      'Projecting 10-year costs…',
      'Finding your break-even point…',
      'Building your personalized report…',
    ]
    let step = 0
    const interval = setInterval(() => {
      step++
      setProgress(Math.min(step * 22, 95))
      setMessage(messages[Math.min(step, messages.length - 1)])
      if (step >= 5) clearInterval(interval)
    }, 420)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-6 gap-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-aqua/20 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-aqua" />
        </div>
        <span className="text-white font-semibold">True Cost Revealer</span>
      </div>
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-white/70 text-lg font-medium">Calculating your personalized report…</p>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-aqua to-teal-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-white/60 text-sm">{message}</p>
      </div>
    </div>
  )
}

export default function ResultsPage({ espringConfig, paypalConfig, downloadTier }: Props) {
  const router = useRouter()
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Reveal a persistent conversion CTA once the reader scrolls past the opening.
  const [showStickyCta, setShowStickyCta] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 650)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const raw = sessionStorage.getItem('tcr_inputs')
    if (!raw) {
      setError('No data found. Please complete the calculator first.')
      setLoading(false)
      return
    }

    const inputs = JSON.parse(raw)

    // A brief, deliberate reveal pause — long enough to feel like real
    // computation, short enough to stay ahead of impatience.
    const timer = setTimeout(() => {
      const calc = runCalculation(inputs, espringConfig, paypalConfig)
      setResult(calc)
      setLoading(false)

      // Persist the report (with the config it was computed against) so the admin
      // can retrieve and re-download it later. Fire-and-forget — a failure here
      // must never block the client from seeing their results.
      fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: calc, espring: espringConfig, paypal: paypalConfig }),
      }).catch(() => {})
    }, 2200)

    return () => clearTimeout(timer)
  }, [espringConfig, paypalConfig])

  if (loading) return <LoadingBar />

  if (error || !result) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-white/60">{error || 'Something went wrong.'}</p>
          <Button onClick={() => router.push('/calculator')}>
            <RefreshCw className="w-4 h-4" /> Start Over
          </Button>
        </div>
      </div>
    )
  }

  const { inputs, annualSpend, eSpringCostPerLitre, comparisonRows, breakEven, tenYearProjection, monthlyFreedBudget } = result
  const sym = inputs.currencySymbol

  // Headline 10-year figure: the money lost to bottled water by NOT switching.
  // Surfaced in the sticky CTA as the cost of inaction (loss-framed) to keep
  // the stakes painful and visible as the reader scrolls.
  const lastYear = tenYearProjection[tenYearProjection.length - 1]
  const tenYearSavings = lastYear
    ? Math.max(0, lastYear.currentSpendCumulative - lastYear.eSpringCashCumulative)
    : 0
  const scrollToCta = () =>
    document.getElementById('get-espring')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const handleFloatingCtaClick = () => {
    if (espringConfig.floating_cta_url) {
      window.open(espringConfig.floating_cta_url, '_blank', 'noopener,noreferrer')
    } else {
      scrollToCta()
    }
  }

  return (
    <div className="min-h-screen bg-navy">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-navy/90 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-aqua/20 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-aqua" />
          </div>
          <span className="text-white font-semibold text-sm">Your Report</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/calculator')}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Recalculate
        </Button>
      </div>

      {/* Greeting — identity-led framing */}
      <div className="px-6 pt-8 pb-4 max-w-2xl mx-auto">
        <p className="text-aqua text-xs uppercase tracking-widest font-semibold mb-2">A Personal Report for {inputs.firstName}</p>
        <h1 className="text-3xl font-extrabold text-white mb-1 leading-tight">
          What Smart Households Are Quietly Doing About Water
        </h1>
        <p className="text-white/70 text-base">
          Most people will keep paying for plastic-packed water without ever doing this math. A few will stop.
        </p>
      </div>

      {/* Sections — narrative arc: verify inputs → existing pain → amplified
          pain → solution → non-financial pain → time pain → proof → projection
          → aspiration → dated future → close */}
      <div className="px-6 pb-28 max-w-2xl mx-auto space-y-16">
        {/* 0. Verification — what the calculator received as inputs */}
        <InputsSummary inputs={inputs} annualSpend={annualSpend} />

        {/* 1. Establish the pain */}
        <AnnualSpendSection
          annualSpend={annualSpend}
          inputs={inputs}
          eSpringCostPerLitre={eSpringCostPerLitre}
        />

        {/* 2. Amplify with loss aversion */}
        <MoneyLostSection annualSpend={annualSpend} inputs={inputs} />

        {/* 3. Present the solution */}
        <ComparisonTable
          rows={comparisonRows}
          sym={sym}
          paypal={paypalConfig}
          annualSpend={annualSpend}
          monthlyFreedBudget={monthlyFreedBudget}
          unitPrice={espringConfig.unit_price}
        />

        {/* 4. Non-financial pain (plastic + health) */}
        <PlasticRealitySection annualSpend={annualSpend} inputs={inputs} />

        {/* 5. Convenience cost (weight + time) */}
        <ConvenienceCallout annualSpend={annualSpend} />

        {/* 6. Proof — when it pays back */}
        <BreakEvenSection breakEven={breakEven} inputs={inputs} />

        {/* 7. Projection chart */}
        <CostChart projection={tenYearProjection} breakEven={breakEven} sym={sym} />

        {/* 8. Aspirational — what to do with the freed money (Rule of 72 wealth-building) */}
        <WealthBuildingSection
          inputs={inputs}
          projection={tenYearProjection}
          assumedReturnRate={espringConfig.assumed_return_rate}
        />

        {/* 9. Future-pacing — concrete dated milestones */}
        <MilestonesSection
          breakEven={breakEven}
          projection={tenYearProjection}
          inputs={inputs}
        />

        {/* 10. Close — call to action */}
        <div id="get-espring">
          <CTASection espring={espringConfig} result={result} />
        </div>

        <FilterWarning
          annualLitres={annualSpend.annualLitres}
          filterCapacity={espringConfig.filter_capacity_litres}
          show={annualSpend.exceedsFilterCapacity}
        />

        {/* PDF Download — buttons gated by the client's download tier */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-aqua">Download</h2>
            <h3 className="text-2xl font-bold text-white">Save Your Report</h3>
            <p className="text-white/70 text-base">Choose the version that fits — keep it, print it, or share it.</p>
          </div>
          <ReportDownloadCard result={result} espring={espringConfig} paypal={paypalConfig} tier={downloadTier} />
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-aqua/20 to-teal-500/10 border border-aqua/30 rounded-2xl p-8 text-center space-y-4">
          <Droplets className="w-10 h-10 text-aqua mx-auto" />
          <p className="text-white text-lg font-medium leading-relaxed max-w-sm mx-auto">
            {espringConfig.cta_text}
          </p>
        </section>
      </div>

      {/* Persistent conversion CTA — slides in once the reader scrolls past the opening */}
      <div
        className={`fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-navy/95 backdrop-blur-sm px-5 py-3 transition-transform duration-300 ${
          showStickyCta ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="min-w-0 hidden sm:block">
            <p className="text-white/80 text-base font-medium leading-tight">{espringConfig.floating_cta_label || 'Every day you wait costs more'}</p>
            <p className="text-red-300 font-bold text-lg tabular-nums leading-tight">{formatCurrency(tenYearSavings, sym)}</p>
          </div>
          <Button className="flex-1 sm:flex-none sm:ml-auto" onClick={handleFloatingCtaClick}>
            {espringConfig.floating_cta_button || 'Stop the bleed →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
