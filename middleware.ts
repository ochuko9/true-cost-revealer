import { NextRequest, NextResponse } from 'next/server'

/**
 * Invite-only gate.
 *
 * The calculator and its results are accessible ONLY to clients who arrived
 * through a valid invitation link (/access/[token]), which sets the httpOnly
 * `tcr_token` cookie after a successful token validation.
 *
 * Anyone hitting /calculator or /calculator/results without that cookie is
 * redirected to /request-access. This is a presence check — the cookie is set
 * exclusively by the server after validation and carries the client's secret
 * token, so possessing it is sufficient proof of an invitation. Fine-grained
 * revocation (disabled / expired clients) is enforced downstream in the results
 * server component, which already does a DB lookup.
 */
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get('tcr_token')?.value)
  if (!hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/request-access'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Match the calculator landing and every sub-path (incl. /calculator/results).
  matcher: ['/calculator', '/calculator/:path*'],
}
