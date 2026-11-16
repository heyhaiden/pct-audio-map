/**
 * Crawlers and AI agents don't run JavaScript, so posthog-js never sees them.
 * For bot user agents, proxy.ts forwards the request to PostHog as a
 * `$http_log` event, which feeds Web Analytics → Bots.
 * https://posthog.com/docs/web-analytics/sending-http-logs
 *
 * Human traffic is skipped on purpose: posthog-js already records it.
 */

// AI agents first (training crawlers, search indexers, and live "-User"
// fetches made while answering someone), then the generic bot words that
// cover search engines, link previews, and SEO tools.
const BOT_USER_AGENT = new RegExp(
  [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "Claude-User",
    "Claude-SearchBot",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "GoogleOther",
    "Gemini",
    "Applebot",
    "Amazonbot",
    "meta-externalagent",
    "meta-externalfetcher",
    "facebookexternalhit",
    "Bytespider",
    "CCBot",
    "cohere-ai",
    "MistralAI-User",
    "DuckAssistBot",
    "YouBot",
    "Diffbot",
    // "Googlebot/2.1", "bingbot/2.0"; not phone models like "CUBOT X30".
    "bot/",
    "\\bbot\\b",
    "crawler",
    "spider",
    "slurp",
  ].join("|"),
  "i",
)

export function isBotUserAgent(userAgent: string | null): userAgent is string {
  return Boolean(userAgent && BOT_USER_AGENT.test(userAgent))
}

/** Stable per-client ID (IP + host + UA), as PostHog's docs recommend. */
async function clientId(ip: string, host: string, userAgent: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${ip}|${host}|${userAgent}`)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
  return `http_log_${hex.slice(0, 40)}`
}

export type BotRequest = {
  url: URL
  method: string
  userAgent: string
  ip: string
  referrer: string | null
}

/** Sends one `$http_log` event. Never throws: logging must not break a page. */
export async function sendBotHttpLog(request: BotRequest): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!apiKey || !apiHost) return

  try {
    const { url } = request
    await fetch(`${apiHost.replace(/\/$/, "")}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event: "$http_log",
        distinct_id: await clientId(request.ip, url.host, request.userAgent),
        timestamp: new Date().toISOString(),
        properties: {
          $process_person_profile: false,
          $current_url: url.href,
          $host: url.host,
          $pathname: url.pathname,
          $ip: request.ip,
          $raw_user_agent: request.userAgent,
          $referrer: request.referrer ?? undefined,
          method: request.method,
        },
      }),
    })
  } catch {
    // Dropped log line; nothing to do.
  }
}
