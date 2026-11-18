import { catalog } from './model'
import type { Furniture, Layout } from './model'
import { footprint } from './geometry'

type Props = { layout: Layout; selected: string | null; select: (id: string | null) => void }

export function Plan({ layout, selected, select }: Props) {
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
      {items.map(item => <PlanItem key={item.id} item={item} selected={selected === item.id} select={select} />)}
    </svg>
  )
}

function PlanItem({ item, selected, select }: { item: Furniture; selected: boolean; select: Props['select'] }) {
  const { x, y, width, depth } = footprint(item)
  const { name, color } = catalog[item.kind]
  return (
    <g className="plan-item" data-selected={selected} role="button" tabIndex={0}
      aria-label={name} aria-pressed={selected} onClick={() => select(item.id)}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(item.id) } }}>
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
