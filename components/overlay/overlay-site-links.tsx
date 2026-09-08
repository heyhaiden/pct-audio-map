import Link from "next/link"
import { BookOpen, Info, Music, type LucideIcon } from "lucide-react"
import { OverlayActionLabel } from "@/components/overlay/overlay-shell"
import { overlaySiteNavItems, type MobileNavigationPage } from "@/lib/mobile-navigation"
import { exitDocumentFullscreen, markNavigatedFromMap } from "@/lib/map-session"

const SITE_ICONS: Record<Exclude<MobileNavigationPage, "home">, LucideIcon> = {
  library: Music,
  about: Info,
  resources: BookOpen,
}

/** Site pages on map overlays. Defaults to hamburger order without Home. */
export function OverlaySiteLinks({
  pages,
}: {
  pages?: Array<Exclude<MobileNavigationPage, "home">>
}) {
  const leaveForSitePage = () => {
    exitDocumentFullscreen()
    markNavigatedFromMap()
  }

  const items = overlaySiteNavItems().filter(
    (item) => pages === undefined || pages.includes(item.id),
  )

  return (
    <>
      {items.map((item) => {
        const Icon = SITE_ICONS[item.id]
        return (
          <Link key={item.id} href={item.href} onClick={leaveForSitePage} className="pct-link-row">
            <OverlayActionLabel icon={<Icon className="h-4 w-4" />}>
              {item.label}
            </OverlayActionLabel>
          </Link>
        )
      })}
    </>
  )
}
