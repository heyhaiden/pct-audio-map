"use client"

import { useId, type ReactNode } from "react"
import { ChevronDown, Github, Linkedin } from "lucide-react"
import { slideContentClass, slidePanelClass, useSlidePanel } from "@/hooks/use-slide-panel"

const socialClass =
  "pct-glass-control relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#ada396] transition-all hover:border-[#ed5a43]/35 hover:text-[#ed5a43]"

export function TeamMember({
  name,
  role,
  description,
  photoAlt,
  photoSrc,
  photoWidth,
  photoHeight,
  links,
}: {
  name: string
  role: string
  description: ReactNode
  photoAlt: string
  photoSrc: string
  photoWidth: number
  photoHeight: number
  links: Array<{ href: string; label: string; icon: "linkedin" | "github" }>
}) {
  const { open, toggle, panelRef } = useSlidePanel()
  const bioId = useId()

  const socials = (
    <div className="flex items-center gap-2">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={socialClass}
          aria-label={link.label}
        >
          {link.icon === "github" ? <Github className="h-4 w-4" /> : <Linkedin className="h-4 w-4" />}
        </a>
      ))}
    </div>
  )

  const bioClass = "pct-display text-copy font-light leading-[1.7] text-[#ada396]"
  const portraitFrame = "w-full max-w-[17.5rem] shrink-0 rounded-sm md:w-[15rem]"

  return (
    <article className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <div className={`${portraitFrame} relative aspect-[3/4] overflow-hidden`}>
        <img
          src={photoSrc}
          alt={photoAlt}
          width={photoWidth}
          height={photoHeight}
          className={
            photoWidth > photoHeight
              ? "absolute inset-0 h-full w-full object-cover object-[16%_center]"
              : "absolute inset-0 h-full w-full origin-bottom-left scale-110 object-cover"
          }
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="pct-display text-xl font-medium text-[#ede8dc]">{name}</h3>
              <p className="mt-1 font-mono text-micro uppercase tracking-[0.14em] text-[#9b8e7a]">{role}</p>
            </div>
            <ChevronDown
              aria-hidden
              className={`mt-1.5 h-5 w-5 shrink-0 text-[#8b8271] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden ${
                open ? "rotate-180 text-[#ed5a43]" : ""
              }`}
            />
          </div>
          <button
            type="button"
            className="absolute inset-0 md:hidden"
            aria-expanded={open}
            aria-controls={bioId}
            onClick={toggle}
          >
            <span className="sr-only">{open ? `Hide ${name}'s bio` : `Show ${name}'s bio`}</span>
          </button>
        </div>

        <div className="order-3 mt-3 md:order-4 md:mt-2">{socials}</div>

        <p className={`order-4 mb-4 mt-4 hidden md:order-3 md:mt-4 md:block ${bioClass}`}>{description}</p>

        <div className="order-4 md:hidden">
          <div ref={panelRef} id={bioId} aria-hidden={!open} className={slidePanelClass}>
            <p className={`${bioClass} pt-4 ${slideContentClass(open)}`}>{description}</p>
          </div>
        </div>
      </div>
    </article>
  )
}
