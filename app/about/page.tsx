import { Globe, Linkedin, Mail } from "lucide-react"
import { SitePage } from "@/components/navigation/site-page"

const team = [
  {
    initial: "H",
    title: "The Hiker",
    role: "Field recording & trail documentation",
    description:
      "Thru-hiked the PCT carrying recording equipment alongside the usual backpacking gear. With a background in environmental science and acoustic ecology, she captured the soundscapes at the heart of this project.",
  },
  {
    initial: "D",
    title: "The Developer",
    role: "Design & development",
    description:
      "Designed and built the interactive experience, transforming hours of field recordings into a scroll-driven journey. An aspiring thru-hiker, this project is a love letter to the trail.",
  },
]

export default function AboutPage() {
  return (
    <SitePage current="about">
        <main className="mx-auto max-w-4xl px-6 py-12 md:py-20">
          <section className="mb-12 text-center md:mb-16">
            <h1 className="pct-display mb-4 text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              About <span className="text-[#ed5a43]">PCT</span> Soundscapes
            </h1>
            <p className="pct-display mx-auto max-w-xl text-[13.5px] font-light leading-[1.65] text-[#b4aa9b]">
              An immersive audio journey documenting the sonic landscape of the Pacific Crest Trail,
              from the Mexican border to Canada.
            </p>
          </section>

          <section className="mb-16 md:mb-24">
            <h2 className="pct-display mb-6 flex items-center gap-3 text-xl font-medium text-[#ede8dc] md:text-2xl">
              <span className="h-px w-8 bg-[#ed5a43]/60" />
              The Project
            </h2>
            <div className="space-y-4">
              <p className="pct-display text-[13.5px] font-light leading-[1.7] text-[#b4aa9b]">
                PCT Soundscapes is an interactive audio-visual experience that invites you to explore
                the 2,650-mile Pacific Crest Trail through sound. Field recordings captured during a
                thru-hike map the acoustic diversity of the American West—from Southern California to
                Washington.
              </p>
              <p className="pct-display text-[13.5px] font-light leading-[1.7] text-[#b4aa9b]">
                Each recording holds a moment in time: wind through chaparral, birdsong at dawn,
                thunderstorms over the Cascades, and the profound silence of wilderness at night.
                These sounds tell a story photographs alone cannot convey.
              </p>
              <p className="pct-display text-[13.5px] font-light leading-[1.7] text-[#b4aa9b]">
                Our goal is to share the transformative experience of long-distance hiking while
                inspiring listeners to seek out their own connection to the outdoors.
              </p>
            </div>
          </section>

          <section className="mb-16 md:mb-24">
            <h2 className="pct-display mb-8 flex items-center gap-3 text-xl font-medium text-[#ede8dc] md:text-2xl">
              <span className="h-px w-8 bg-[#ed5a43]/60" />
              The Team
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              {team.map((member) => (
                <article key={member.title} className="pct-glass-panel p-6 md:p-8">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#ed5a43]/30 bg-[#ed5a43]/10">
                    <span className="pct-display text-2xl font-light text-[#ed5a43]">{member.initial}</span>
                  </div>
                  <h3 className="pct-display text-lg font-medium text-[#ede8dc]">{member.title}</h3>
                  <p className="mb-4 mt-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#9b8e7a]">
                    {member.role}
                  </p>
                  <p className="pct-display mb-4 text-[12.5px] font-light leading-[1.7] text-[#ada396]">
                    {member.description}
                  </p>
                  <div className="flex items-center gap-3">
                    <a
                      href="https://linkedin.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pct-glass-control flex h-8 w-8 items-center justify-center rounded-full text-[#ada396] transition-all hover:border-[#ed5a43]/35 hover:text-[#ed5a43]"
                      aria-label={`${member.title} on LinkedIn`}
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                    <a
                      href="https://example.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pct-glass-control flex h-8 w-8 items-center justify-center rounded-full text-[#ada396] transition-all hover:border-[#ed5a43]/35 hover:text-[#ed5a43]"
                      aria-label={`${member.title} website`}
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="get-involved" className="mb-16 scroll-mt-24">
            <h2 className="pct-display mb-6 flex items-center gap-3 text-xl font-medium text-[#ede8dc] md:text-2xl">
              <span className="h-px w-8 bg-[#ed5a43]/60" />
              Press & Inquiries
            </h2>
            <p className="pct-display mb-8 text-[13.5px] font-light leading-[1.65] text-[#b4aa9b]">
              For press inquiries, collaboration opportunities, or just to say hello, we&apos;d love
              to hear from you.
            </p>
            <a
              href="mailto:hello@offbeathike.com"
              className="inline-flex items-center gap-2 rounded-full bg-[#ed5a43] px-6 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#f06b57]"
            >
              <Mail className="h-4 w-4" />
              Contact Us
            </a>
          </section>
        </main>

        <footer className="mt-12 border-t border-[#ed5a43]/10 py-8">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#6b6455]">
              PCT Soundscapes · Field recordings collected 2025
            </p>
          </div>
        </footer>
    </SitePage>
  )
}
