import { createOnRequestError } from "@posthog/next"
import { SeverityNumber } from "@opentelemetry/api-logs"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs"
import { getPostHogServer } from "./lib/posthog-server"

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
const isPostHogConfigured = Boolean(posthogKey && posthogHost)

const logExporter = isPostHogConfigured
  ? new OTLPLogExporter({
      url: `${posthogHost}/i/v1/logs`,
      headers: {
        Authorization: `Bearer ${posthogKey}`,
        "Content-Type": "application/json",
      },
    })
  : null

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    "service.name": "pct-audio-map",
    "deployment.environment": process.env.NODE_ENV ?? "development",
  }),
  processors: logExporter ? [new BatchLogRecordProcessor({ exporter: logExporter })] : [],
})

export const posthogLogger = loggerProvider.getLogger("pct-audio-map-posthog")

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const posthogServer = getPostHogServer()
  if (!posthogServer) return

  posthogLogger.emit({
    body: "PostHog log capture configured",
    severityNumber: SeverityNumber.INFO,
    attributes: { event: "posthog_log_capture_configured" },
  })
}

const posthogRequestErrorHandler =
  posthogKey && posthogHost
    ? createOnRequestError({
        apiKey: posthogKey,
        host: posthogHost,
      })
    : null

export const onRequestError = posthogRequestErrorHandler ?? (() => {})
