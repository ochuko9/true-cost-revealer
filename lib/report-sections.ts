/**
 * Central registry of every report section.
 *
 * This is the single source of truth for:
 *   - the admin "PDF templates" checkbox grid (which sections in which template)
 *   - the PDF generator (which sections to render, in what order)
 *   - per-client download gating (tier → allowed templates → section lists)
 *
 * Section IDs are STABLE — never rename one once shipped, or saved admin
 * template configs would silently drop that section. Display numbers and titles
 * can change freely.
 */

export type SectionId =
  | 'inputs'
  | 'annual_spend'
  | 'money_lost'
  | 'payment_plans'
  | 'money_story'
  | 'yearly_breakdown'
  | 'plastic_volume'
  | 'plastic_scale'
  | 'microplastics'
  | 'recycling_myth'
  | 'convenience_weight'
  | 'convenience_time'
  | 'break_even'
  | 'ten_year_chart'
  | 'wealth_ladder'
  | 'wealth_destinations'
  | 'milestones'
  | 'closing_cta'

export interface ReportSection {
  id: SectionId
  /** Sequential display number used in the admin UI */
  number: number
  /** Human-readable title shown in admin checkboxes and PDF headers */
  title: string
  /** One-line explanation for the admin */
  description: string
}

export const REPORT_SECTIONS: ReportSection[] = [
  { id: 'inputs',              number: 1,  title: 'What You Told Us',            description: 'Inputs verification — the numbers the client entered' },
  { id: 'annual_spend',        number: 2,  title: 'Your Annual Water Spend',     description: 'Headline annual spend + consumption + cost per litre' },
  { id: 'money_lost',          number: 3,  title: 'Where Your Money Has Already Gone', description: 'Loss aversion — historical spend + live ticker' },
  { id: 'payment_plans',       number: 4,  title: 'Choose a Payment Plan',       description: 'Plan terms — monthly, interest, total, paid-off date' },
  { id: 'money_story',         number: 5,  title: 'Your Money Story',            description: 'Savings Spotlight — hero number, cash-flow tiles, timeline' },
  { id: 'yearly_breakdown',    number: 6,  title: 'Year-by-Year Breakdown',      description: 'Full 10-year cumulative comparison table' },
  { id: 'plastic_volume',      number: 7,  title: 'What Your Family Throws Away', description: 'Bottle count over 10 years' },
  { id: 'plastic_scale',       number: 8,  title: 'What It Looks Like Stacked Up', description: 'Visual height anchor (Mount Everest etc.)' },
  { id: 'microplastics',       number: 9,  title: 'Microplastics in Your Body',  description: '240,000 particles/litre health callout' },
  { id: 'recycling_myth',      number: 10, title: 'The Recycling Myth',          description: 'Only 9% of bottles are recycled' },
  { id: 'convenience_weight',  number: 11, title: 'The Weight You Carry',        description: 'Kilograms of water hauled over 10 years' },
  { id: 'convenience_time',    number: 12, title: 'The Time You Lose',           description: 'Hours spent buying and storing water' },
  { id: 'break_even',          number: 13, title: 'When eSpring Pays for Itself', description: 'Break-even date + 5/10-year savings' },
  { id: 'ten_year_chart',      number: 14, title: 'The 10-Year Picture',         description: 'Cumulative cost projection chart' },
  { id: 'wealth_ladder',       number: 15, title: 'The Compounding Ladder',      description: 'Rule of 72 doublings' },
  { id: 'wealth_destinations', number: 16, title: 'What That Money Could Fund',  description: 'College, retirement, home down payment' },
  { id: 'milestones',          number: 17, title: 'Mark Your Calendar',          description: 'Dated future milestones' },
  { id: 'closing_cta',         number: 18, title: 'Closing Call to Action',      description: 'Consultant contact + warranty + price anchor' },
]

/** Quick lookup by ID */
export const SECTION_BY_ID: Record<SectionId, ReportSection> = Object.fromEntries(
  REPORT_SECTIONS.map(s => [s.id, s]),
) as Record<SectionId, ReportSection>

export const ALL_SECTION_IDS: SectionId[] = REPORT_SECTIONS.map(s => s.id)

/** Canonical rank of each section id, for ordering. */
const SECTION_RANK = new Map<string, number>(ALL_SECTION_IDS.map((id, i) => [id, i]))

/**
 * Return the given section ids in canonical registry order, preserving
 * membership while dropping unknowns and duplicates.
 *
 * This is the single guard that keeps a template's section list from ever
 * drifting out of registry sequence. Call it on every WRITE (admin config
 * PATCH) and before rendering a PDF — that way the stored order, and the
 * generated report, can never depend on the order checkboxes were clicked or
 * on which version of the UI did the editing. The admin grid offers no custom
 * ordering, so registry order is always the intended order.
 */
export function normalizeSectionIds(ids: unknown): SectionId[] {
  if (!Array.isArray(ids)) return []
  const present = new Set<string>()
  for (const id of ids) if (typeof id === 'string' && SECTION_RANK.has(id)) present.add(id)
  return ALL_SECTION_IDS.filter(id => present.has(id))
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF templates
// ─────────────────────────────────────────────────────────────────────────────

export type TemplateName = 'brief' | 'standard' | 'full'

export type PdfTemplates = Record<TemplateName, SectionId[]>

/** Defaults seeded into espring_config; admin can override every entry. */
export const DEFAULT_PDF_TEMPLATES: PdfTemplates = {
  brief: [
    'inputs',
    'annual_spend',
    'money_story',
    'break_even',
    'closing_cta',
  ],
  standard: [
    'inputs',
    'annual_spend',
    'money_lost',
    'payment_plans',
    'money_story',
    'plastic_volume',
    'microplastics',
    'break_even',
    'ten_year_chart',
    'wealth_ladder',
    'milestones',
    'closing_cta',
  ],
  full: ALL_SECTION_IDS,
}

export const TEMPLATE_LABELS: Record<TemplateName, string> = {
  brief: 'Brief',
  standard: 'Standard',
  full: 'Full',
}

export const TEMPLATE_BLURBS: Record<TemplateName, string> = {
  brief: 'the highlights',
  standard: 'the main story',
  full: 'every detail',
}

// ─────────────────────────────────────────────────────────────────────────────
// Download tiers (per-client access control)
// ─────────────────────────────────────────────────────────────────────────────

export type DownloadTier = 'none' | 'brief' | 'standard' | 'full'

/** Each tier grants exactly its own template — no lighter templates bundled in. */
export const TIER_TEMPLATES: Record<DownloadTier, TemplateName[]> = {
  none: [],
  brief: ['brief'],
  standard: ['standard'],
  full: ['full'],
}

export const TIER_LABELS: Record<DownloadTier, string> = {
  none: 'None',
  brief: 'Brief',
  standard: 'Standard',
  full: 'Full',
}

/** Newly-invited clients get the full arsenal by default; admin downgrades as needed. */
export const DEFAULT_CLIENT_TIER: DownloadTier = 'full'

/** Type guard for validating values coming from the DB / API */
export function isDownloadTier(v: unknown): v is DownloadTier {
  return v === 'none' || v === 'brief' || v === 'standard' || v === 'full'
}
