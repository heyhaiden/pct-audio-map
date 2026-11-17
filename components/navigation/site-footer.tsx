import Image from "next/image"
import { Instagram, Mail } from "lucide-react"
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site"

const labelClass = "font-mono text-micro uppercase tracking-[0.14em] text-[#9b8e7a]"

const creditClass =
  "flex shrink-0 items-center gap-2 opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

const socialClass =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ed5a43]/30 text-[#ed5a43] transition-colors hover:border-[#ed5a43] hover:bg-[#ed5a43] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

/** Shared footer for About, Library and Resources, on one line: credits left, socials right. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[#ed5a43]/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-[18px] py-6 md:px-[28px]">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <span className={labelClass}>Built with</span>
          <a
            href="https://www.mapbox.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Mapbox"
            className={creditClass}
          >
            <Image src="/logos/mapbox.svg" alt="Mapbox" width={90} height={20} className="h-5 w-auto" />
          </a>
          <a
            href="https://native-land.ca"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Native Land Digital"
            className={creditClass}
          >
            <Image src="/logos/native-land.svg" alt="" width={18} height={25} className="h-6 w-auto" />
            <span className="pct-display hidden text-sm text-[#ede8dc] sm:inline">Native Land Digital</span>
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className={`${labelClass} hidden sm:inline`}>Follow along</span>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Offbeat on Instagram, @${INSTAGRAM_HANDLE}`}
            className={socialClass}
          >
            <Instagram className="h-4 w-4" />
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} aria-label={`Email ${CONTACT_EMAIL}`} className={socialClass}>
            <Mail className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  )
}
