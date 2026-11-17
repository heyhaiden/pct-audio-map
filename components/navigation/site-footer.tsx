import Image from "next/image"
import Link from "next/link"
import { Instagram, Mail } from "lucide-react"
import { CONTACT_EMAIL, INSTAGRAM_HANDLE, INSTAGRAM_URL, SITE_NAME } from "@/lib/site"

// Home is left to the header's mountain mark: going home has to reset the map
// session (see lib/home-exit.ts), which a plain link here would skip.
const FOOTER_LINKS = [
  { href: "/library", label: "Audio library" },
  { href: "/about", label: "About" },
  { href: "/resources", label: "Resources" },
]

const socialClass =
  "group inline-flex items-center gap-3 rounded-full border border-[#ed5a43]/25 bg-[#ed5a43]/[0.06] py-2.5 pl-3 pr-5 transition-colors hover:border-[#ed5a43]/60 hover:bg-[#ed5a43]/[0.12] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

const creditClass =
  "flex items-center gap-3 opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

/** Shared footer for About, Library and Resources: socials first, then credits. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[#ed5a43]/10">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 px-6 py-12 text-center md:py-14">
        <section aria-labelledby="footer-follow" className="flex flex-col items-center gap-5">
          <h2
            id="footer-follow"
            className="font-mono text-micro uppercase tracking-[0.18em] text-[#9b8e7a]"
          >
            Follow along
          </h2>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={socialClass}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ed5a43] text-white">
                <Instagram className="h-4 w-4" />
              </span>
              <span className="font-mono text-nav tracking-[0.06em] text-[#ede8dc] group-hover:text-white">
                @{INSTAGRAM_HANDLE}
              </span>
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className={socialClass}>
              <span className="grid h-8 w-8 place-items-center rounded-full border border-[#ed5a43]/40 text-[#ed5a43]">
                <Mail className="h-4 w-4" />
              </span>
              <span className="font-mono text-nav tracking-[0.06em] text-[#ede8dc] group-hover:text-white">
                {CONTACT_EMAIL}
              </span>
            </a>
          </div>
        </section>

        <section aria-labelledby="footer-credits" className="flex flex-col items-center gap-5">
          <h2
            id="footer-credits"
            className="font-mono text-micro uppercase tracking-[0.18em] text-[#9b8e7a]"
          >
            Made with
          </h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-12">
            <a href="https://www.mapbox.com" target="_blank" rel="noopener noreferrer" className={creditClass}>
              <span className="font-mono text-micro uppercase tracking-[0.14em] text-[#9b8e7a]">Maps by</span>
              <Image src="/logos/mapbox.svg" alt="Mapbox" width={108} height={24} className="h-6 w-auto" />
            </a>
            <a href="https://native-land.ca" target="_blank" rel="noopener noreferrer" className={creditClass}>
              <span className="font-mono text-micro uppercase tracking-[0.14em] text-[#9b8e7a]">Homelands from</span>
              <Image src="/logos/native-land.svg" alt="" width={22} height={30} className="h-7 w-auto" />
              <span className="pct-display text-base text-[#ede8dc]">Native Land Digital</span>
            </a>
          </div>
        </section>

        <div className="flex w-full flex-col items-center gap-4 border-t border-white/[0.06] pt-8">
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className="font-mono text-micro uppercase tracking-[0.14em] text-[#8b8271] transition-colors hover:text-[#ede8dc]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="font-mono text-micro uppercase tracking-[0.14em] text-[#6b6455]">{SITE_NAME}</p>
        </div>
      </div>
    </footer>
  )
}
