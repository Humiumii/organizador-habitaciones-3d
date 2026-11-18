import { catalog, example } from './model'
import type { Furniture, Layout, Size } from './model'

export type Slot = 0 | 1
export type Workspaces = { active: Slot; layouts: [Layout, Layout] }
const storageKey = 'pieza.workspaces.v1'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function integer(value: unknown, min: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= 3000
}

function validSize(value: unknown): value is Size {
  return record(value) && integer(value.width, 1) && integer(value.depth, 1) && integer(value.height, 1)
}

function validFurniture(value: unknown): value is Furniture {
  return record(value) && typeof value.id === 'string' && typeof value.kind === 'string' &&
    Object.hasOwn(catalog, value.kind) && (value.kind !== 'custom' || typeof value.assetName === 'string') && integer(value.x, -3000) && integer(value.y, -3000) &&
    (value.rotation === 0 || value.rotation === 90 || value.rotation === 180 || value.rotation === 270) &&
    validSize(value)
}

function validLayout(value: unknown): value is Layout {
  return record(value) && validSize(value.room) && Array.isArray(value.items) &&
    value.items.every(validFurniture) && new Set(value.items.map(item => item.id)).size === value.items.length
}

export function readWorkspaces(): Workspaces {
  const fallback: Workspaces = { active: 0, layouts: [example(), example()] }
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!record(parsed) || !Array.isArray(parsed.layouts)) return fallback
    return {
      active: parsed.active === 1 ? 1 : 0,
      layouts: [
        validLayout(parsed.layouts[0]) ? parsed.layouts[0] : fallback.layouts[0],
        validLayout(parsed.layouts[1]) ? parsed.layouts[1] : fallback.layouts[1],
      ],
    }
  } catch {
    return fallback
  }
}

export function saveWorkspaces(workspaces: Workspaces) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspaces))
    return true
  } catch {
    return false
  }
}
