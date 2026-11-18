import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { catalog } from './model'
import type { Furniture, Layout } from './model'
import { footprint } from './geometry'

type Props = { layout: Layout; selected: string | null; select: (id: string | null) => void; move: (id: string, x: number, y: number) => void }

export function Plan({ layout, selected, select, move }: Props) {
  const { room, items } = layout
  const w = room.width
  const d = room.depth
  return (
    <svg className="plan" aria-label="Planta de la habitación" viewBox={`-42 -48 ${w + 84} ${d + 86}`}>
      <defs>
        <pattern id="floor-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 H 0 V 20" fill="none" stroke="#e0e7df" strokeWidth="0.8" />
        </pattern>
      </defs>
      <path className="dimension" d={`M 0 -15 V -35 M 0 -25 H ${w} M ${w} -15 V -35 M -15 0 H -35 M -25 0 V ${d} M -15 ${d} H -35`} />
      <text className="dimension-label" x={w / 2} y="-29">{w} cm</text>
      <text className="dimension-label" transform={`translate(-30 ${d / 2}) rotate(-90)`}>{d} cm</text>
      <rect className="floor" width={w} height={d} onClick={() => select(null)} />
      {items.map(item => <PlanItem key={item.id} item={item} selected={selected === item.id} select={select} move={move} />)}
    </svg>
  )
}

function PlanItem({ item, selected, select, move }: { item: Furniture; selected: boolean; select: Props['select']; move: Props['move'] }) {
  const { x, y, width, depth } = footprint(item)
  const { name, color } = catalog[item.kind]
  const drag = useRef<{ pointer: number; offsetX: number; offsetY: number } | null>(null)
  function point(event: PointerEvent<SVGGElement>) {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM()
    return matrix && new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
  }

  function start(event: PointerEvent<SVGGElement>) {
    if (event.button !== 0 || drag.current) return
    const position = point(event)
    if (!position) return
    drag.current = { pointer: event.pointerId, offsetX: position.x - x, offsetY: position.y - y }
    event.currentTarget.setPointerCapture(event.pointerId)
    select(item.id)
  }

  function dragTo(event: PointerEvent<SVGGElement>) {
    if (drag.current?.pointer !== event.pointerId) return
    const position = point(event)
    if (!position) return
    move(item.id, Math.round(position.x - drag.current.offsetX), Math.round(position.y - drag.current.offsetY))
  }

  return (
    <g className="plan-item" data-selected={selected} role="button" tabIndex={0}
      aria-label={name} aria-pressed={selected} onClick={() => select(item.id)}
      onPointerDown={start} onPointerMove={dragTo} onLostPointerCapture={event => {
        if (drag.current?.pointer === event.pointerId) drag.current = null
      }}
      onKeyDown={event => {
        const direction: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
        const step = direction[event.key]
        if (!step && event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        select(item.id)
        if (step) move(item.id, x + step[0], y + step[1])
      }}>
      <rect x={x} y={y} width={width} height={depth} rx="3" fill={color} />
      <g transform={`translate(${x + width / 2} ${y + depth / 2}) rotate(${item.rotation})`} className="furniture-detail">
        {item.kind === 'bed' && <>
          <rect x={-item.width * .42} y={-item.depth * .43} width={item.width * .38} height={item.depth * .16} rx="4" />
          <rect x={item.width * .04} y={-item.depth * .43} width={item.width * .38} height={item.depth * .16} rx="4" />
          <path d={`M ${-item.width / 2} ${-item.depth * .21} H ${item.width / 2}`} />
        </>}
        {item.kind === 'closet' && <path d={`M 0 ${-item.depth / 2} V ${item.depth / 2} M ${-item.width * .4} ${item.depth * .34} H ${item.width * .4}`} />}
        {item.kind === 'desk' && <rect x={-item.width * .4} y={-item.depth * .35} width={item.width * .8} height={item.depth * .7} rx="2" />}
        {item.kind === 'nightstand' && <circle cy={item.depth * .26} r={Math.min(item.width, item.depth) * .055} />}
      </g>
      <text className="item-label" x={x + width / 2} y={y + depth / 2} fontSize={Math.min(13, width / 5, depth / 3)}>{name}</text>
    </g>
  )
}
