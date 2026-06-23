'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, Send } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

/**
 * Lead-capture form on the /request-access page.
 *
 * Captures an email + phone from blocked visitors and writes an access_requests
 * row that the admin can later convert into a real client invitation. Both fields
 * are optional individually, but at least one is required to submit.
 */
export default function RequestAccessForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!email.trim() && !phone.trim()) {
      setError('Please enter an email or phone number so we can reach you.')
      return
    }
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setState('sent')
    } catch {
      setState('error')
      setError('Something went wrong. Please try again or use the contact details above.')
    }
  }

  if (state === 'sent') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-5 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white text-sm font-semibold">You&apos;re on the list.</p>
          <p className="text-white/60 text-xs mt-0.5">
            A consultant will send your private access link shortly &mdash; then you&apos;ll finally see what it&apos;s really costing you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
      <p className="text-white text-sm text-center font-medium">See exactly what it&apos;s costing you.</p>
      <p className="text-white/50 text-xs text-center -mt-1.5">Leave your details and we&apos;ll send your private access link.</p>
      <div className="space-y-3">
        <Input
          id="ra-name"
          label="Full name"
          type="text"
          placeholder="Jane Smith"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Input
          id="ra-email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          id="ra-phone"
          label="Phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
      </div>
      {error && <p className="text-red-300 text-xs">{error}</p>}
      <Button size="lg" className="w-full" onClick={submit} disabled={state === 'sending'}>
        {state === 'sending' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
        ) : (
          <><Send className="w-4 h-4" /> Reveal My Number</>
        )}
      </Button>
    </div>
  )
}
