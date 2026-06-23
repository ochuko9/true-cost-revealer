import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'changeme'
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'super-secret-jwt-key-change-in-production')

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(JWT_SECRET)

  const cookieStore = cookies()
  cookieStore.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = cookies()
  cookieStore.delete('admin_token')
  return NextResponse.json({ success: true })
}

export async function GET() {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return NextResponse.json({ authenticated: false })

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
