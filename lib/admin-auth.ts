import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'super-secret-jwt-key-change-in-production')

/**
 * Returns `null` when the caller is authenticated as admin, or a 401 NextResponse
 * to return to the client when they are not.
 *
 * Usage:
 *   const unauth = await requireAdmin()
 *   if (unauth) return unauth
 *
 * NOTE: Previously this function THREW a Response object. That doesn't work in
 * Next.js 14 App Router — thrown Responses are wrapped in a generic 500 error
 * rather than used as the HTTP reply. The result was that expired admin tokens
 * caused silent 500s instead of clean 401s.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return null
  } catch {
    return NextResponse.json({ error: 'Unauthorized — admin session expired. Please log in again.' }, { status: 401 })
  }
}
