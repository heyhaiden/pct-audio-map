/**
 * `sizes` for a team portrait. The frame is 3:4 and the photo is `object-cover`,
 * so a landscape photo is drawn wider than the frame (its height fills the
 * frame), and portrait photos get an extra 110% zoom. Telling the browser only
 * the frame width made it download a version half as wide as drawn, which
 * showed up as soft, blocky portraits (prod: Anna's 1024x682 photo was served
 * at 239x160 into a 240x320 frame).
 */

/** Frame width on phones and from the md breakpoint, in rem. */
export const PORTRAIT_FRAME_REM = { mobile: 17.5, desktop: 15 }
/** Frame height over width. */
export const PORTRAIT_FRAME_ASPECT = 4 / 3
/** Extra zoom applied to portrait-orientation photos (Tailwind `scale-110`). */
export const PORTRAIT_ZOOM = 1.1

/** How many frame-widths wide the photo is actually drawn. */
export function portraitDrawScale(photoWidth: number, photoHeight: number): number {
  if (!(photoWidth > 0) || !(photoHeight > 0)) return 1
  const coverScale = Math.max(1, PORTRAIT_FRAME_ASPECT * (photoWidth / photoHeight))
  return photoWidth > photoHeight ? coverScale : coverScale * PORTRAIT_ZOOM
}

export function portraitSizes(photoWidth: number, photoHeight: number): string {
  const scale = portraitDrawScale(photoWidth, photoHeight)
  const rem = (frame: number) => `${Math.ceil(frame * scale * 100) / 100}rem`
  return `(min-width: 768px) ${rem(PORTRAIT_FRAME_REM.desktop)}, ${rem(PORTRAIT_FRAME_REM.mobile)}`
}
