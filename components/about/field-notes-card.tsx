"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  cssFontFamily,
  drawFieldNotesCard,
  FIELD_NOTES_PRONUNCIATION,
  MOBILE_FIELD_NOTES_TYPE_SCALE,
} from "@/lib/draw-field-notes-card"

const TEXTURE_W = 2048
const TEXTURE_H = 1120
const CARD_W = 2.52
const CARD_D = CARD_W * (TEXTURE_H / TEXTURE_W)
const CARD_T = 0.008

type Pose = {
  rx: number
  ry: number
  rz: number
  y: number
  z: number
}

const TABLE_POSE: Pose = {
  rx: -1.42,
  ry: -0.14,
  rz: 0.1,
  y: -0.58,
  z: 0.15,
}

const FLOAT_POSE: Pose = {
  rx: -0.12,
  ry: 0.07,
  rz: -0.02,
  y: 0.36,
  z: 0,
}

const TABLE_CAM = { beta: Math.PI / 2 - 0.04, radius: 3.7 }
const FLOAT_CAM = { beta: Math.PI / 2 - 0.05, radius: 3.55 }
/** Phone: start smaller so the table pose doesn't fill the viewport, then grow. */
const TABLE_SCALE_MOBILE = 0.74

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function mix(from: Pose, to: Pose, t: number): Pose {
  return {
    rx: lerp(from.rx, to.rx, t),
    ry: lerp(from.ry, to.ry, t),
    rz: lerp(from.rz, to.rz, t),
    y: lerp(from.y, to.y, t),
    z: lerp(from.z, to.z, t),
  }
}

function applyPose(node: { rotation: { x: number; y: number; z: number }; position: { y: number; z: number } }, pose: Pose) {
  node.rotation.x = pose.rx
  node.rotation.y = pose.ry
  node.rotation.z = pose.rz
  node.position.y = pose.y
  node.position.z = pose.z
}

const EMERGE_PX = 56

function placeCopy(el: HTMLElement | null, progress: number) {
  if (!el) return
  const t = Math.min(1, Math.max(0, progress))
  el.style.opacity = String(t)
  el.style.transform = t >= 1 ? "none" : `translateY(${(1 - t) * -EMERGE_PX}px)`
}

