import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  const isProtected = request.nextUrl.pathname.startsWith('/crm')
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/crm/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/crm/:path*', '/login'],
}
