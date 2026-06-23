import type {
  CalculatorInputs,
  AnnualSpend,
  BreakEven,
  CalculationResult,
  ComparisonRow,
  ESpringConfig,
  PayPalConfig,
  SavingsEquivalency,
  YearlyProjection,
} from '@/types'

const BOTTLE_LITRES   = 0.5
const GALLON_5_LITRES = 18.927
const MONTHS_PER_YEAR = 12

/** Normalise purchase inputs to annual cost and annual litres */
function computePurchaseAnnuals(inputs: CalculatorInputs): { annualCost: number; annualLitres: number } {
  const qty = inputs.purchaseQuantity || 0
  const freqMultiplier = inputs.purchaseFrequency === 'day'   ? 365
    : inputs.purchaseFrequency === 'week'  ? 52
    : 12 // month

  if (inputs.purchaseUnit === 'bottle') {
    return {
      annualCost:   qty * freqMultiplier * (inputs.costPerUnit || 0),
      annualLitres: qty * freqMultiplier * BOTTLE_LITRES,
    }
  }
  if (inputs.purchaseUnit === 'case') {
    const bottlesPerCase = inputs.bottlesPerCase || 24
    return {
      annualCost:   qty * freqMultiplier * (inputs.costPerUnit || 0),
      annualLitres: qty * freqMultiplier * bottlesPerCase * BOTTLE_LITRES,
    }
  }
  // 5-gallon jugs
  return {
    annualCost:   qty * freqMultiplier * (inputs.costPerUnit || 0),
    annualLitres: qty * freqMultiplier * GALLON_5_LITRES,
  }
}

export function computeAnnualSpend(inputs: CalculatorInputs, filterCapacityLitres: number): AnnualSpend {
  // User enters what they actually pay — no tax adjustment needed
  const { annualCost: bottledWaterAnnual, annualLitres } = computePurchaseAnnuals(inputs)
  // Delivery cost + litres
  // 5-gallon delivery litres ARE included in annualLitres — this water will flow through the
  // eSpring when the client switches, so it correctly drives filter replacement frequency.
  // Flat-rate delivery: cost is known but litres are not, so litre contribution is zero.
  let deliveryAnnual = 0
  let deliveryAnnualLitres = 0
  if (inputs.hasWaterDelivery) {
    if (inputs.deliveryUnit === '5gallon') {
      deliveryAnnual = inputs.deliveryJugsPerMonth * inputs.deliveryCostPerJug * MONTHS_PER_YEAR
      deliveryAnnualLitres = (inputs.deliveryJugsPerMonth || 0) * GALLON_5_LITRES * MONTHS_PER_YEAR
    } else {
      deliveryAnnual = inputs.deliveryMonthlyCost * MONTHS_PER_YEAR
      // deliveryAnnualLitres stays 0 — volume unknown for flat-rate services
    }
  }
  const filtrationAnnual = inputs.hasHomeFiltration ? inputs.filtrationMonthlyCost * MONTHS_PER_YEAR : 0
  const otherAnnual = inputs.otherMonthlyCost * MONTHS_PER_YEAR

  const total = bottledWaterAnnual + deliveryAnnual + filtrationAnnual + otherAnnual

  // Total litres = purchased water + 5-gallon delivery (both will flow through eSpring after switch)
  const totalAnnualLitres = annualLitres + deliveryAnnualLitres
  const costPerLitre = totalAnnualLitres > 0 ? total / totalAnnualLitres : 0

  return {
    bottledWaterAnnual,
    deliveryAnnual,
    filtrationAnnual,
    otherAnnual,
    total,
    annualLitres: totalAnnualLitres,
    costPerLitre,
    exceedsFilterCapacity: totalAnnualLitres > filterCapacityLitres,
  }
}

function inflated(base: number, rate: number, year: number): number {
  return base * Math.pow(1 + rate, year - 1)
}

function buildCurrentSpendByYear(
  annualTotal: number,
  inflationRate: number,
  years: number
): number[] {
  return Array.from({ length: years }, (_, i) =>
    inflated(annualTotal, inflationRate, i + 1)
  )
}

