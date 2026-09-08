export type MobileNavigationSource = "map" | "site"
export type MobileNavigationPage = "home" | "library" | "about" | "resources"

export const MOBILE_NAV_ITEMS: ReadonlyArray<{
  id: MobileNavigationPage
  href: string
  label: string
}> = [
  { id: "home", href: "/", label: "Home" },
  { id: "library", href: "/library", label: "Audio library" },
  { id: "about", href: "/about", label: "About" },
  { id: "resources", href: "/resources", label: "Resources" },
]

/** Home stays on the map menu. On site pages it drops only while you're already there. */
export function visibleMobileNavItems(
  source: MobileNavigationSource,
  current?: MobileNavigationPage,
) {
  return MOBILE_NAV_ITEMS.filter(
    (item) => source === "map" || !(item.id === "home" && current === "home"),
  )
}

const COMPACT_CHAPTER_LABELS: Record<string, string> = {
  "Southern California": "SOCAL",
  "Sierra Nevada": "SIERRA",
  "Northern California": "NORCAL",
  Oregon: "OREGON",
  Washington: "WASH",
}

export function getCompactChapterLabel(title: string): string {
  return COMPACT_CHAPTER_LABELS[title] ?? title.slice(0, 5).toUpperCase()
}
