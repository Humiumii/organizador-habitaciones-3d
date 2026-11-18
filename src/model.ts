export type Kind = 'bed' | 'desk' | 'closet' | 'nightstand'
export type Size = { width: number; depth: number; height: number }
export type Furniture = Size & { id: string; kind: Kind; x: number; y: number; rotation: 0 | 90 | 180 | 270 }
export type Layout = { room: Size; items: Furniture[] }

export const catalog = {
  bed: { name: 'Cama', width: 140, depth: 200, height: 55, color: '#adc7b6' },
  desk: { name: 'Escritorio', width: 120, depth: 60, height: 75, color: '#e5b986' },
  closet: { name: 'Clóset', width: 120, depth: 60, height: 205, color: '#d3c2ab' },
  nightstand: { name: 'Velador', width: 45, depth: 40, height: 52, color: '#d8c7de' },
} satisfies Record<Kind, Size & { name: string; color: string }>

export function makeItem(kind: Kind, id: string, x: number, y: number): Furniture {
  const { width, depth, height } = catalog[kind]
  return { id, kind, width, depth, height, x, y, rotation: 0 }
}

export function example(): Layout {
  return {
    room: { width: 420, depth: 360, height: 245 },
    items: [
      makeItem('bed', 'cama', 32, 32),
      makeItem('nightstand', 'velador', 184, 32),
      makeItem('closet', 'closet', 270, 24),
    ],
  }
}
