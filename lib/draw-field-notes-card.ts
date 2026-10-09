export const FIELD_NOTES_PRONUNCIATION = "/ˈôfˌbēt/"

/** Phone shows the card at ~half the design width, so type has to run larger. */
export const MOBILE_FIELD_NOTES_TYPE_SCALE = 1.6

const PAPER = "#efe4cc"
const INK = "#2a241c"
const MUTED = "#7a6a56"
const BODY = "#4a4238"
const NUMBER = "#9a7b5a"
const RULE = "rgba(90, 70, 40, 0.14)"
const MARGIN = "rgba(196, 72, 54, 0.42)"
const ACCENT = "#ed5a43"
const KICKER = "#8a6f4e"

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number,
) {
  let cursor = x
  for (const char of text) {
    ctx.fillText(char, cursor, y)
    cursor += ctx.measureText(char).width + tracking
  }
}

export function drawFieldNotesCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  definitions: readonly string[],
  fonts: { serif: string; mono: string },
  options: { typeScale?: number } = {},
) {
  const typeScale = options.typeScale ?? 1
  const s = width / 576
  const t = s * typeScale
  const padL = 48 * s
  const padR = 32 * s
  const padT = (typeScale > 1 ? 16 : 24) * s
  const ruleEvery = 28 * s
  const marginX = 37.6 * s
  const contentW = width - padL - padR
  const lineHeight = 15 * t * (typeScale > 1 ? 1.5 : 1.65)

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = RULE
  ctx.lineWidth = Math.max(1, s * 0.6)
  for (let y = ruleEvery; y < height; y += ruleEvery) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.strokeStyle = MARGIN
  ctx.lineWidth = Math.max(1.25, s * 0.85)
  ctx.beginPath()
  ctx.moveTo(marginX, 0)
  ctx.lineTo(marginX, height)
  ctx.stroke()

  ctx.fillStyle = "rgba(90, 68, 42, 0.28)"
  ctx.fillRect(0, 0, width, Math.max(1, s * 0.7))
  ctx.fillRect(0, height - Math.max(1, s * 0.7), width, Math.max(1, s * 0.7))
  ctx.fillRect(0, 0, Math.max(1, s * 0.7), height)
  ctx.fillRect(width - Math.max(1, s * 0.7), 0, Math.max(1, s * 0.7), height)

  ctx.textBaseline = "top"
  let y = padT

  ctx.fillStyle = KICKER
  ctx.font = `400 ${10 * t}px ${fonts.mono}`
  drawTracked(ctx, "FIELD NOTES", padL, y - 6 * s, 0.18 * 10 * t)
  y += Math.max(28 * s, 16 * t)

  ctx.font = `400 ${26 * t}px ${fonts.serif}`
  ctx.fillStyle = INK
  const head = "Offbeat "
  ctx.fillText(head, padL, y)
  let x = padL + ctx.measureText(head).width

  ctx.fillStyle = MUTED
  const noun = "(noun) "
  ctx.fillText(noun, x, y)
  x += ctx.measureText(noun).width

  ctx.font = `400 ${14 * t}px ${fonts.mono}`
  ctx.fillStyle = ACCENT
  ctx.fillText(FIELD_NOTES_PRONUNCIATION, x, y + 6 * t)
  y += Math.max(44 * s, 26 * t + 12 * s)

  const numberW = 16 * t
  const gap = 12 * s
  const defW = contentW - numberW - gap

  definitions.forEach((definition, index) => {
    ctx.font = `400 ${10 * t}px ${fonts.mono}`
    ctx.fillStyle = NUMBER
    ctx.fillText(String(index + 1), padL, y + 2 * s)

    ctx.font = `300 ${15 * t}px ${fonts.serif}`
    ctx.fillStyle = BODY
    const lines = wrapText(ctx, definition, defW)
    for (const line of lines) {
      ctx.fillText(line, padL + numberW + gap, y)
      y += lineHeight
    }
    y += 6 * s
  })
}

export function cssFontFamily(className: string, fallback: string) {
  const probe = document.createElement("span")
  probe.className = className
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  document.body.append(probe)
  const family = getComputedStyle(probe).fontFamily || fallback
  probe.remove()
  return family
}
