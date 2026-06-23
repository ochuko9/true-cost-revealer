import { redirect } from 'next/navigation'

// Root redirects to the calculator — actual entry is via /access/[token]
// Direct navigation shows the calculator (requires valid session cookie set by token validation)
export default function Home() {
  redirect('/calculator')
}
