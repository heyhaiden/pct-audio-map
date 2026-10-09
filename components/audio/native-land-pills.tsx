import { nativeLandHref, visibleHomelands } from "@/lib/native-land-href"

const chipClass =
  "inline-block max-w-full rounded-full border border-[#ede8dc]/15 bg-[#ede8dc]/10 px-3 py-1 font-mono text-label leading-snug text-[#d4cbb8] transition-colors hover:border-[#ed5a43]/45 hover:text-[#ede8dc] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ed5a43]"

export function NativeLandPills({
  lands,
  className,
}: {
  lands?: { name: string; slug: string }[]
  className?: string
}) {
  if (!lands?.length) return null

  const shown = visibleHomelands(lands)

  return (
    <div className={className}>
      <p className="font-mono text-micro uppercase tracking-[0.18em] text-[#8b8271]">Homelands</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((land) => (
          <li key={land.slug} className="max-w-full">
            <a
              href={nativeLandHref(land.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className={chipClass}
            >
              {land.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
