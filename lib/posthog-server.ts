import { PostHog } from "posthog-node"

let posthogServer: PostHog | null = null

export function getPostHogServer() {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

  if (!posthogKey || !posthogHost) {
    if (process.env.NODE_ENV !== "production") {
      const missingVariable = posthogKey
        ? "NEXT_PUBLIC_POSTHOG_HOST"
        : "NEXT_PUBLIC_POSTHOG_KEY"
      console.warn(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      )
    }
    return null
  }

  posthogServer ??= new PostHog(posthogKey, {
    host: posthogHost,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2000,
    fetchRetryCount: 0,
    enableExceptionAutocapture: process.env.NEXT_RUNTIME === "nodejs",
  })

  return posthogServer
}
