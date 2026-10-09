/**
 * iOS (Safari and Chrome — both WebKit) routes Web Audio to the Ambient
 * session, which the Ring/Silent switch mutes. HTMLAudio uses Playback.
 *
 * Safari 16.4+ exposes navigator.audioSession. It must be set to "playback"
 * *before* the AudioContext is constructed, or the context stays Ambient.
 * A dummy silent <audio> does not move Web Audio onto Playback.
 *
 * Phones start a real HTMLAudio in the pin tap so iOS stays on Playback (browser
 * audio icon). The audible loop still comes from Web Audio, so fades and
 * sample-accurate loops keep working.
 */

export type AudioSessionLike = { type: string }

function getAudioSession(): AudioSessionLike | null {
  if (typeof navigator === "undefined") return null
  return navigator.audioSession ?? null
}

/** True when this browser can put Web Audio on the media channel. */
export function hasPlaybackAudioSession(): boolean {
  return getAudioSession() !== null
}

/**
 * Route this page onto the media/playback channel. Call before `new AudioContext()`.
 * Returns the session type at the moment of the call ("playback" if it stuck).
 */
export function armMediaPlaybackSession(): string | null {
  const session = getAudioSession()
  if (!session) return null
  session.type = "playback"
  return session.type
}

export function mediaPlaybackSessionType(): string | null {
  return getAudioSession()?.type ?? null
}

/** Phones need an HTMLAudio lock so Web Audio is allowed through silent mode. */
export function shouldLockPlaybackWithHtmlAudio(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

declare global {
  interface Navigator {
    audioSession?: AudioSessionLike
  }
}