export function FieldNotesCard({
  definitions,
  children,
}: {
  definitions: readonly string[]
  children?: ReactNode
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) placeCopy(copyRef.current, 1)
    let disposed = false
    let engine: import("@babylonjs/core").Engine | undefined

    const boot = async () => {
      await document.fonts.ready
      if (disposed) return

      const BABYLON = await import("@babylonjs/core")
      if (disposed) return

      const {
        Engine,
        Scene,
        ArcRotateCamera,
        HemisphericLight,
        DirectionalLight,
        Vector3,
        Color3,
        Color4,
        MeshBuilder,
        StandardMaterial,
        DynamicTexture,
        TransformNode,
        Texture,
      } = BABYLON

      try {
        engine = new Engine(canvas, true, { alpha: true, antialias: true, premultipliedAlpha: false }, true)
      } catch {
        setFailed(true)
        return
      }

      const scene = new Scene(engine)
      scene.clearColor = new Color4(0, 0, 0, 0)
      scene.autoClear = true

      const startCam = reduced ? FLOAT_CAM : TABLE_CAM
      const camera = new ArcRotateCamera(
        "cam",
        Math.PI / 2,
        startCam.beta,
        startCam.radius,
        new Vector3(0, 0, 0),
        scene,
      )
      camera.fov = 0.62
      camera.lowerRadiusLimit = reduced ? FLOAT_CAM.radius : 2.4
      camera.upperRadiusLimit = reduced ? FLOAT_CAM.radius : 5.2
      camera.inputs.clear()

      scene.ambientColor = new Color3(1, 1, 1)

      const hemi = new HemisphericLight("hemi", new Vector3(0.15, 1, 0.55), scene)
      hemi.intensity = 1.05
      hemi.diffuse = new Color3(1, 0.99, 0.96)
      hemi.groundColor = new Color3(0.92, 0.88, 0.8)

      const key = new DirectionalLight("key", new Vector3(-0.2, -0.55, -0.7), scene)
      key.intensity = 0.18
      key.diffuse = new Color3(1, 0.98, 0.94)

      const fonts = {
        serif: cssFontFamily("pct-display", "Georgia, serif"),
        mono: cssFontFamily("font-mono", "ui-monospace, monospace"),
      }

      const paperCanvas = document.createElement("canvas")
      paperCanvas.width = TEXTURE_W
      paperCanvas.height = TEXTURE_H
      const ctx = paperCanvas.getContext("2d")
      if (!ctx) {
        setFailed(true)
        engine.dispose()
        return
      }
      drawFieldNotesCard(ctx, TEXTURE_W, TEXTURE_H, definitions, fonts, {
        typeScale: window.matchMedia("(max-width: 767px)").matches
          ? MOBILE_FIELD_NOTES_TYPE_SCALE
          : 1,
      })

      const texture = new DynamicTexture("notes", paperCanvas, {
        scene,
        samplingMode: Texture.BILINEAR_SAMPLINGMODE,
      })
      texture.hasAlpha = false
      texture.uScale = -1
      texture.uOffset = 1
      texture.update()

      const paper = new StandardMaterial("paper", scene)
      paper.diffuseTexture = texture
      paper.emissiveTexture = texture
      paper.emissiveColor = new Color3(1, 1, 1)
      paper.diffuseColor = new Color3(1, 1, 1)
      paper.specularColor = new Color3(0, 0, 0)
      paper.disableLighting = true
      paper.backFaceCulling = false
      paper.useAlphaFromDiffuseTexture = false

      const paperColor = new Color3(0.937, 0.894, 0.8)
      const edge = new StandardMaterial("edge", scene)
      edge.diffuseColor = paperColor
      edge.emissiveColor = paperColor
      edge.specularColor = new Color3(0, 0, 0)
      edge.disableLighting = true

      const root = new TransformNode("cardRoot", scene)

      const stock = MeshBuilder.CreateBox(
        "stock",
        { width: CARD_W, height: CARD_D, depth: CARD_T },
        scene,
      )
      stock.material = edge
      stock.parent = root

      const face = MeshBuilder.CreatePlane("face", { width: CARD_W, height: CARD_D }, scene)
      face.position.z = CARD_T / 2 + 0.0015
      face.material = paper
      face.parent = root

      const shadowMat = new StandardMaterial("shadow", scene)
      shadowMat.diffuseColor = new Color3(0, 0, 0)
      shadowMat.alpha = 0.16
      shadowMat.backFaceCulling = false
      shadowMat.disableLighting = true

      const shadow = MeshBuilder.CreateGround("shadow", { width: CARD_W * 1.08, height: CARD_D * 1.15 }, scene)
      shadow.material = shadowMat
      shadow.position.y = -0.72

      const mobile = window.matchMedia("(max-width: 767px)").matches
      const startScale = !reduced && mobile ? TABLE_SCALE_MOBILE : 1
      applyPose(root, reduced ? FLOAT_POSE : TABLE_POSE)
      root.scaling.setAll(startScale)
      if (reduced) shadowMat.alpha = 0.08

      let elapsed = 0
      const delay = 0.4
      const duration = 2.15
      let settled = reduced
      let pointerX = 0
      let pointerY = 0
      let followX = 0
      let followY = 0

      const onPointerMove = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect()
        const halfW = Math.max(rect.width * 0.55, 1)
        const halfH = Math.max(rect.height * 0.55, 1)
        pointerX = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / halfW))
        pointerY = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / halfH))
      }
      const onPointerLeave = () => {
        pointerX = 0
        pointerY = 0
      }

      scene.onBeforeRenderObservable.add(() => {
        const dt = engine!.getDeltaTime() / 1000
        const catchUp = 1 - Math.exp(-dt * 8)
        followX += (pointerX - followX) * catchUp
        followY += (pointerY - followY) * catchUp

        if (!settled) {
          elapsed += dt
          const u = Math.min(1, Math.max(0, (elapsed - delay) / duration))
          const e = easeInOutCubic(u)
          applyPose(root, mix(TABLE_POSE, FLOAT_POSE, e))
          root.scaling.setAll(lerp(startScale, 1, e))
          camera.beta = lerp(TABLE_CAM.beta, FLOAT_CAM.beta, e)
          camera.radius = lerp(TABLE_CAM.radius, FLOAT_CAM.radius, e)
          shadow.scaling.x = lerp(1.02, 0.78, e)
          shadow.scaling.z = lerp(1.08, 0.72, e)
          shadowMat.alpha = lerp(0.22, 0.07, e)
          placeCopy(copyRef.current, e)
          if (u >= 1) {
            settled = true
            placeCopy(copyRef.current, 1)
            camera.lowerRadiusLimit = FLOAT_CAM.radius
            camera.upperRadiusLimit = FLOAT_CAM.radius
          }
        }

        const pose = settled ? FLOAT_POSE : { rx: root.rotation.x, ry: root.rotation.y, rz: root.rotation.z, y: root.position.y, z: root.position.z }
        const influence = settled ? 1 : Math.min(1, Math.max(0, (elapsed - delay) / duration))
        const t = performance.now() * 0.00055
        const idle = settled && !reduced ? 1 : 0
        root.rotation.x = pose.rx + followY * 0.1 * influence + Math.sin(t) * 0.008 * idle
        root.rotation.y = pose.ry + followX * 0.16 * influence
        root.rotation.z = pose.rz + followX * 0.035 * influence + Math.sin(t * 0.7) * 0.006 * idle
        root.position.x = followX * 0.045 * influence
        root.position.y = pose.y - followY * 0.03 * influence + Math.sin(t) * 0.01 * idle
      })

      const onResize = () => engine?.resize()
      window.addEventListener("pointermove", onPointerMove, { passive: true })
      window.addEventListener("pointerleave", onPointerLeave)
      window.addEventListener("resize", onResize)
      engine.runRenderLoop(() => scene.render())

      return () => {
        window.removeEventListener("pointermove", onPointerMove)
        window.removeEventListener("pointerleave", onPointerLeave)
        window.removeEventListener("resize", onResize)
      }
    }

    const extraCleanup = boot()

    return () => {
      disposed = true
      void extraCleanup.then((cleanup) => cleanup?.())
      engine?.dispose()
    }
  }, [definitions])

  if (failed) {
    return (
      <>
      <article className="pct-field-card relative mx-auto w-full max-w-xl bg-[#efe4cc] pl-12 pr-8 pb-8 pt-6 text-left shadow-[0_18px_42px_rgba(0,0,0,0.42)]">
        <p className="mb-4 font-mono text-micro uppercase tracking-[0.18em] text-[#8a6f4e]">
          Field notes
        </p>
        <p className="pct-display text-[24px] font-normal leading-snug text-[#2a241c] md:text-[26px]">
          Offbeat <span className="text-[#7a6a56]">(noun)</span>{" "}
          <span className="font-mono text-copy font-normal tracking-normal text-[#ed5a43]">
            {FIELD_NOTES_PRONUNCIATION}
          </span>
        </p>
        <ol className="mt-5 space-y-2.5">
          {definitions.map((definition, index) => (
            <li
              key={definition}
              className="flex items-start gap-3 pct-display text-lede font-light leading-[1.65] text-[#4a4238] md:text-prose"
            >
              <span className="mt-0.5 w-4 shrink-0 font-mono text-micro text-[#9a7b5a]">
                {index + 1}
              </span>
              <span>{definition}</span>
            </li>
          ))}
        </ol>
      </article>
      {children}
    </>
    )
  }

  return (
    <div>
    <div className="relative z-10 left-1/2 w-screen -translate-x-1/2 md:w-[min(54.6rem,calc(100vw-3rem))]">
      <div className="sr-only">
        <p>
          Offbeat (noun) {FIELD_NOTES_PRONUNCIATION}
        </p>
        <ol>
          {definitions.map((definition) => (
            <li key={definition}>{definition}</li>
          ))}
        </ol>
      </div>
      <canvas
        ref={canvasRef}
        className="pointer-events-none mx-auto block h-[min(75.4vw,546px)] w-full"
        aria-hidden
      />
    </div>
    {children ? (
      <div
        ref={copyRef}
        className="pct-card-copy relative z-0 -mt-[calc(min(75.4vw,546px)*0.14-0.5rem)] -translate-y-11 opacity-0"
      >
        {children}
      </div>
    ) : null}
    </div>
  )
}
