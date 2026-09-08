import assert from "node:assert/strict"
import test from "node:test"
import { shouldRearmWipNotice, WIP_REARM_GAP_MILES } from "../lib/wip-notice.ts"

const WIP_MILE = 1800

test("a dismissed notice stays dismissed through jitter around the content edge", () => {
  assert.equal(shouldRearmWipNotice(WIP_MILE, WIP_MILE), false)
  assert.equal(shouldRearmWipNotice(WIP_MILE - 1, WIP_MILE), false)
  assert.equal(shouldRearmWipNotice(WIP_MILE + 5, WIP_MILE), false)
})

test("the notice can fire again only after traveling back south of the gap", () => {
  assert.equal(shouldRearmWipNotice(WIP_MILE - WIP_REARM_GAP_MILES, WIP_MILE), false)
  assert.equal(shouldRearmWipNotice(WIP_MILE - WIP_REARM_GAP_MILES - 1, WIP_MILE), true)
})
