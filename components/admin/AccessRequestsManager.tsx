'use client'

import { useEffect, useState } from 'react'
import { AccessRequest } from '@/types'
import { Inbox, UserPlus, Trash2, Copy, Check, Loader2, Mail, Phone } from 'lucide-react'
import Button from '@/components/ui/Button'
import { TIER_LABELS, type DownloadTier } from '@/lib/report-sections'

const TIER_ORDER: DownloadTier[] = ['none', 'brief', 'standard', 'full']

export default function AccessRequestsManager() {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Maps a converted request id → the new client's token (for the invite link)
  const [convertedTokens, setConvertedTokens] = useState<Record<string, string>>({})
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  // Two-step convert: which card is awaiting tier confirmation, and what tier
  const [pendingConvertId, setPendingConvertId] = useState<string | null>(null)
  const [pendingConvertTier, setPendingConvertTier] = useState<DownloadTier>('full')

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function load() {
    const res = await fetch('/api/admin/access-requests', { cache: 'no-store' })
    const data = await res.json()
    setRequests(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function convert(id: string, tier: DownloadTier) {
    setBusyId(id)
    setPendingConvertId(null)
    const res = await fetch('/api/admin/access-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tier }),
    })
    if (res.ok) {
      const client = await res.json()
      setConvertedTokens(prev => ({ ...prev, [id]: client.token }))
      setRequests(prev => prev.map(r => r.id === id ? { ...r, converted: true } : r))
    }
    setBusyId(null)
  }

  async function dismiss(id: string) {
    if (!confirm('Dismiss this request?')) return
    setBusyId(id)
    await fetch('/api/admin/access-requests', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setRequests(prev => prev.filter(r => r.id !== id))
    setBusyId(null)
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${appUrl}/access/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  if (loading) return <div className="text-white/50 text-sm py-8 text-center">Loading access requests…</div>

  const pending = requests.filter(r => !r.converted)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-aqua/15 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-aqua" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Access Requests</h2>
          <p className="text-white/50 text-sm">
            {pending.length} pending · {requests.length} total
          </p>
        </div>
      </div>

      {requests.length === 0 && (
        <div className="text-center py-10 text-white/60 bg-white/[0.02] border border-white/10 rounded-2xl">
          <p>No access requests yet.</p>
          <p className="text-xs mt-1">Leads from the &ldquo;Request Access&rdquo; page will appear here.</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map(r => {
          const token = convertedTokens[r.id]
          const date = new Date(r.created_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })
          const isPending = pendingConvertId === r.id
          return (
            <div
              key={r.id}
              className={`bg-white/5 border rounded-2xl p-5 space-y-3 ${r.converted ? 'border-emerald-400/20 opacity-80' : 'border-white/10'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  {r.name
                    ? <p className="text-white font-semibold text-sm">{r.name}</p>
                    : <p className="text-white/60 text-sm italic">No name given</p>}
                  {r.email && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Mail className="w-3.5 h-3.5 text-white/60" /> {r.email}
                    </div>
                  )}
                  {r.phone && (
                    <div className="flex items-center gap-2 text-white/70 text-sm">
                      <Phone className="w-3.5 h-3.5 text-white/60" /> {r.phone}
                    </div>
                  )}
                  <p className="text-xs text-white/60">Requested {date}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.converted ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Converted</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => { setPendingConvertId(r.id); setPendingConvertTier('full') }}
                      disabled={busyId === r.id || isPending}
                    >
                      {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Convert
                    </Button>
                  )}
                  <button
                    onClick={() => dismiss(r.id)}
                    title="Dismiss"
                    disabled={busyId === r.id}
                    className="text-white/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tier picker — shown after clicking Convert, before confirming */}
              {isPending && (
                <div className="bg-white/5 border border-aqua/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-white/60">Report access tier</span>
                    <select
                      value={pendingConvertTier}
                      onChange={e => setPendingConvertTier(e.target.value as DownloadTier)}
                      className="bg-white/5 border border-white/10 rounded-lg text-white text-xs py-1.5 px-2.5 focus:outline-none focus:border-aqua/60 cursor-pointer"
                    >
                      {TIER_ORDER.map(t => (
                        <option key={t} value={t} className="bg-navy">
                          {t === 'none' ? 'No downloads' : `${TIER_LABELS[t]} report`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => convert(r.id, pendingConvertTier)}>
                      <UserPlus className="w-4 h-4" /> Confirm Convert
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingConvertId(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Show the invite link right after converting */}
              {token && (
                <div className="flex items-center gap-2 bg-aqua/5 border border-aqua/20 rounded-xl px-3 py-2.5">
                  <span className="text-white/60 text-xs font-mono truncate flex-1">/access/{token}</span>
                  <button
                    onClick={() => copyLink(token)}
                    className="shrink-0 text-aqua/70 hover:text-aqua transition-colors flex items-center gap-1 text-xs"
                  >
                    {copiedToken === token ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /><span>Copy invite link</span></>
                    )}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
