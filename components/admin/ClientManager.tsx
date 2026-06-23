'use client'

import { useEffect, useState } from 'react'
import { Client } from '@/types'
import { Plus, Copy, Trash2, ToggleLeft, ToggleRight, Mail, Link, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { TIER_LABELS, type DownloadTier } from '@/lib/report-sections'
import ClientReportDownload from './ClientReportDownload'

const TIER_ORDER: DownloadTier[] = ['none', 'brief', 'standard', 'full']

export default function ClientManager() {
  const [clients, setClients] = useState<(Client & { access_logs: { id: string; accessed_at: string; completed: boolean }[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  async function loadClients() {
    const res = await fetch('/api/admin/clients')
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  async function addClient() {
    setAdding(true)
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() || null }),
    })
    if (res.ok) {
      setEmail('')
      setShowAddForm(false)
      await loadClients()
    }
    setAdding(false)
  }

  async function toggleAccess(id: string, current: boolean) {
    await fetch('/api/admin/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, access_enabled: !current }),
    })
    await loadClients()
  }

  async function updateTier(id: string, tier: DownloadTier) {
    // Optimistic update so the dropdown responds instantly
    setClients(prev => prev.map(c => c.id === id ? { ...c, download_tier: tier } : c))
    await fetch('/api/admin/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, download_tier: tier }),
    })
  }

  async function deleteClient(id: string) {
    if (!confirm('Delete this client permanently?')) return
    await fetch('/api/admin/clients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadClients()
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${appUrl}/access/${token}`)
    setCopiedId(token)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <div className="text-white/50 text-sm py-8 text-center">Loading clients…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Client Access</h2>
          <p className="text-white/50 text-sm">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} size="sm">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-sm">New Client</h3>
          <Input
            id="clientEmail"
            label="Email address (optional)"
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            hint="If provided, we'll send them a magic link via Supabase Auth. Leave blank to generate a token link only."
          />
          <div className="flex gap-3">
            <Button onClick={addClient} disabled={adding} className="flex-1">
              {adding ? 'Creating…' : email.trim() ? (
                <><Mail className="w-4 h-4" /> Send Magic Link</>
              ) : (
                <><Link className="w-4 h-4" /> Generate Token Link</>
              )}
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {clients.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <p>No clients yet. Add your first one above.</p>
          </div>
        )}
        {clients.map(client => {
          const isCopied = copiedId === client.token
          const lastSeen = client.last_accessed_at
            ? new Date(client.last_accessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Never'

          return (
            <div
              key={client.id}
              className={`bg-white/5 border rounded-2xl p-5 space-y-4 transition-all ${
                client.access_enabled ? 'border-white/10' : 'border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {client.email ? (
                      <span className="text-white font-medium text-sm">{client.email}</span>
                    ) : (
                      <span className="text-white/50 text-sm italic">No email — token only</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      client.access_enabled
                        ? client.completed_calculator
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-aqua/20 text-aqua'
                        : 'bg-white/10 text-white/60'
                    }`}>
                      {client.access_enabled
                        ? client.completed_calculator ? 'Completed' : 'Active'
                        : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-white/60">
                    <span>Opened {client.access_count} time{client.access_count !== 1 ? 's' : ''}</span>
                    <span>Last: {lastSeen}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleAccess(client.id, client.access_enabled)}
                    title={client.access_enabled ? 'Disable access' : 'Enable access'}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {client.access_enabled ? (
                      <ToggleRight className="w-6 h-6 text-aqua" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteClient(client.id)}
                    title="Delete client"
                    className="text-white/60 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5">
                <span className="text-white/60 text-xs font-mono truncate flex-1">
                  /access/{client.token}
                </span>
                <button
                  onClick={() => copyLink(client.token)}
                  className="shrink-0 text-white/60 hover:text-aqua transition-colors flex items-center gap-1 text-xs"
                >
                  {isCopied ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /><span>Copy link</span></>
                  )}
                </button>
              </div>

              {/* Download-tier control — which reports this client may download */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-white/50">Report access</span>
                <select
                  value={client.download_tier ?? 'full'}
                  onChange={e => updateTier(client.id, e.target.value as DownloadTier)}
                  className="bg-white/5 border border-white/10 rounded-lg text-white text-xs py-1.5 px-2.5 focus:outline-none focus:border-aqua/60 cursor-pointer"
                >
                  {TIER_ORDER.map(t => (
                    <option key={t} value={t} className="bg-navy">
                      {t === 'none' ? 'No downloads' : `${TIER_LABELS[t]} report`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Saved-report retrieval — only clients who finished the calculator have one */}
              {client.completed_calculator && <ClientReportDownload clientId={client.id} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
