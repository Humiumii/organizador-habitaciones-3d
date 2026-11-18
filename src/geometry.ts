import type { Furniture } from './model'

export function footprint(item: Furniture) {
  const sideways = item.rotation === 90 || item.rotation === 270
  return {
    x: item.x,
    y: item.y,
    width: sideways ? item.depth : item.width,
    depth: sideways ? item.width : item.depth,
  }
}
