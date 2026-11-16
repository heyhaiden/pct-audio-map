import { pctSegments } from "@/data/pct-segments"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

// Plain-text site summary for AI agents (https://llmstxt.org). Built from the
// same constants as the metadata so the two can't drift apart.
export const dynamic = "force-static"

export function GET() {
  const chapters = pctSegments
    .map((segment) => `- ${segment.title}: ${segment.description}`)
    .join("\n")

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Offbeat is a meditative, choose-your-own-adventure audio experience built from field recordings made during a thru-hike of the Pacific Crest Trail (PCT), the 2,650-mile footpath from the US-Mexico border to Canada through California, Oregon, and Washington. Visitors scroll a 3D terrain map along the trail and stop at waypoints to hear what that place sounded like. It was made by Anna Wozniewicz and Haiden McGill.

The project exists to make the outdoors more accessible to people who can't hike it, to offer a quiet space away from noise pollution, and to keep a sonic archive of the trail for the future.

## Pages

- [Interactive trail map](${SITE_URL}/): Scroll from Mexico to Canada on a 3D map and listen at waypoints. Needs JavaScript and is best with headphones.
- [Audio library](${SITE_URL}/library): Every field recording from the trail, organized by trail section from the Mexican border northward.
- [About](${SITE_URL}/about): Why the project exists, what "offbeat" means, and the people who made it.
- [Trail resources](${SITE_URL}/resources): Planning tools and organizations for the PCT, focused on communities supporting women, nonbinary, LGBTQ+, and underrepresented hikers, plus a land acknowledgement.

## Trail chapters

${chapters}
`

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
