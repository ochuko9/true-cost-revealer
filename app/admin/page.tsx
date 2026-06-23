import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { jwtVerify } from 'jose'
import ClientManager from '@/components/admin/ClientManager'
import AccessRequestsManager from '@/components/admin/AccessRequestsManager'
import ConfigEditor from '@/components/admin/ConfigEditor'
import AdminLogout from '@/components/admin/AdminLogout'
import { Droplets } from 'lucide-react'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'super-secret-jwt-key-change-in-production')

async function checkAdminAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return false
  try {
    await jwtVerify(token, JWT_SECRET)
    return true
  } catch {
    return false
  }
}

export const metadata = { title: 'Admin — True Cost Revealer' }

export default async function AdminPage() {
  const authed = await checkAdminAuth()
  if (!authed) redirect('/admin/login')

  return (
    <div className="min-h-screen bg-navy">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-aqua/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-aqua" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">Admin Panel</h1>
            <p className="text-white/60 text-xs">True Cost Revealer</p>
          </div>
        </div>
        <AdminLogout />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-16">
        <ClientManager />
        <div className="h-px bg-white/10" />
        <AccessRequestsManager />
        <div className="h-px bg-white/10" />
        <ConfigEditor />
      </div>
    </div>
  )
}
