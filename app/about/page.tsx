import { Github, Linkedin, Mail } from "lucide-react"
import { FieldNotesCard } from "@/components/about/field-notes-card"
import { InfoTip } from "@/components/about/info-tip"
import { WhyDrawer } from "@/components/about/why-drawer"
import { SitePage } from "@/components/navigation/site-page"

const projectCopy = [
  "Offbeat is a choose-your-own-adventure meditative experience, capturing one hiker's journey along the Pacific Crest Trail.",
  "Many people describe hiking the Pacific Crest Trail as a feat of mental or physical strength and endurance. For many, there is also a profound mental shift after stepping away from bustling cities, traffic, or work obligations. Over time, this transformation means embracing the quiet of natural spaces; appreciating everyday simplicity; and spending time in the deeply meditative state that comes from moving through the world in one of humanity's slowest, most primal ways: walking.",
]

const definitions = [
  "unconventional, quirky, unusual",
  "in music: the weak, unaccented beats that fall between the main, accented beats.",
  "how the world sounds when you're off the beaten path",
]

const whys = [
  {
    title: "Make thru hiking and the outdoors more accessible",
    body: "For those who don't have the immense privilege to take half a year away from their regular lives, or don't have the physical ability to hike, or feel that they don't belong outdoors \u2013 this project exists to remind them that the outdoors are for everyone, and to make it a little easier to get out there, even if only in spirit.",
  },
  {
    title: "Create a meditative space to slow down and pause",
    body: "During my hike, I'd ask people I'm hiking with to sit quietly for a few minutes while I record. Skeptical at first, afterwards they'd say something like, \u201cWow, that was such a nice, meditative moment. I really needed that.\u201d This project exists to create more of those moments \u2013 anytime, anywhere.",
  },
  {
    title: "Fight back against noise pollution",
    body: "The modern world's not-so-silent killer. When was the last time you stepped outside of your house without hearing a plane, a car, or a leaf blower? Long-term exposure to noise pollution is deadly, but for most city-dwellers, it takes some effort to venture far enough in the wilderness to escape the noise. This project exists to bring those quiet, uninterrupted spaces a little closer, especially when they feel far away.",
  },
  {
    title: "Spread an appreciation for audio",
    body: "Sound is a medium that captures feelings and evokes the emotions of a particular time or place, transporting you into another world in a way that images alone cannot. This project exists to share the creators' love for sonically-driven experiences and all things auditory.",
  },
  {
    title: "Create a lasting digital archive",
    body: "Climate change, conservation policy, inconsistent funding \u2013 these are only a few of the reasons the PCT may not continue to exist in the same form that it does today. This project exists to preserve the PCT's sonic landscapes for future generations, and to create a digital archive in a medium that is less frequently documented than its visual counterpart.",
  },
  {
    title: "Stay connected",
    body: "The PCT has one of the most generous, trusting, kind-hearted communities I've ever experienced. Through this project, I hope to stay connected not just to the trail and the profound impact it had on me, but to the community that surrounds it. If you have your own sounds from the backcountry, a story to share, or just want to chat, I'd love to get in touch.",
  },
]

const socialClass =
  "pct-glass-control inline-flex h-8 w-8 items-center justify-center rounded-full text-[#ada396] transition-all hover:border-[#ed5a43]/35 hover:text-[#ed5a43]"

const team = [
  {
    name: "Anna Wozniewicz",
    role: "Field recording & experience design",
    description:
      "As a queer woman and avid hiker, skier, and (more recently, due to my PCT-ending injury) biker, I don’t often see myself represented in the spaces I love most. I want everyone to feel empowered to get out there and participate in the incredible gift that is nature, and I hope this project will inspire others to take a walk – whether it’s 1, 10, or 1000 miles – and to pause long enough to hear that nature is never truly silent. The outdoors are for everyone, and for anyone who doesn’t have the privilege of doing a thru hike, or isn’t able to enjoy the PCT for themselves: I hope that I can bring the feeling of it to wherever in the world you are. Thank you for being part of my journey.",
    photoAlt: "Portrait of Anna Wozniewicz on trail",
    links: [
      {
        href: "https://www.linkedin.com/in/annawozniewicz",
        label: "Anna Wozniewicz on LinkedIn",
        icon: "linkedin" as const,
      },
    ],
  },
  {
    name: "Haiden McGill",
    role: "Design & development",
    description:
      "Designed and built the interactive experience, transforming hours of field recordings into a scroll-driven journey. Anna and I started our queer backpacking troop during COVID and have hiked Patagonia, Catalina, the High Sierras, and Norway since. An aspiring thru-hiker, this project is a love letter to those who walked these paths before us, and to the stewards who cared for this land long before we arrived.",    
    photoAlt: "Portrait of Haiden McGill on trail",
    links: [
      {
        href: "https://www.linkedin.com/in/haidenmcgill",
        label: "Haiden McGill on LinkedIn",
        icon: "linkedin" as const,
      },
      {
        href: "https://github.com/heyhaiden",
        label: "Haiden McGill on GitHub",
        icon: "github" as const,
      },
    ],
  },
]

