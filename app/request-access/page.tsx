import { createClient } from '@/lib/supabase/server'
import { Droplets, Phone, Mail, Calendar } from 'lucide-react'
import RequestAccessForm from '@/components/RequestAccessForm'

export const metadata = { title: 'Request Access — True Cost Revealer' }
export const dynamic = 'force-dynamic'

const ESPRING_ID = '00000000-0000-0000-0000-000000000001'

interface ConsultantInfo {
  logo_url: string | null
  consultant_name: string | null
  consultant_phone: string | null
  consultant_email: string | null
  booking_url: string | null
}

export default async function RequestAccessPage() {
  let info: ConsultantInfo = {
    logo_url: null, consultant_name: null, consultant_phone: null,
    consultant_email: null, booking_url: null,
  }
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('espring_config')
      .select('logo_url, consultant_name, consultant_phone, consultant_email, booking_url')
      .eq('id', ESPRING_ID)
      .single()
    if (data) info = data
  } catch {
    // fall back to no consultant info
  }

  const hasContact = Boolean(info.consultant_phone || info.consultant_email || info.booking_url)

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="flex items-center justify-center gap-3">
          {info.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.logo_url} alt="Logo" className="h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-aqua/20 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-aqua" />
            </div>
          )}
        </div>

        {/* Headline — short, fear + curiosity */}
        <div className="text-center space-y-4">
          <p className="text-aqua text-[11px] uppercase tracking-[0.25em] font-bold">By Invitation Only</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            How much are you <span className="text-red-400">really losing</span> to water?
          </h1>

          {/* Blurred red number — the loss you can sense but can't read */}
          <div className="py-2">
            <p
              className="text-5xl font-extrabold text-red-400 tabular-nums select-none"
              style={{ filter: 'blur(11px)' }}
              aria-hidden="true"
            >
              $27,840
            </p>
            <p className="text-xs text-white/60 mt-4">Your 10-year number &mdash; hidden until you look.</p>
          </div>

          <p className="text-white/55 text-sm">A private report reveals your exact number in 3 minutes.</p>
        </div>

        {/* Consultant contact */}
        {hasContact && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            {info.consultant_name && (
              <p className="text-white text-center text-sm">
                To request access, contact <span className="font-bold text-aqua">{info.consultant_name}</span>
              </p>
            )}
            <div className="space-y-2">
              {info.consultant_phone && (
                <a
                  href={`tel:${info.consultant_phone.replace(/[^+\d]/g, '')}`}
                  className="flex items-center gap-3 bg-aqua/10 hover:bg-aqua/20 border border-aqua/30 rounded-xl px-4 py-3 transition-all"
                >
                  <Phone className="w-4 h-4 text-aqua flex-shrink-0" />
                  <span className="text-white text-sm font-medium">{info.consultant_phone}</span>
                </a>
              )}
              {info.consultant_email && (
                <a
                  href={`mailto:${info.consultant_email}`}
                  className="flex items-center gap-3 bg-aqua/10 hover:bg-aqua/20 border border-aqua/30 rounded-xl px-4 py-3 transition-all"
                >
                  <Mail className="w-4 h-4 text-aqua flex-shrink-0" />
                  <span className="text-white text-sm font-medium">{info.consultant_email}</span>
                </a>
              )}
              {info.booking_url && (
                <a
                  href={info.booking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-aqua text-navy hover:bg-aqua/90 rounded-xl py-3 font-bold text-sm transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule a Call
                </a>
              )}
            </div>
          </div>
        )}

        {/* Lead-capture form */}
        <RequestAccessForm />
      </div>
    </div>
  )
}
