import { ResourceFolder, type ResourceLink } from "@/components/resources/resource-folder"
import { SitePage } from "@/components/navigation/site-page"

const folders: Array<{
  id: string
  title: string
  icon: "compass" | "users" | "handHeart"
  defaultOpen?: boolean
  resources: ResourceLink[]
}> = [
  {
    id: "plan",
    title: "Plan the hike",
    icon: "compass",
    defaultOpen: true,
    resources: [
      {
        name: "Pacific Crest Trail Association",
        description: "Official PCT organization with maps, permits, and planning resources",
        href: "https://www.pcta.org/",
      },
      {
        name: "Halfway Anywhere",
        description: "Annual PCT hiker survey and comprehensive planning guides",
        href: "https://www.halfwayanywhere.com/",
      },
      {
        name: "The Trek",
        description: "Thru-hiker blogs, gear lists, and planning guides",
        href: "https://thetrek.co/",
      },
      {
        name: "FarOut",
        description: "Most popular navigation app for thru-hikers",
        href: "https://faroutguides.com/",
      },
    ],
  },
  {
    id: "community",
    title: "Go with community",
    icon: "users",
    resources: [
      {
        name: "LGBTQ Outdoors",
        description:
          "National nonprofit with local chapters in 23+ states, running queer-affirming hikes, camping trips, and its annual Outdoorfest",
        href: "https://www.lgbtqoutdoors.com/",
      },
      {
        name: "The Venture Out Project",
        description: "Backpacking and wilderness trips for queer and trans folks",
        href: "https://www.ventureoutproject.com/",
      },
      {
        name: "Rare Earth Adventures",
        description: "Guided backpacking trips for women and LGBTQ folks on and around the PCT",
        href: "https://rareearthadventures.com/tour/lgbtq-pct-backpacking/",
      },
      {
        name: "GirlVentures",
        description: "Outdoor programs for girls and gender expansive youth in the Bay Area",
        href: "https://www.girlventures.org/",
      },
      {
        name: "Disabled Hikers",
        description: "Disabled-led nonprofit offering resources, group hikes, and trail guides",
        href: "https://www.disabledhikers.com/",
      },
    ],
  },
  {
    id: "stewardship",
    title: "Representation & stewardship",
    icon: "handHeart",
    resources: [
      {
        name: "Wild Diversity",
        description:
          "Portland-based nonprofit offering backpacking trips, camping, and outdoor education for BIPOC and LGBTQ2S+ communities",
        href: "https://wilddiversity.com/",
      },
      {
        name: "Melanin Base Camp",
        description:
          "Blog, book, and community featuring Black, Latinx, Asian, Indigenous, and queer people of color who love the outdoors",
        href: "https://www.melaninbasecamp.com/",
      },
      {
        name: "Native Women's Wilderness",
        description:
          "Nonprofit raising the voices of Native women in the outdoors through community, storytelling, and education about ancestral lands",
        href: "https://www.nativewomenswilderness.org/",
      },
      {
        name: "Eastern Sierra Conservation Corps",
        description: "Queer and BIPOC founded trail conservation nonprofit",
        href: "https://www.easternsierracc.org/",
      },
    ],
  },
]

export default function ResourcesPage() {
  return (
    <SitePage current="resources">
        <main className="pct-stagger mx-auto max-w-4xl px-6 py-12 md:py-20">
          <section className="mb-12 text-center md:mb-16">
            <h1 className="pct-display mb-4 text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              Trail <span className="pct-wordmark font-wordmark uppercase text-[#ed5a43]">Resources</span>
            </h1>
            <p className="pct-display mx-auto max-w-xl text-prose font-light leading-[1.65] text-[#b4aa9b]">
              Organizations and planning tools for the PCT, with a focus on communities supporting
              women, nonbinary, LGBTQ+, and underrepresented hikers.
            </p>
          </section>

          <div className="space-y-2">
            {folders.map((folder) => (
              <ResourceFolder
                key={folder.id}
                title={folder.title}
                icon={folder.icon}
                resources={folder.resources}
                defaultOpen={folder.defaultOpen}
              />
            ))}
          </div>

          <section id="land-acknowledgement" className="mt-16 scroll-mt-24 md:mt-24">
            <h2 className="pct-display mb-6 flex items-center gap-3 text-xl font-medium text-[#ede8dc] md:text-2xl">
              <span className="h-px w-8 shrink-0 bg-[#ed5a43]/60" />
              Land Acknowledgement
            </h2>
            <div className="space-y-4 text-prose font-light leading-[1.7] text-[#b4aa9b]">
              <p className="pct-display">
                I spent four and a half months walking the Pacific Crest Trail: listening, living with
                the land and waters, and crossing through the homelands of dozens of Indigenous nations,
                many of whom still live alongside it today.
              </p>
              <p className="pct-display">
                I’m still learning the name of every nation whose land I walked through. If you’d like
                to learn whose land you’re listening to,{" "}
                <a
                  href="https://native-land.ca/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#ed5a43] hover:text-[#f06b57]"
                >
                  native-land.ca
                </a>{" "}
                is a good place to start.
              </p>
              <p className="pct-display">
                My commitment to this land is to continue to uphold Leave No Trace principles, vote for
                leaders who will protect these lands and waters, and, through this project, return
                something to the place that held me.
              </p>
            </div>
          </section>
        </main>

        <footer className="mt-12 border-t border-[#ed5a43]/10 py-8">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="font-mono text-micro uppercase tracking-[0.14em] text-[#6b6455]">
              Offbeat: Soundscapes of the PCT
            </p>
          </div>
        </footer>
    </SitePage>
  )
}