/**
 * Returns the exact annual eSpring ongoing cost (filter + UV only) for each year.
 * Unit price is NOT included — caller adds it once as the initial investment.
 *
 * Both filter and UV lamp are tracked on a USAGE basis (cumulative litres), not a
 * calendar basis. This reflects real eSpring components — neither degrades on the
 * shelf; they wear out as water flows through the system.
 *
 * Filter:
 *   - Unit ships with ONE filter included. It covers the first filter_capacity_litres.
 *   - A replacement is purchased each time another filter_capacity_litres is consumed.
 *
 * UV lamp:
 *   - Same model. Initial UV lamp included. Replacement when cumulative litres exceed
 *     `uv_lamp_frequency_years × filter_capacity_litres` (i.e. the config field is
 *     interpreted as "years at typical usage" and converted to a litre threshold).
 *
 * Example (681 L/yr, 5 000 L filter capacity, UV freq = 2 yrs):
 *   - Filter threshold = 5 000 L  → first replacement at year ~7.3
 *   - UV threshold     = 10 000 L → first replacement at year ~14.7 (never in 10 yr horizon)
 *   - Years 1–10 ongoing cost = $0
 */
function buildESpringOngoingByYear(cfg: ESpringConfig, annualLitres: number, years: number): number[] {
  // Fall back to one-filter-per-year if no consumption data is available
  const litresPerYear = annualLitres > 0 ? annualLitres : cfg.filter_capacity_litres

  // UV lamp life in litres = (years at typical usage) × (litres per typical year)
  const uvCapacityLitres = cfg.uv_lamp_frequency_years * cfg.filter_capacity_litres

  const result: number[] = []
  let cumLitres = 0
  let filtersBought = 0 // replacement filters purchased (initial included with unit = free)
  let uvLampsBought = 0 // replacement UV lamps purchased (initial included with unit = free)

  for (let y = 1; y <= years; y++) {
    cumLitres += litresPerYear

    // Filter: one replacement for every filter_capacity_litres consumed beyond the initial
    const totalFilters = Math.floor(cumLitres / cfg.filter_capacity_litres)
    const newFilters = totalFilters - filtersBought
    filtersBought = totalFilters

    // UV: same model, but with a larger capacity threshold
    const totalUv = Math.floor(cumLitres / uvCapacityLitres)
    const newUv = totalUv - uvLampsBought
    uvLampsBought = totalUv

    const filterCost = newFilters > 0
      ? inflated(cfg.annual_filter_cost, cfg.espring_inflation_rate, y) * newFilters
      : 0
    const uvCost = newUv > 0
      ? inflated(cfg.uv_lamp_cost, cfg.espring_inflation_rate, y) * newUv
      : 0

    result.push(filterCost + uvCost)
  }

  return result
}

