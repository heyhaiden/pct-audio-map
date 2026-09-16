import assert from "node:assert/strict"
import test from "node:test"
import * as mapSession from "../lib/map-session.ts"

function withSessionStorage(run: (storage: Map<string, string>) => void) {
  const storage = new Map<string, string>()
  const sessionStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  }

  Object.defineProperty(globalThis, "window", {
    value: {},
    configurable: true,
  })
  Object.defineProperty(globalThis, "sessionStorage", {
    value: sessionStorage,
    configurable: true,
  })

  try {
    run(storage)
  } finally {
    Reflect.deleteProperty(globalThis, "window")
    Reflect.deleteProperty(globalThis, "sessionStorage")
  }
}

test("map sessions preserve whether a chapter overlay was visible", () => {
  withSessionStorage(() => {
    mapSession.saveMapSession({
      scrollRatio: 0.27,
      miles: 712,
      wipDismissed: false,
      chapterOverlay: 1,
    } as mapSession.MapSessionState & { chapterOverlay: number })

    assert.equal(
      (
        mapSession.getMapSession() as mapSession.MapSessionState & {
          chapterOverlay: number | null
        }
      ).chapterOverlay,
      1,
    )
  })
})

test("returning to the map suppresses a chapter card that was not open", () => {
  const resolveDismissedChapter = (
    mapSession as typeof mapSession & {
      resolveDismissedChapterOnResume: (
        chapterOverlay: number | null,
        currentChapter: number,
      ) => number | null
    }
  ).resolveDismissedChapterOnResume

  assert.equal(typeof resolveDismissedChapter, "function")
  assert.equal(resolveDismissedChapter(null, 2), 2)
  assert.equal(resolveDismissedChapter(2, 2), null)
})

test("leaving from Trail Continues marks it dismissed before navigation", () => {
  withSessionStorage(() => {
    mapSession.saveMapSession({
      scrollRatio: 0.68,
      miles: 1800,
      wipDismissed: false,
    })

    const dismissWip = (
      mapSession as typeof mapSession & {
        markWipDismissedInMapSession: () => void
      }
    ).markWipDismissedInMapSession

    assert.equal(typeof dismissWip, "function")
    dismissWip()
    assert.equal(mapSession.getMapSession()?.wipDismissed, true)
    assert.equal(mapSession.getMapSession()?.miles, 1800)
  })
})
