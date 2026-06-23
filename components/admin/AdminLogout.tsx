'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { LogOut } from 'lucide-react'

export default function AdminLogout() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      <LogOut className="w-4 h-4" /> Sign out
    </Button>
  )
}