export function computeBreakEven(
  annualSpend: AnnualSpend,
  cfg: ESpringConfig
): BreakEven {
  const currentMonthly = annualSpend.total / MONTHS_PER_YEAR
  const bottleInflationMonthly = Math.pow(1 + cfg.bottled_water_inflation_rate, 1 / MONTHS_PER_YEAR) - 1

  // Litres consumed per month (use filter capacity / 12 as fallback so math doesn't break)
  const monthlyLitres = annualSpend.annualLitres > 0
    ? annualSpend.annualLitres / MONTHS_PER_YEAR
    : cfg.filter_capacity_litres / MONTHS_PER_YEAR

  // UV lamp life expressed in litres (see buildESpringOngoingByYear for rationale)
  const uvCapacityLitres = cfg.uv_lamp_frequency_years * cfg.filter_capacity_litres

  let cumulativeCurrent = 0
  let cumulativeEspring = cfg.unit_price // unit price paid once upfront (includes first filter + UV)
  let breakEvenMonth = -1
  let cumLitres = 0        // total litres consumed through eSpring so far
  let filtersBought = 0    // purchased filter count (the initial included one is NOT counted)
  let uvLampsBought = 0    // purchased UV lamp count (the initial included one is NOT counted)

  for (let m = 1; m <= cfg.system_lifespan_years * MONTHS_PER_YEAR; m++) {
    // --- Current spend side ---
    const currentPayment = currentMonthly * Math.pow(1 + bottleInflationMonthly, m - 1)
    cumulativeCurrent += currentPayment

    // --- eSpring side ---
    cumLitres += monthlyLitres
    const yearForThisMonth = Math.floor((m - 1) / MONTHS_PER_YEAR)

    // Filter purchases trigger when cumulative litres cross multiples of capacity
    // (initial filter is included with the unit, so floor() gives PURCHASED count).
    const totalFiltersPurchased = Math.floor(cumLitres / cfg.filter_capacity_litres)
    const newFilters = totalFiltersPurchased - filtersBought
    filtersBought = totalFiltersPurchased

    // UV lamp purchases use the same model but with a larger capacity threshold
    const totalUvPurchased = Math.floor(cumLitres / uvCapacityLitres)
    const newUv = totalUvPurchased - uvLampsBought
    uvLampsBought = totalUvPurchased

    const filterPayment = newFilters > 0
      ? inflated(cfg.annual_filter_cost, cfg.espring_inflation_rate, yearForThisMonth + 1) * newFilters
      : 0
    const uvPayment = newUv > 0
      ? inflated(cfg.uv_lamp_cost, cfg.espring_inflation_rate, yearForThisMonth + 1) * newUv
      : 0

    cumulativeEspring += filterPayment + uvPayment

    if (breakEvenMonth === -1 && cumulativeCurrent > cumulativeEspring) {
      breakEvenMonth = m
    }
  }

  const ongoingByYear = buildESpringOngoingByYear(cfg, annualSpend.annualLitres, 10)
  const currentByYear = buildCurrentSpendByYear(annualSpend.total, cfg.bottled_water_inflation_rate, 10)

  let cum5Current = 0, cum5Espring = cfg.unit_price
  let cum10Current = 0, cum10Espring = cfg.unit_price

  for (let y = 0; y < 5; y++) {
    cum5Current += currentByYear[y]
    cum5Espring += ongoingByYear[y]
  }
  for (let y = 0; y < 10; y++) {
    cum10Current += currentByYear[y]
    cum10Espring += ongoingByYear[y]
  }

  const date = new Date()
  date.setMonth(date.getMonth() + (breakEvenMonth > 0 ? breakEvenMonth : 24))
  const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return {
    monthNumber: breakEvenMonth > 0 ? breakEvenMonth : 24,
    monthLabel,
    totalSavedAt5Years: Math.max(0, cum5Current - cum5Espring),
    totalSavedAt10Years: Math.max(0, cum10Current - cum10Espring),
  }
}

export function computeComparisonRows(
  annualSpend: AnnualSpend,
  cfg: ESpringConfig,
  paypal: PayPalConfig
): ComparisonRow[] {
  // Project across the full 10-year horizon so the comparison covers the system's
  // expected lifetime (matches the 10-year chart and matches the UV-C LED rating).
  const currentByYear = buildCurrentSpendByYear(annualSpend.total, cfg.bottled_water_inflation_rate, 10)
  const ongoingByYear = buildESpringOngoingByYear(cfg, annualSpend.annualLitres, 10)

  // Cumulative current spend
  const cumCurrent = (y: number) => currentByYear.slice(0, y).reduce((a, b) => a + b, 0)

  // Cumulative eSpring cash: unit price paid once upfront + ongoing costs
  const cumESpringCash = (y: number) =>
    cfg.unit_price + ongoingByYear.slice(0, y).reduce((a, b) => a + b, 0)

  // Cumulative eSpring financed: financing payments replace unit price.
  //
  // IMPORTANT: paypal.plan_X_monthly is the amortized payment (interest already baked in).
  // paypal.plan_X_total === plan_X_monthly × X. We must NOT add plan_X_interest on top,
  // or we'd double-count the interest charge.
  const cumESpringFinanced = (y: number, plan: 6 | 12 | 24): number => {
    let total = 0
    for (let i = 1; i <= y; i++) {
      const ongoing = ongoingByYear[i - 1]
      let financing = 0
      if (plan === 6) {
        // 6-month plan: fully paid off within Year 1
        if (i === 1) financing = paypal.plan_6_total
      } else if (plan === 12) {
        // 12-month plan: fully paid off within Year 1
        if (i === 1) financing = paypal.plan_12_total
      } else {
        // 24-month plan: 12 monthly payments in Year 1, 12 more in Year 2
        if (i === 1) financing = paypal.plan_24_monthly * 12
        if (i === 2) financing = paypal.plan_24_monthly * 12
      }
      total += ongoing + financing
    }
    return total
  }

  // Emit one cumulative row per year, Year 1 through Year 10
  return Array.from({ length: 10 }, (_, i) => {
    const y = i + 1
    return {
      label: y === 1 ? '1 Year' : `${y} Years`,
      currentSpend: cumCurrent(y),
      eSpringCash: cumESpringCash(y),
      eSpring6Month: cumESpringFinanced(y, 6),
      eSpring12Month: cumESpringFinanced(y, 12),
      eSpring24Month: cumESpringFinanced(y, 24),
    }
  })
}

