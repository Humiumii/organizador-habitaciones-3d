import assert from 'node:assert/strict'
import { test } from 'node:test'
import { templates } from './templates.ts'
import { inspectLayout } from './geometry.ts'

test('each template is independent and starts without placement conflicts', () => {
  for (const template of templates) {
    const a = template.create()
    const b = template.create()
    for (const status of inspectLayout(a).values()) {
      assert.ok(status.clearance)
      assert.equal(status.collisions.length, 0)
    }
    a.room.width = 1
    if (a.items.length) a.items[0].x = -1
    assert.ok(b.room.width > 1)
    assert.ok(b.items.every(item => item.x >= 0))
  }
})