function SocialIcon({ icon }: { icon: "linkedin" | "github" }) {
  if (icon === "github") return <Github className="h-4 w-4" />
  return <Linkedin className="h-4 w-4" />
}

function SectionHeading({ children, info }: { children: string; info?: string }) {
  return (
    <h2 className="pct-display relative mb-6 flex items-center gap-3 text-xl font-medium text-[#ede8dc] md:text-2xl">
      <span className="h-px w-8 shrink-0 bg-[#ed5a43]/60" />
      <span className="inline-flex items-center gap-1">
        {children}
        {info ? <InfoTip text={info} /> : null}
      </span>
    </h2>
  )
}

export default function AboutPage() {
  return (
    <SitePage current="about">
        <main className="pct-stagger mx-auto max-w-4xl px-6 py-12 md:py-20">
          <section className="text-left">
            <h1 className="pct-display mb-8 text-center text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              About <span className="pct-wordmark font-wordmark uppercase text-[#ed5a43]">Offbeat</span>
            </h1>
            <FieldNotesCard definitions={definitions}>
              <div className="mx-auto max-w-xl space-y-4 text-left">
                {projectCopy.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="pct-display text-prose font-light leading-[1.7] text-[#b4aa9b]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </FieldNotesCard>
          </section>

          <section className="mt-8 mb-16 md:mt-10 md:mb-24">
            <SectionHeading
              info="On trail, many hikers had their Why’s, or reminders of why they were out there doing a thru hike at all. The Why’s served as their North Star, lighting the path when the going got rough and reminding them not to give up. Below are this project’s Why’s."
            >
              Our Why&apos;s
            </SectionHeading>
            <div className="border-t border-[#ed5a43]/12">
              {whys.map((why, index) => (
                <WhyDrawer key={why.title} index={index} title={why.title} body={why.body} />
              ))}
            </div>
          </section>

          <section className="mb-16 md:mb-24">
            <SectionHeading>Who we are</SectionHeading>
            <div className="space-y-10 md:space-y-14">
              {team.map((member) => (
                <article
                  key={member.name}
                  className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8"
                >
                  <div
                    className="aspect-[4/5] w-full max-w-[280px] shrink-0 rounded-sm bg-[#2a261f] md:w-[240px]"
                    role="img"
                    aria-label={member.photoAlt}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="pct-display text-xl font-medium text-[#ede8dc]">{member.name}</h3>
                    <p className="mb-4 mt-1 font-mono text-micro uppercase tracking-[0.14em] text-[#9b8e7a]">
                      {member.role}
                    </p>
                    <p className="pct-display mb-4 text-copy font-light leading-[1.7] text-[#ada396]">
                      {member.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {member.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={socialClass}
                          aria-label={link.label}
                        >
                          <SocialIcon icon={link.icon} />
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="get-in-touch" className="mb-16 scroll-mt-24">
            <SectionHeading>Get in touch</SectionHeading>
            <p className="pct-display mb-8 max-w-xl text-prose font-light leading-[1.65] text-[#b4aa9b]">
              Hear something you like? Have your own story or sounds to share? Just want to say hi? We&apos;d love to hear from you.
              <br />
              <br />
              You can reach us at <a href="mailto:hello@offbeathike.com" className="text-[#ed5a43] hover:text-[#f06b57]">hello@offbeathike.com</a>.
            </p>
            <a
              href="mailto:hello@offbeathike.com"
              className="inline-flex items-center gap-2 rounded-full bg-[#ed5a43] px-6 py-3 font-mono text-micro uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#f06b57]"
            >
              <Mail className="h-4 w-4" />
              Contact us
            </a>
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