export function computeTenYearProjection(
  annualSpend: AnnualSpend,
  cfg: ESpringConfig
): YearlyProjection[] {
  const currentByYear = buildCurrentSpendByYear(annualSpend.total, cfg.bottled_water_inflation_rate, 10)
  const ongoingByYear = buildESpringOngoingByYear(cfg, annualSpend.annualLitres, 10)

  let cumCurrent = 0
  let cumEspring = cfg.unit_price // start with unit price as initial investment
  const breakEven = computeBreakEven(annualSpend, cfg)

  return Array.from({ length: 10 }, (_, i) => {
    cumCurrent += currentByYear[i]
    cumEspring += ongoingByYear[i]
    return {
      year: i + 1,
      currentSpendCumulative: cumCurrent,
      eSpringCashCumulative: cumEspring,
      eSpringCashAnnual: ongoingByYear[i],
      breakEvenMonth: i === 0 ? breakEven.monthNumber : null,
    }
  })
}

const EQUIVALENCIES = [
  { label: 'Restaurant dinners', unitLabel: 'dinners', icon: '🍽️', unitCost: 70 },
  { label: 'Streaming subscriptions', unitLabel: 'months', icon: '📺', unitCost: 45 },
  { label: 'Gym memberships', unitLabel: 'months', icon: '🏋️', unitCost: 40 },
  { label: 'Weeks of groceries', unitLabel: 'weeks', icon: '🛒', unitCost: 120 },
  { label: 'Family day trips', unitLabel: 'trips', icon: '🎡', unitCost: 80 },
  { label: 'Tanks of fuel', unitLabel: 'fill-ups', icon: '⛽', unitCost: 55 },
  { label: 'Weekend getaway fund', unitLabel: 'weekends/year', icon: '✈️', unitCost: 300 },
]

export function computeSavingsEquivalencies(monthlyFreedBudget: number): SavingsEquivalency[] {
  const annual = monthlyFreedBudget * 12
  return EQUIVALENCIES
    .map(e => ({ ...e, count: Math.floor(annual / e.unitCost) }))
    .filter(e => e.count >= 1)
    .sort((a, b) => Math.abs(a.count - 12) - Math.abs(b.count - 12))
    .slice(0, 4)
    .map(({ label, unitLabel, icon, count }) => ({ label, unitLabel, icon, count }))
}

export function runCalculation(
  inputs: CalculatorInputs,
  cfg: ESpringConfig,
  paypal: PayPalConfig
): CalculationResult {
  const annualSpend = computeAnnualSpend(inputs, cfg.filter_capacity_litres)

  // Cost per litre is a fixed rate: filter price ÷ filter capacity
  const eSpringCostPerLitre = cfg.annual_filter_cost / cfg.filter_capacity_litres

  const comparisonRows = computeComparisonRows(annualSpend, cfg, paypal)
  const breakEven = computeBreakEven(annualSpend, cfg)
  const tenYearProjection = computeTenYearProjection(annualSpend, cfg)

  // Usage-based ongoing monthly cost after system is paid off
  const filtersPerYear = annualSpend.annualLitres > 0
    ? annualSpend.annualLitres / cfg.filter_capacity_litres
    : 1
  const ongoingMonthly = (cfg.annual_filter_cost * filtersPerYear) / MONTHS_PER_YEAR
  const monthlyFreedBudget = Math.max(0, annualSpend.total / MONTHS_PER_YEAR - ongoingMonthly)
  const savingsEquivalencies = computeSavingsEquivalencies(monthlyFreedBudget)

  return {
    inputs,
    annualSpend,
    eSpringCostPerLitre,
    comparisonRows,
    breakEven,
    tenYearProjection,
    monthlyFreedBudget,
    savingsEquivalencies,
  }
}
