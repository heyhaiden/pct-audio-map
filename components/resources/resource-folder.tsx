"use client"

import { ChevronDown, Compass, ExternalLink, HandHeart, Users } from "lucide-react"
import { slideContentClass, slidePanelClass, useSlidePanel } from "@/hooks/use-slide-panel"

export type ResourceLink = {
  name: string
  description: string
  href: string
}

const FOLDER_ICON = {
  compass: Compass,
  users: Users,
  handHeart: HandHeart,
} as const

function ResourceCard({ name, description, href }: ResourceLink) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pct-glass-panel group flex h-full flex-col gap-2 self-stretch p-4 transition-all hover:border-[#ed5a43]/35 hover:bg-[rgba(23,21,17,0.86)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="pct-display text-[18px] font-medium leading-[1.2] text-[#ede8dc] transition-colors group-hover:text-[#ed5a43] md:text-[20px]">
          {name}
        </h3>
        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#8b8271] transition-colors group-hover:text-[#ed5a43]" />
      </div>
      <p className="pct-display text-copy font-light leading-[1.55] text-[#867c6e]">{description}</p>
    </a>
  )
}

export function ResourceFolder({
  title,
  icon,
  resources,
  defaultOpen = false,
}: {
  title: string
  icon: keyof typeof FOLDER_ICON
  resources: ResourceLink[]
  defaultOpen?: boolean
}) {
  const { open, toggle, panelRef } = useSlidePanel(defaultOpen)
  const Icon = FOLDER_ICON[icon]

  return (
    <section>
      <div className="py-1">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full items-center gap-3 rounded-md py-3 text-left transition-colors hover:bg-white/[0.035] md:px-2 md:py-3.5"
        >
          <Icon className="h-5 w-5 flex-shrink-0 text-[#ed5a43]" />
          <h2 className="pct-display min-w-0 flex-1 text-lg font-medium text-[#ede8dc] md:text-xl">
            {title}
          </h2>
          <ChevronDown
            className={`h-5 w-5 flex-shrink-0 text-[#8b8271] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      <div aria-hidden className="border-b border-[#8b8271]/30" />

      <div
        ref={panelRef}
        aria-hidden={!open}
        className={slidePanelClass}
        style={defaultOpen ? { height: "auto" } : undefined}
      >
        <div className={slideContentClass(open)}>
          <div className="grid grid-cols-1 gap-3 pt-3 pb-4 sm:grid-cols-2 md:gap-4 md:pt-4 md:pb-6">
            {resources.map((resource) => (
              <ResourceCard key={resource.href} {...resource} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
