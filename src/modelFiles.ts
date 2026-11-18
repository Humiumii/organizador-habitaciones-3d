import { Box3, LoadingManager, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { Material, Mesh, Object3D, Texture } from 'three'

export const maxModelSize = 10 * 1024 * 1024

export async function loadModel(file: Blob) {
  const data = await file.arrayBuffer()
  const header = new DataView(data)
  if (data.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 ||
      header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== data.byteLength ||
      header.getUint32(16, true) !== 0x4e4f534a || header.getUint32(12, true) > data.byteLength - 20) {
    throw new Error('Selecciona un archivo GLB 2.0 válido.')
  }
  const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, header.getUint32(12, true))))
  for (const resource of [...(manifest.buffers ?? []), ...(manifest.images ?? [])]) {
    if (resource.uri !== undefined && (typeof resource.uri !== 'string' || !resource.uri.startsWith('data:'))) {
      throw new Error('El GLB debe incluir todos sus recursos en el mismo archivo.')
    }
  }
  const manager = new LoadingManager().setURLModifier(url => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url
    throw new Error('El GLB debe incluir todos sus recursos en el mismo archivo.')
  })
  const { scene } = await new GLTFLoader(manager).parseAsync(data, '')
  const meshes: Object3D[] = []
  scene.traverse(object => {
    if ((object as Mesh).isMesh) meshes.push(object)
  })
  const bounds = new Box3()
  for (const mesh of meshes) bounds.union(new Box3().setFromObject(mesh))
  const size = bounds.getSize(new Vector3())
  if (bounds.isEmpty() || ![size.x, size.y, size.z].every(Number.isFinite)) {
    disposeModel(scene)
    throw new Error('El archivo no contiene muebles con geometría válida.')
  }
  const center = bounds.getCenter(new Vector3())
  return { scene, size, origin: new Vector3(center.x, bounds.min.y, center.z) }
}

export function disposeModel(scene: Object3D) {
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  scene.traverse(object => {
    const mesh = object as Mesh
    if (!mesh.geometry) return
    mesh.geometry.dispose()
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (material) materials.add(material)
    }
  })
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value?.isTexture) textures.add(value)
    }
    material.dispose()
  }
  for (const texture of textures) {
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close()
    texture.dispose()
  }
}

async function openModels() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('pieza.models', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('files')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveModel(id: string, file: Blob) {
  const db = await openModels()
  try {
    await new Promise<void>((resolve, reject) => {
      const write = db.transaction('files', 'readwrite')
      write.objectStore('files').put(file, id)
      write.oncomplete = () => resolve()
      write.onabort = () => reject(write.error)
    })
  } finally {
    db.close()
  }
}

export async function restoreModel(id: string) {
  const db = await openModels()
  try {
    const file = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    if (!file) throw new Error('Archivo no disponible en el navegador.')
    return loadModel(file)
  } finally {
    db.close()
  }
}
