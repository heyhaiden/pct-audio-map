import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server"
import { isBotUserAgent, sendBotHttpLog } from "@/lib/bot-http-log"

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const userAgent = request.headers.get("user-agent")
  if (isBotUserAgent(userAgent)) {
    // After the response: crawlers never wait on PostHog.
    event.waitUntil(
      sendBotHttpLog({
        url: request.nextUrl,
        method: request.method,
        userAgent,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
        referrer: request.headers.get("referer"),
      }),
    )
  }
  return NextResponse.next()
}

// Pages plus robots.txt, sitemap.xml and llms.txt; skip build output and media.
export const config = {
  matcher: [
    "/((?!_next/|audio/|team/|logos/|.*\\.(?:png|jpe?g|svg|ico|webp|gif|opus|mp3|m4a|geojson|json|js|css|woff2?)$).*)",
  ],
}
