import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if environment variables are set
  const username = process.env.BASIC_AUTH_USER
  const password = process.env.BASIC_AUTH_PASSWORD

  // Skip auth if environment variables are not set or if on production domain
  if (!username || !password || request.headers.get("host") === "your-production-domain.com") {
    return NextResponse.next()
  }

  // Check for basic auth
  const basicAuth = request.headers.get("authorization")

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1]
    const [user, pwd] = atob(authValue).split(":")

    if (user === username && pwd === password) {
      return NextResponse.next()
    }
  }

  // Return 401 with WWW-Authenticate header
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  })
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
