import { ExternalLink } from "lucide-react"
import { SitePage } from "@/components/navigation/site-page"

const resources = [
  {
    name: "Pacific Crest Trail Association (PCTA)",
    description: "Official trail organization with permits, maps, and planning resources",
    href: "https://www.pcta.org",
  },
  {
    name: "Unlikely Hikers",
    description: "Diverse, anti-racist, body-liberating outdoor community",
    href: "https://www.unlikelyhikers.org",
  },
  {
    name: "Melanin Base Camp",
    description: "Increasing diversity in outdoor spaces and adventure sports",
    href: "https://www.melaninbasecamp.com",
  },
  {
    name: "Outdoor Outreach",
    description: "Connecting underserved youth with the transformative power of the outdoors",
    href: "https://www.outdooroutreach.org",
  },
  {
    name: "Venture Out Project",
    description: "LGBTQ+ wilderness adventures and community building",
    href: "https://www.venture-out.org",
  },
  {
    name: "GirlVentures",
    description: "Empowering girls and gender-expansive youth through outdoor adventure",
    href: "https://girlventures.org",
  },
  {
    name: "Halfway Anywhere",
    description: "Annual PCT hiker survey and comprehensive planning guides",
    href: "https://www.halfwayanywhere.com",
  },
]

export default function ResourcesPage() {
  return (
    <SitePage current="resources">
        <main className="pct-stagger mx-auto max-w-4xl px-6 py-12 md:py-20">
          <section className="mb-12 text-center md:mb-16">
            <h1 className="pct-display mb-4 text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              Trail <span className="text-[#ed5a43]">Resources</span>
            </h1>
            <p className="pct-display mx-auto max-w-xl text-prose font-light leading-[1.65] text-[#b4aa9b]">
              Organizations and planning tools for the PCT, with a focus on communities supporting
              women, nonbinary, LGBTQ+, and underrepresented hikers.
            </p>
          </section>

          <div className="space-y-4">
            {resources.map((resource) => (
              <a
                key={resource.href}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="pct-glass-panel group flex items-center justify-between gap-5 p-4 transition-all hover:border-[#ed5a43]/35 hover:bg-[rgba(23,21,17,0.86)]"
              >
                <div>
                  <h2 className="pct-display text-lede font-medium text-[#ede8dc] transition-colors group-hover:text-[#ed5a43]">
                    {resource.name}
                  </h2>
                  <p className="pct-display mt-1 text-nav font-light leading-[1.55] text-[#867c6e]">
                    {resource.description}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-[#8b8271] transition-colors group-hover:text-[#ed5a43]" />
              </a>
            ))}
          </div>
        </main>

        <footer className="mt-12 border-t border-[#ed5a43]/10 py-8">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="font-mono text-micro uppercase tracking-[0.14em] text-[#6b6455]">
              Offbeat: Soundscapes of the PCT · Field recordings collected 2025
            </p>
          </div>
        </footer>
    </SitePage>
  )
}
