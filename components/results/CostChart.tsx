'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { YearlyProjection, BreakEven } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  projection: YearlyProjection[]
  breakEven: BreakEven
  sym: string
}

interface TooltipEntry { name: string; value: number; color: string }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string; sym: string }

function CustomTooltip({ active, payload, label, sym }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-dark border border-white/20 rounded-xl p-4 shadow-xl text-sm space-y-1.5">
      <p className="text-white/60 font-medium">Year {label}</p>
      {payload.map((p: TooltipEntry) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="text-white font-semibold">{formatCurrency(p.value, sym)}</span>
        </div>
      ))}
    </div>
  )
}

export default function CostChart({ projection, breakEven, sym }: Props) {
  const breakEvenYear = breakEven.monthNumber / 12
  const year5Gap = projection[4]?.currentSpendCumulative - projection[4]?.eSpringCashCumulative
  const year10Gap = projection[9]?.currentSpendCumulative - projection[9]?.eSpringCashCumulative

  const data = projection.map(p => ({
    year: p.year,
    'Bottled Water': Math.round(p.currentSpendCumulative),
    'eSpring': Math.round(p.eSpringCashCumulative),
  }))

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-white">Cost of Doing Nothing</h3>
        <p className="text-white/50 text-sm">Cumulative 10-year spend with inflation applied</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradEspring" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="year"
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              tickFormatter={v => `Yr ${v}`}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              tickFormatter={v => `${sym}${(v / 1000).toFixed(0)}k`}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip sym={sym} />} />
            <Legend
              wrapperStyle={{ paddingTop: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}
            />
            {breakEvenYear > 0 && breakEvenYear <= 10 && (
              <ReferenceLine
                x={Math.ceil(breakEvenYear)}
                stroke="#34d399"
                strokeDasharray="4 3"
                label={{ value: 'Break-even', fill: '#34d399', fontSize: 10, position: 'top' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="Bottled Water"
              stroke="#f87171"
              strokeWidth={2}
              fill="url(#gradCurrent)"
            />
            <Area
              type="monotone"
              dataKey="eSpring"
              stroke="#00B4D8"
              strokeWidth={2}
              fill="url(#gradEspring)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Callout cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-red-400/80 uppercase tracking-wider">Extra spent on bottles</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(Math.max(0, year5Gap), sym)}</p>
          <p className="text-xs text-red-400/60">by Year 5</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-red-400/80 uppercase tracking-wider">Extra spent on bottles</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(Math.max(0, year10Gap), sym)}</p>
          <p className="text-xs text-red-400/60">by Year 10</p>
        </div>
      </div>
    </section>
  )
}
