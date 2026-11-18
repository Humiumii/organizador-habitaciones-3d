import { useEffect, useState } from 'react'
import { disposeModel, restoreModel } from './modelFiles'
import type { Furniture } from './model'

type Loaded = Awaited<ReturnType<typeof restoreModel>>

export function ImportedMesh({ item, color }: { item: Furniture; color: string }) {
  const [model, setModel] = useState<Loaded | null>(null)
  useEffect(() => {
    let active = true
    let loaded: Loaded | undefined
    void restoreModel(item.id).then(result => {
      if (!active) { disposeModel(result.scene); return }
      loaded = result
      setModel(result)
    }).catch(() => {
      if (active) setModel(null)
    })
    return () => {
      active = false
      if (loaded) disposeModel(loaded.scene)
    }
  }, [item.id])

  const { width, height, depth } = item
  if (!model) return <mesh position={[0, height / 2, 0]}>
    <boxGeometry args={[width, height, depth]} />
    <meshStandardMaterial color={color} />
  </mesh>

  const { size, origin, scene } = model
  return <group scale={[width / (size.x || 1), height / (size.y || 1), depth / (size.z || 1)]}>
    <group position={[-origin.x, -origin.y, -origin.z]}>
      <primitive object={scene} />
    </group>
  </group>
}
