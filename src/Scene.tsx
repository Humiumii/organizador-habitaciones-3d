import { ImportedMesh } from './ImportedMesh'
import { Plane, Raycaster, Vector2, Vector3 } from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { catalog } from './model'
import type { Furniture, Layout } from './model'
import { footprint } from './geometry'

type Props = { move: (id: string, x: number, y: number) => void; issues: Set<string>; layout: Layout; selected: string | null; select: (id: string | null) => void }

function CameraControls({ span }: { span: number }) {
  const { camera, gl, invalidate } = useThree()
  useEffect(() => {
    camera.position.set(span * .98, span * .94, span * 1.2)
    const controls = new OrbitControls(camera, gl.domElement)
    controls.target.set(0, span * .12, 0)
    controls.maxPolarAngle = Math.PI / 2.03
    controls.minDistance = span * .2
    controls.maxDistance = span * 4
    controls.enablePan = false
    controls.update()
    controls.addEventListener('change', () => invalidate())
    invalidate()
    return () => controls.dispose()
  }, [camera, gl, invalidate, span])
  return null
}

function FurnitureDrag({ layout, select, move }: Pick<Props, 'layout' | 'select' | 'move'>) {
  const { camera, gl, scene } = useThree()
  const latest = useRef({ layout, select, move })
  latest.current = { layout, select, move }

  useEffect(() => {
    const canvas = gl.domElement
    const ray = new Raycaster()
    const pointer = new Vector2()
    const plane = new Plane(new Vector3(0, 1, 0))
    const point = new Vector3()
    let drag: { id: string; pointer: number; offsetX: number; offsetZ: number } | null = null

    function aim(event: PointerEvent) {
      const bounds = canvas.getBoundingClientRect()
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2)
      ray.setFromCamera(pointer, camera)
    }

    function start(event: PointerEvent) {
      if (drag || event.button !== 0 || !event.isPrimary) return
      aim(event)
      const hit = ray.intersectObjects(scene.children)[0]
      if (!hit) return
      let object = hit.object
      while (object.parent && !object.userData.furnitureId) object = object.parent
      const item = latest.current.layout.items.find(candidate => candidate.id === object.userData.furnitureId)
      if (!item) return
      event.stopImmediatePropagation()
      plane.constant = -hit.point.y
      drag = { id: item.id, pointer: event.pointerId, offsetX: hit.point.x - item.x, offsetZ: hit.point.z - item.y }
      canvas.setPointerCapture(event.pointerId)
      canvas.style.cursor = 'grabbing'
      latest.current.select(item.id)
    }

    function update(event: PointerEvent) {
      if (!drag || event.pointerId !== drag.pointer) return
      event.stopImmediatePropagation()
      aim(event)
      if (ray.ray.intersectPlane(plane, point)) {
        latest.current.move(drag.id, point.x - drag.offsetX, point.z - drag.offsetZ)
      }
    }

    function finish(event: PointerEvent) {
      if (drag?.pointer !== event.pointerId) return
      drag = null
      canvas.style.cursor = ''
    }

    canvas.addEventListener('pointerdown', start, true)
    canvas.addEventListener('pointermove', update, true)
    canvas.addEventListener('lostpointercapture', finish)
    return () => {
      if (drag && canvas.hasPointerCapture(drag.pointer)) canvas.releasePointerCapture(drag.pointer)
      canvas.style.cursor = ''
      canvas.removeEventListener('pointerdown', start, true)
      canvas.removeEventListener('pointermove', update, true)
      canvas.removeEventListener('lostpointercapture', finish)
    }
  }, [camera, gl, scene])
  return null
}

function Box({ size, position, color }: { size: [number, number, number]; position: [number, number, number]; color: string }) {
  return <mesh position={position}><boxGeometry args={size} /><meshStandardMaterial color={color} /></mesh>
}

function Model({ item, origin, active, invalid }: { item: Furniture; origin: [number, number]; active: boolean; invalid: boolean }) {
  const { width: w, height: h, depth: d, kind } = item
  const f = footprint(item)
  const color = invalid ? '#df7564' : active ? '#5aa68a' : catalog[kind].color
  return <group position={[f.x + f.width / 2 - origin[0], 0, f.y + f.depth / 2 - origin[1]]}
    rotation={[0, -item.rotation * Math.PI / 180, 0]} userData={{ furnitureId: item.id }}>
    {kind === 'custom' ? <>
      {(active || invalid) && <Box size={[w, 1, d]} position={[0, .5, 0]} color={color} />}
      <ImportedMesh item={item} color={color} />
    </> : kind === 'bed' ? <>
      <Box size={[w, h * .38, d]} position={[0, h * .19, 0]} color="#726951" />
      <Box size={[w * .98, h * .46, d * .98]} position={[0, h * .61, 0]} color={color} />
      {[-.23, .23].map(x => <Box key={x} size={[w * .39, h * .16, d * .19]} position={[w * x, h * .92, -d * .34]} color="#f2eee2" />)}
    </> : kind === 'desk' ? <>
      <Box size={[w, h * .09, d]} position={[0, h * .955, 0]} color={color} />
      {[-.44, .44].flatMap(x => [-.42, .42].map(z =>
        <Box key={`${x}/${z}`} size={[w * .045, h * .91, d * .07]} position={[w * x, h * .455, d * z]} color="#725b45" />))}
    </> : <>
      <Box size={[w, h, d * .92]} position={[0, h / 2, -d * .04]} color={color} />
      {[-1, 1].map(side => <Box key={side}
        size={kind === 'closet' ? [w * .015, h * .14, d * .08] : [w * .34, h * .035, d * .08]}
        position={kind === 'closet' ? [side * w * .045, h * .52, d * .46] : [0, h * (.53 + side * .19), d * .46]}
        color="#756852" />)}
    </>}
  </group>
}

export default function Scene({ layout, selected, select, move, issues }: Props) {
  const { width: w, depth: d, height: h } = layout.room
  const span = Math.max(w, d, h, ...layout.items.map(item => item.height))
  return <Canvas aria-label="Vista tridimensional de la habitación" frameloop="demand" dpr={[1, 1.7]}
    camera={{ fov: 42, near: .5, far: 100000 }}
    fallback={<p>La vista 3D necesita WebGL. Puedes seguir editando en Planta.</p>}>
    <color attach="background" args={['#e8eeea']} />
    <ambientLight intensity={1.55} />
    <directionalLight position={[w, h * 2, d]} intensity={2.3} />
    <CameraControls span={span} />
    <FurnitureDrag layout={layout} select={select} move={move} />
    <Box size={[w, 7, d]} position={[0, -3.5, 0]} color="#d5c3a8" />
    <Box size={[w + 8, h, 4]} position={[0, h / 2, -d / 2 - 2]} color="#e0ebdf" />
    <Box size={[4, h, d]} position={[-w / 2 - 2, h / 2, 0]} color="#c1d1c6" />
    {layout.items.map(item => <Model key={item.id} item={item} origin={[w / 2, d / 2]} active={selected === item.id} invalid={issues.has(item.id)} />)}
  </Canvas>
}
