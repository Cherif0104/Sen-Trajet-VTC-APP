import { NextResponse, type NextRequest } from "next/server"
import { readSession } from "@/server/token"

export function proxy(request: NextRequest) {
  const userId = readSession(request.cookies.get("yoon_session")?.value)
  if (!userId) {
    const url = request.nextUrl.clone()
    url.pathname = "/connexion"
    url.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/app/:path*"],
}
