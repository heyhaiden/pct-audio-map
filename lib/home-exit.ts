import { goHomeToSplash } from "@/lib/map-session"

const EXIT_MS = 320

type HomeClick = {
  preventDefault: () => void
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  button: number
}

/** Fade the current site page out, then go to splash. Modified clicks (new tab) skip the delay. */
export function handleHomeNavClick(event: HomeClick, go: () => void) {
  goHomeToSplash()

  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return
  }

  const root = document.querySelector(".site-page-root")
  if (!(root instanceof HTMLElement)) return

  event.preventDefault()
  if (root.classList.contains("pct-page-out")) return

  root.classList.add("pct-page-out")
  let done = false
  const finish = () => {
    if (done) return
    done = true
    go()
  }
  root.addEventListener("animationend", finish, { once: true })
  window.setTimeout(finish, EXIT_MS + 80)
}
