/** About two lines of library copy on a phone. */
export const LIBRARY_NOTE_PREVIEW_CHARS = 120

export function previewDescription(
  text: string,
  limit = LIBRARY_NOTE_PREVIEW_CHARS,
): { preview: string; truncated: boolean } {
  const trimmed = text.trim()
  if (trimmed.length <= limit) return { preview: trimmed, truncated: false }

  const slice = trimmed.slice(0, limit)
  const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\n"))
  const cut = breakAt > limit * 0.5 ? slice.slice(0, breakAt) : slice
  return { preview: `${cut.trimEnd()}\u2026`, truncated: true }
}

/** Collapsed library note. Ellipsis marks leftover copy, or homelands waiting behind the tap. */
export function collapsedLibraryNote(
  description: string,
  options?: { revealMore?: boolean; limit?: number },
): string {
  const { preview, truncated } = previewDescription(description, options?.limit)
  if (truncated || !preview) return preview
  if (options?.revealMore) return `${preview}\u2026`
  return preview
}

export function libraryNoteNeedsExpand(
  marker: { description?: string; lands?: readonly unknown[] },
  limit = LIBRARY_NOTE_PREVIEW_CHARS,
): boolean {
  if (marker.lands?.length) return true
  const description = marker.description?.trim() ?? ""
  return description.length > 0 && previewDescription(description, limit).truncated
}
