"use client"

import Link from "next/link"
import { ArrowLeft, Mail, ExternalLink, Linkedin, Globe } from "lucide-react"

// Abstract minimalist trail line SVG (same as splash)
function AbstractTrailIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 120 200" 
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M60 195 
           C45 180, 75 165, 55 150
           C35 135, 80 120, 65 105
           C50 90, 85 75, 60 60
           C35 45, 75 30, 55 15
           L58 5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        className="text-[#ff6b9d]"
      />
      <path
        d="M65 190
           C50 175, 80 162, 60 147
           C40 132, 85 117, 70 102"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        className="text-[#ff6b9d]/30"
      />
    </svg>
  )
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-stone-950 animate-in fade-in duration-500">
      {/* Background pattern */}
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50 Q25 30 50 50 T100 50' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 60 Q25 40 50 60 T100 60' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3Cpath d='M0 70 Q25 50 50 70 T100 70' fill='none' stroke='%23ff6b9d' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px'
      }} />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 bg-stone-950/80 backdrop-blur-md border-b border-stone-800/50 z-50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Home  </span>
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
          {/* Hero section */}
          <section className="text-center mb-16 md:mb-24">
            <AbstractTrailIcon className="w-12 h-20 mx-auto mb-6" />
            <h1 className="text-3xl md:text-5xl font-light text-white mb-4">
              About <span className="font-semibold text-[#ff6b9d]">PCT</span> Soundscapes
            </h1>
            <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto leading-relaxed">
              An immersive audio journey documenting the sonic landscape of the Pacific Crest Trail, 
              from the Mexican border to Canada.
            </p>
          </section>

          {/* The Project */}
          <section className="mb-16 md:mb-24">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#ff6b9d]" />
              The Project
            </h2>
            <div className="prose prose-invert prose-stone max-w-none">
              <p className="text-stone-300 leading-relaxed mb-4">
                PCT Soundscapes is an interactive audio-visual experience that invites you to explore 
                the 2,650-mile Pacific Crest Trail through sound. Using field recordings captured during 
                a thru-hike in 2025, this project maps the acoustic diversity of the American West—from 
                the arid deserts of Southern California to the temperate rainforests of Washington.
              </p>
              <p className="text-stone-300 leading-relaxed mb-4">
                Each recording captures a moment in time: the rustle of wind through chaparral, 
                birdsong at dawn in the Sierra Nevada, thunderstorms rolling over the Cascades, 
                and the profound silence of wilderness at night. These sounds tell a story that 
                photographs alone cannot convey.
              </p>
              <p className="text-stone-300 leading-relaxed">
                Our goal is to share the transformative experience of long-distance hiking with those 
                who may never set foot on the trail, while inspiring others to seek out their own 
                adventures in nature.
              </p>
            </div>
          </section>

          {/* The Team */}
          <section className="mb-16 md:mb-24">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-8 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#ff6b9d]" />
              The Team
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Hiker */}
              <div className="bg-stone-900/50 border border-stone-800/50 rounded-2xl p-6 md:p-8">
                <div className="w-16 h-16 rounded-full bg-[#ff6b9d]/10 border-2 border-[#ff6b9d]/30 flex items-center justify-center mb-4">
                  <span className="text-2xl font-light text-[#ff6b9d]">H</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">The Hiker</h3>
                <p className="text-sm text-[#ff6b9d] mb-4">Field Recording & Trail Documentation</p>
                <p className="text-stone-400 text-sm leading-relaxed mb-4">
                  Thru-hiked the PCT in 2025, carrying recording equipment alongside the usual 
                  backpacking gear. With a background in environmental science and a passion for 
                  acoustic ecology, she captured the soundscapes that form the heart of this project. 
                  Her journey covered all 2,650 miles from Campo to Manning Park over five months.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-stone-800/50 border border-stone-700/50 flex items-center justify-center text-stone-400 hover:text-[#ff6b9d] hover:border-[#ff6b9d]/30 transition-all"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                  <a
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-stone-800/50 border border-stone-700/50 flex items-center justify-center text-stone-400 hover:text-[#ff6b9d] hover:border-[#ff6b9d]/30 transition-all"
                    aria-label="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Developer */}
              <div className="bg-stone-900/50 border border-stone-800/50 rounded-2xl p-6 md:p-8">
                <div className="w-16 h-16 rounded-full bg-[#ff6b9d]/10 border-2 border-[#ff6b9d]/30 flex items-center justify-center mb-4">
                  <span className="text-2xl font-light text-[#ff6b9d]">D</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">The Developer</h3>
                <p className="text-sm text-[#ff6b9d] mb-4">Design & Development</p>
                <p className="text-stone-400 text-sm leading-relaxed mb-4">
                  Designed and built the interactive experience you're exploring now. With expertise 
                  in web development and a love for maps and data visualization, he transformed hours 
                  of field recordings into an immersive scroll-driven journey. An aspiring 
                  thru-hiker himself, this project is a love letter to the trail.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-stone-800/50 border border-stone-700/50 flex items-center justify-center text-stone-400 hover:text-[#ff6b9d] hover:border-[#ff6b9d]/30 transition-all"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                  <a
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-stone-800/50 border border-stone-700/50 flex items-center justify-center text-stone-400 hover:text-[#ff6b9d] hover:border-[#ff6b9d]/30 transition-all"
                    aria-label="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Resources */}
          <section className="mb-16 md:mb-24">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#ff6b9d]" />
              PCT Resources
            </h2>
            <p className="text-stone-400 mb-8">
              Planning your own PCT adventure? Here are some essential resources, with a focus on 
              organizations supporting women, nonbinary, and LGBTQ+ hikers.
            </p>
            
            <div className="space-y-4">
              <a 
                href="https://www.pcta.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-stone-900/50 border border-stone-800/50 rounded-xl hover:bg-stone-800/50 hover:border-[#ff6b9d]/30 transition-all group"
              >
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#ff6b9d] transition-colors">Pacific Crest Trail Association (PCTA)</h3>
                  <p className="text-sm text-stone-500">Official trail organization with permits, maps, and planning resources</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-[#ff6b9d] transition-colors" />
              </a>

              <a 
                href="https://www.unlikelyhikers.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-stone-900/50 border border-stone-800/50 rounded-xl hover:bg-stone-800/50 hover:border-[#ff6b9d]/30 transition-all group"
              >
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#ff6b9d] transition-colors">Unlikely Hikers</h3>
                  <p className="text-sm text-stone-500">Diverse, anti-racist, body-liberating outdoor community</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-[#ff6b9d] transition-colors" />
              </a>

              <a 
                href="https://www.melaninbasecamp.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-stone-900/50 border border-stone-800/50 rounded-xl hover:bg-stone-800/50 hover:border-[#ff6b9d]/30 transition-all group"
              >
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#ff6b9d] transition-colors">Melanin Base Camp</h3>
                  <p className="text-sm text-stone-500">Increasing diversity in outdoor spaces and adventure sports</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-[#ff6b9d] transition-colors" />
              </a>

              <a 
                href="https://www.outdooroutreach.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-stone-900/50 border border-stone-800/50 rounded-xl hover:bg-stone-800/50 hover:border-[#ff6b9d]/30 transition-all group"
              >
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#ff6b9d] transition-colors">Outdoor Outreach</h3>
                  <p className="text-sm text-stone-500">Connecting underserved youth with the transformative power of the outdoors</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-[#ff6b9d] transition-colors" />
              </a>

              <a 
                href="https://www.venture-out.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-stone-900/50 border border-stone-800/50 rounded-xl hover:bg-stone-800/50 hover:border-[#ff6b9d]/30 transition-all group"
              >
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#ff6b9d] transition-colors">Venture Out Project</h3>
                  <p className="text-sm text-stone-500">LGBTQ+ wilderness adventures and community building</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-[#ff6b9d] transition-colors" />
              </a>

              <a 
                href="https://girlventures.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-stone-900/50 border border-stone-800/50 rounded-xl hover:bg-stone-800/50 hover:border-[#ff6b9d]/30 transition-all group"
              >
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#ff6b9d] transition-colors">GirlVentures</h3>
                  <p className="text-sm text-stone-500">Empowering girls and gender-expansive youth through outdoor adventure</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-[#ff6b9d] transition-colors" />
              </a>

              <a 
                href="https://www.halfwayanywhere.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-stone-900/50 border border-stone-800/50 rounded-xl hover:bg-stone-800/50 hover:border-[#ff6b9d]/30 transition-all group"
              >
                <div>
                  <h3 className="text-white font-medium group-hover:text-[#ff6b9d] transition-colors">Halfway Anywhere</h3>
                  <p className="text-sm text-stone-500">Annual PCT hiker survey and comprehensive planning guides</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-[#ff6b9d] transition-colors" />
              </a>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-16">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-6 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[#ff6b9d]" />
              Press & Inquiries
            </h2>
            <p className="text-stone-400 mb-8">
              For press inquiries, collaboration opportunities, or just to say hello, 
              we'd love to hear from you.
            </p>
            
            <a
              href="mailto:hello@pctsoundscapes.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff6b9d] hover:bg-[#ff85ad] text-white font-medium rounded-full transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Us
            </a>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-stone-800/50 py-8">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-xs text-stone-600">
              PCT Soundscapes - Field recordings collected 2025
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
