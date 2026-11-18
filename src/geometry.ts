import type { Furniture, Layout, Size } from './model'

export function footprint(item: Furniture) {
  const sideways = item.rotation === 90 || item.rotation === 270
  return {
    x: item.x,
    y: item.y,
    width: sideways ? item.depth : item.width,
    depth: sideways ? item.width : item.depth,
  }
}

type Footprint = ReturnType<typeof footprint>

export function overlaps(a: Footprint, b: Footprint) {
  return a.x < b.x + b.width && b.x < a.x + a.width &&
    a.y < b.y + b.depth && b.y < a.y + a.depth
}

export function nearestWall(room: Size, area: Footprint) {
  const walls = [
    { wall: 'izquierda', distance: area.x },
    { wall: 'derecha', distance: room.width - area.x - area.width },
    { wall: 'superior', distance: area.y },
    { wall: 'inferior', distance: room.depth - area.y - area.depth },
  ]
  const nearest = walls.reduce((best, candidate) => candidate.distance < best.distance ? candidate : best)
  return nearest.distance < 0 ? null : nearest
}

export function inspectLayout({ room, items }: Layout) {
  const areas = items.map(footprint)
  const status = new Map(items.map((item, index) => [item.id, {
    clearance: nearestWall(room, areas[index]), collisions: [] as Furniture[],
  }]))
  for (const [index, item] of items.entries()) {
    for (let other = index + 1; other < items.length; other++) {
      if (overlaps(areas[index], areas[other])) {
        status.get(item.id)!.collisions.push(items[other])
        status.get(items[other].id)!.collisions.push(item)
      }
    }
  }
  return status
}
