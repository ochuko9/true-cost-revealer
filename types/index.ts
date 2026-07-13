export interface ESpringConfig {
  id: string
  unit_price: number
  annual_filter_cost: number
  uv_lamp_cost: number
  uv_lamp_frequency_years: number
  filter_capacity_litres: number
  system_lifespan_years: number
  warranty_years: number
  bottled_water_inflation_rate: number
  espring_inflation_rate: number
  cta_text: string
  /** Floating/sticky conversion CTA on the live results page. Text only — the
   *  dollar figure shown in the bar is always computed. Not used in any PDF. */
  floating_cta_label: string
  floating_cta_button: string
  /** Where the floating CTA button links to. Opens in a new tab; falls back to
   *  scrolling to the on-page CTA section when unset. */
  floating_cta_url: string | null
  logo_url: string | null
  /** Consultant / sales-rep contact details used by the closing CTA block */
  consultant_name: string | null
  consultant_phone: string | null
  consultant_email: string | null
  booking_url: string | null
  warranty_text: string | null
  /** Annual market return assumption for the Wealth Building section (default 0.08 = 8%) */
  assumed_return_rate: number
  /** Which sections appear in each downloadable PDF template */
  pdf_templates: {
    brief: string[]
    standard: string[]
    full: string[]
  }
  /** Download tier assigned to newly-invited clients */
  default_client_tier: 'none' | 'brief' | 'standard' | 'full'
  updated_at: string
}

export interface PayPalPlan {
  months: number
  monthly_payment: number
  total_interest: number
  total_paid: number
}

export interface PayPalConfig {
  id: string
  provider: string
  down_payment: number
  promo_apr: number
  standard_apr: number
  plan_6_monthly: number
  plan_6_interest: number
  plan_6_total: number
  plan_12_monthly: number
  plan_12_interest: number
  plan_12_total: number
  plan_24_monthly: number
  plan_24_interest: number
  plan_24_total: number
  updated_at: string
}

export interface Client {
  id: string
  email: string | null
  token: string
  token_url: string
  access_enabled: boolean
  created_at: string
  last_accessed_at: string | null
  access_count: number
  completed_calculator: boolean
  /** Which PDF templates this client may download */
  download_tier: 'none' | 'brief' | 'standard' | 'full'
}

export interface AccessRequest {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  created_at: string
  converted: boolean
}

export interface AccessLog {
  id: string
  client_id: string
  accessed_at: string
  ip_address: string | null
  user_agent: string | null
  completed: boolean
}

export interface CalculatorInputs {
  firstName: string
  householdSize: number
  country: string
  currencySymbol: string
  purchaseUnit: 'bottle' | 'case' | '5gallon'
  purchaseFrequency: 'day' | 'week' | 'month'
  purchaseQuantity: number
  costPerUnit: number
  bottlesPerCase: number
  hasWaterDelivery: boolean
  deliveryUnit: 'flat' | '5gallon'
  deliveryMonthlyCost: number
  deliveryJugsPerMonth: number
  deliveryCostPerJug: number
  inDeliveryContract: boolean
  hasHomeFiltration: boolean
  filtrationMonthlyCost: number
  otherMonthlyCost: number
}

export interface AnnualSpend {
  bottledWaterAnnual: number
  deliveryAnnual: number
  filtrationAnnual: number
  otherAnnual: number
  total: number
  annualLitres: number
  costPerLitre: number
  exceedsFilterCapacity: boolean
}

export interface YearlyProjection {
  year: number
  currentSpendCumulative: number
  eSpringCashCumulative: number
  eSpringCashAnnual: number
  breakEvenMonth: number | null
}

export interface ComparisonRow {
  label: string
  currentSpend: number
  eSpringCash: number
  eSpring6Month: number
  eSpring12Month: number
  eSpring24Month: number
}

export interface BreakEven {
  monthNumber: number
  monthLabel: string
  totalSavedAt5Years: number
  totalSavedAt10Years: number
}

export interface CalculationResult {
  inputs: CalculatorInputs
  annualSpend: AnnualSpend
  eSpringCostPerLitre: number
  comparisonRows: ComparisonRow[]
  breakEven: BreakEven
  tenYearProjection: YearlyProjection[]
  monthlyFreedBudget: number
  savingsEquivalencies: SavingsEquivalency[]
}

export interface SavingsEquivalency {
  label: string
  count: number
  unitLabel: string
  icon: string
}

/**
 * A persisted report bundle. Stored in `client_reports.report_data` and returned
 * to the admin so a client's PDF can be regenerated exactly as they saw it — the
 * config snapshot travels with the result so later config edits don't alter it.
 */
export interface SavedReport {
  result: CalculationResult
  espring: ESpringConfig
  paypal: PayPalConfig
}

