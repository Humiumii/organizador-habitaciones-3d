import assert from 'node:assert/strict'
import { test } from 'node:test'
import { footprint, inspectLayout, nearestWall, overlaps } from './geometry.ts'

const room = { width: 420, depth: 360, height: 245 }
const desk = { id: 'desk', kind: 'desk', width: 120, depth: 60, height: 75, x: 0, y: 0, rotation: 0 }

test('90° and 270° swap the footprint while retaining its anchor', () => {
  for (const rotation of [90, 270]) {
    assert.deepEqual(footprint({ ...desk, rotation, x: 15, y: 25 }), { x: 15, y: 25, width: 60, depth: 120 })
  }
  assert.deepEqual(footprint({ ...desk, rotation: 180 }), footprint(desk))
})

test('edge and corner contact have no overlapping area', () => {
  const area = footprint(desk)
  for (const [x, y] of [[120, 0], [0, 60], [120, 60]]) {
    assert.equal(overlaps(area, { ...area, x, y }), false)
  }
  assert.equal(overlaps(area, { ...area, x: 119, y: 59 }), true)
})

test('rotation changes which furniture overlaps and reports both counterparts', () => {
  const rotated = { ...desk, rotation: 90 }
  const other = { ...desk, id: 'other', x: 25, y: 70 }
  assert.deepEqual(inspectLayout({ room, items: [desk, other] }).get(desk.id).collisions, [])
  const status = inspectLayout({ room, items: [rotated, other] })
  assert.deepEqual(status.get(desk.id).collisions, [other])
  assert.deepEqual(status.get(other.id).collisions, [rotated])
})

test('exact room edges are inside and yield zero clearance', () => {
  assert.deepEqual(nearestWall(room, { ...footprint(desk), x: 300, y: 250 }), { wall: 'derecha', distance: 0 })
  assert.deepEqual(nearestWall(room, { ...footprint(desk), x: 10, y: 20 }), { wall: 'izquierda', distance: 10 })
})

test('all four perimeter exits are detected with the rotated footprint', () => {
  const area = footprint({ ...desk, rotation: 90 })
  for (const [x, y] of [[-1, 25], [361, 25], [10, -1], [10, 241]]) {
    assert.equal(nearestWall(room, { ...area, x, y }), null)
  }
  assert.equal(nearestWall(room, { ...area, x: 360, y: 240 }).distance, 0)
})
