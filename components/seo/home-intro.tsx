import Link from "next/link"
import { pctSegments } from "@/data/pct-segments"
import { SITE_DESCRIPTION } from "@/lib/site"

/**
 * Server-rendered summary of the homepage for crawlers and AI agents, which
 * don't run the JS that mounts the splash and map. Visually hidden: it says
 * the same thing the splash says a moment later, so it isn't cloaking.
 */
export function HomeIntro() {
  return (
    <div className="sr-only">
      <h1>Offbeat: Soundscapes of the PCT</h1>
      <p>{SITE_DESCRIPTION}</p>
      <p>
        An audio journey along the Pacific Crest Trail. Scroll to explore. Stop at waypoints to
        listen. Stay as long as you like. Best with headphones.
      </p>
      <h2>Chapters</h2>
      <ol>
        {pctSegments.map((segment) => (
          <li key={segment.id}>
            <h3>{segment.title}</h3>
            <p>{segment.description}</p>
          </li>
        ))}
      </ol>
      <nav aria-label="Site">
        <Link href="/library">Audio library: every field recording, by chapter</Link>
        <Link href="/about">About Offbeat and the people behind it</Link>
        <Link href="/resources">Trail resources for planning a PCT hike</Link>
      </nav>
    </div>
  )
}
