import posthog, { type CaptureResult } from "posthog-js"

// Errors thrown by scripts that social-app webviews inject into every page,
// not by our code. Facebook's Android webview posts timing data to native
// (sendDataToNative) and throws this once the bridge object is torn down.
const INJECTED_SCRIPT_ERRORS = [/Java object is gone/i]

function dropInjectedScriptErrors(event: CaptureResult | null): CaptureResult | null {
  if (!event || event.event !== "$exception") return event
  const list = event.properties?.$exception_list as Array<{ value?: string }> | undefined
  const values = list?.map((exception) => exception.value ?? "") ?? []
  const injected = values.some((value) =>
    INJECTED_SCRIPT_ERRORS.some((pattern) => pattern.test(value)),
  )
  return injected ? null : event
}

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: "2025-05-24",
    capture_exceptions: true,
    before_send: dropInjectedScriptErrors,
    // By default the recorder/loader scripts go in before the first
    // `body > script`, which is our JSON-LD tag, and React then hydrates the
    // wrong element. Appending to <head> keeps them out of React's way.
    external_scripts_inject_target: "head",
    debug: process.env.NODE_ENV === "development",
  })
} else if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const missingVariable = posthogKey
    ? "NEXT_PUBLIC_POSTHOG_HOST"
    : "NEXT_PUBLIC_POSTHOG_KEY"

  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  )
}
