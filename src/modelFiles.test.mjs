import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loadModel, disposeModel } from './modelFiles.ts'

function glb(manifest, payload = Buffer.alloc(0)) {
  const json = JSON.stringify(manifest)
  const content = Buffer.from(json.padEnd(Math.ceil(json.length / 4) * 4))
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(20 + content.length + (payload.length ? 8 + payload.length : 0), 8)
  header.writeUInt32LE(content.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  if (!payload.length) return new Blob([header, content])
  const chunk = Buffer.alloc(8)
  chunk.writeUInt32LE(payload.length)
  chunk.writeUInt32LE(0x004e4942, 4)
  return new Blob([header, content, chunk, payload])
}

test('embedded GLB geometry supplies dimensions and a floor-level origin', async () => {
  const vertices = new Float32Array([0, 0, 0, 1.2, 0, 0, 0, 0.8, 0.6])
  const file = glb({
    asset: { version: '2.0' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: vertices.byteLength }],
    bufferViews: [{ buffer: 0, byteLength: vertices.byteLength }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1.2, 0.8, 0.6] }],
  }, Buffer.from(vertices.buffer))
  const model = await loadModel(file)
  assert.deepEqual(model.size.toArray().map(value => Math.round(value * 100)), [120, 80, 60])
  assert.deepEqual(model.origin.toArray().map(value => Math.round(value * 100)), [60, 0, 30])
  disposeModel(model.scene)
})

test('invalid files and external resources are rejected before loading', async () => {
  await assert.rejects(loadModel(new Blob(['invalid'])), /GLB 2.0/)
  const external = glb({ asset: { version: '2.0' }, images: [{ uri: 'image.png' }] })
  await assert.rejects(loadModel(external), /recursos en el mismo archivo/)
})
