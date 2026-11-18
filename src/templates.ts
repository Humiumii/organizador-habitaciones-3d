import { example, makeItem } from './model.ts'
import type { Layout } from './model.ts'

export const templates = [
  { name: 'Dormitorio amoblado', create: example },
  { name: 'Oficina en casa', create: (): Layout => ({
    room: { width: 320, depth: 280, height: 240 },
    items: [makeItem('desk', 'escritorio', 30, 20), makeItem('closet', 'closet', 175, 20)],
  }) },
  { name: 'Dormitorio compacto', create: (): Layout => ({
    room: { width: 280, depth: 310, height: 240 },
    items: [makeItem('bed', 'cama', 20, 25), makeItem('nightstand', 'velador', 170, 25)],
  }) },
  { name: 'Habitación vacía', create: (): Layout => ({ room: example().room, items: [] }) },
]

