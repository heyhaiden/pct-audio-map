export type MobileNavigationSource = "map" | "site"
export type MobileNavigationPage = "home" | "library" | "about" | "resources"

export const MOBILE_NAV_ITEMS: ReadonlyArray<{
  id: MobileNavigationPage
  href: string
  label: string
}> = [
  { id: "home", href: "/", label: "Home" },
  { id: "library", href: "/library", label: "Audio Library" },
  { id: "about", href: "/about", label: "About" },
  { id: "resources", href: "/resources", label: "Resources" },
]

const COMPACT_CHAPTER_LABELS: Record<string, string> = {
  "Southern California": "SOCAL",
  "Sierra Nevada": "SIER",
  "Northern California": "NORCA",
  Oregon: "ORE",
  Washington: "WASH",
}

export function getCompactChapterLabel(title: string): string {
  return COMPACT_CHAPTER_LABELS[title] ?? title.slice(0, 5).toUpperCase()
}
