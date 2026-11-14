// Loaded lazily by instrumentation-client.ts after the page is idle, so the
// Session Replay recorder ships in its own chunk instead of the first-load bundle.
import { addIntegration, replayIntegration } from '@sentry/nextjs'

export function startSentryReplay() {
  addIntegration(replayIntegration({ maskAllText: true, blockAllMedia: true }))
}
