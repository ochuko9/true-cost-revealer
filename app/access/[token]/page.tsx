'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Droplets } from 'lucide-react'

export default function AccessPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [status, setStatus] = useState<'validating' | 'valid' | 'invalid'>('validating')
  const [error, setError] = useState('')

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch('/api/validate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: params.token }),
        })
        const data = await res.json()
        if (data.valid) {
          setStatus('valid')
          setTimeout(() => router.push('/calculator'), 1000)
        } else {
          setStatus('invalid')
          setError(data.reason ?? 'This link is no longer valid.')
        }
      } catch {
        setStatus('invalid')
        setError('Something went wrong. Please try again.')
      }
    }
    validate()
  }, [params.token, router])

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-aqua/20 flex items-center justify-center">
            <Droplets className="w-8 h-8 text-aqua" />
          </div>
        </div>

        {status === 'validating' && (
          <>
            <div className="w-8 h-8 border-2 border-aqua border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/70 text-lg">Verifying your access link…</p>
          </>
        )}

        {status === 'valid' && (
          <>
            <div className="w-8 h-8 border-2 border-aqua rounded-full flex items-center justify-center mx-auto">
              <span className="text-aqua text-lg">✓</span>
            </div>
            <p className="text-white text-lg font-medium">Access confirmed! Taking you in…</p>
          </>
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <div className="text-red-400 text-4xl">✕</div>
            <h2 className="text-white text-xl font-semibold">Access Unavailable</h2>
            <p className="text-white/60 max-w-sm">{error}</p>
            <p className="text-white/60 text-sm">Please contact your consultant for a new link.</p>
          </div>
        )}
      </div>
    </div>
  )
}
