'use client'

import { CalculationResult, ESpringConfig } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Calendar, Mail, Phone, Shield, Sparkles } from 'lucide-react'

interface Props {
  espring: ESpringConfig
  result: CalculationResult
}

/**
 * "a" vs "an" article for a numeric prefix.
 *
 * The article depends on the *spoken* form of the number, not the digit. So:
 *   3-year → "a three-year"  (consonant sound)
 *   5-year → "a five-year"
 *   8-year → "an eight-year" (vowel sound)
 *   11-year → "an eleven-year"
 *   18-year → "an eighteen-year"
 *   80-year → "an eighty-year"
 *   100-year → "a one-hundred-year"
 */
function articleFor(n: number): string {
  const s = String(n)
  // Numbers whose spoken form starts with a vowel sound: 8, 11, 18, and any
  // number starting with 8 (80, 800, 8000…) or 11/18 prefix patterns.
  if (s === '11' || s === '18' || s.startsWith('8')) return 'an'
  return 'a'
}

/**
 * Closing call-to-action.
 *
 * The hero number from the Money Story is repeated here as a reminder of the
 * stakes. Below it: named consultant + click-to-call/email + booking link +
 * warranty/risk-reversal + a price-anchoring line that reframes the unit price
 * against larger purchases people happily finance.
 *
 * Designed so the admin can leave any consultant field blank and the section
 * still renders cleanly — it just shows whatever fields ARE filled in.
 */
export default function CTASection({ espring, result }: Props) {
  const sym = result.inputs.currencySymbol
  const tenYear = result.tenYearProjection[result.tenYearProjection.length - 1]
  const tenYearSavings = Math.max(0, tenYear.currentSpendCumulative - tenYear.eSpringCashCumulative)

  const hasAnyContact = Boolean(
    espring.consultant_name || espring.consultant_phone || espring.consultant_email || espring.booking_url,
  )

  return (
    <section className="space-y-5">
      <div className="bg-gradient-to-br from-aqua/15 via-emerald-500/10 to-teal-500/15 border-2 border-aqua/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-aqua/10">
        {/* Hero close */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-aqua/20 border border-aqua/40 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-aqua" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            {result.inputs.firstName}, ready to keep
            <br />
            <span className="bg-gradient-to-br from-emerald-300 to-aqua bg-clip-text text-transparent">
              {formatCurrency(tenYearSavings, sym)}?
            </span>
          </h2>
          <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">
            {espring.cta_text}
          </p>
        </div>

        {/* Consultant block — only renders if at least one field is set */}
        {hasAnyContact && (
          <div className="bg-navy-dark/50 border border-aqua/30 rounded-2xl p-5 space-y-4">
            {espring.consultant_name && (
              <p className="text-white text-center text-sm">
                Talk to <span className="font-bold text-aqua">{espring.consultant_name}</span> today
              </p>
            )}

            {(espring.consultant_phone || espring.consultant_email) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {espring.consultant_phone && (
                  <a
                    href={`tel:${espring.consultant_phone.replace(/[^+\d]/g, '')}`}
                    className="flex items-center justify-center gap-2.5 bg-aqua/10 hover:bg-aqua/20 active:bg-aqua/30 border border-aqua/30 rounded-xl py-3 px-3 transition-all"
                  >
                    <Phone className="w-4 h-4 text-aqua flex-shrink-0" />
                    <span className="text-white text-sm font-medium truncate">{espring.consultant_phone}</span>
                  </a>
                )}
                {espring.consultant_email && (
                  <a
                    href={`mailto:${espring.consultant_email}`}
                    className="flex items-center justify-center gap-2.5 bg-aqua/10 hover:bg-aqua/20 active:bg-aqua/30 border border-aqua/30 rounded-xl py-3 px-3 transition-all"
                  >
                    <Mail className="w-4 h-4 text-aqua flex-shrink-0" />
                    <span className="text-white text-sm font-medium truncate">{espring.consultant_email}</span>
                  </a>
                )}
              </div>
            )}

            {espring.booking_url && (
              <a
                href={espring.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-aqua text-navy hover:bg-aqua/90 active:bg-aqua/80 rounded-xl py-3.5 font-bold text-sm transition-all shadow-lg shadow-aqua/30"
              >
                <Calendar className="w-5 h-5" />
                Schedule a Call
              </a>
            )}
          </div>
        )}

        {/* Risk reversal / warranty */}
        <div className="bg-emerald-500/5 border border-emerald-400/30 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-white text-sm font-semibold">
              Backed by {articleFor(espring.warranty_years)} {espring.warranty_years}-year manufacturer&apos;s warranty
            </p>
            <p className="text-white/60 text-xs leading-relaxed">
              {espring.warranty_text?.trim()
                || "eSpring uses NSF-certified components engineered to last the unit’s full design life. If anything fails during the warranty period, you’re fully covered."}
            </p>
          </div>
        </div>

        {/* Anchoring line — reframes price against larger comfortable purchases */}
        <p className="text-center text-white/50 text-xs leading-relaxed px-2">
          For perspective: a typical car loan finances $30,000+ of depreciation that vanishes the moment you drive off the lot. eSpring is{' '}
          <span className="text-white font-semibold">{formatCurrency(espring.unit_price, sym)}</span> that{' '}
          <span className="text-emerald-300 font-semibold">pays itself back, then keeps paying you back</span>{' '}
          for the rest of its life.
        </p>
      </div>
    </section>
  )
}
