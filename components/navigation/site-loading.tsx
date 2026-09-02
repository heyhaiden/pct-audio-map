"use client"

import { SiteHeader, type SiteNavPage } from "@/components/navigation/site-header"

/** Instant header chrome while a site page's payload is still loading. */
export function SiteLoading({ current }: { current: Exclude<SiteNavPage, "map"> }) {
  return (
    <div className="site-page-root min-h-screen bg-[#151310]">
      <SiteHeader current={current} />
    </div>
  )
}
