import { lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { catalog, example, makeItem } from './model'
import type { Furniture, Kind } from './model'
import { Measure } from './Measure'
import { Plan } from './Plan'
import './style.css'

const Scene = lazy(() => import('./Scene'))
const kinds = Object.keys(catalog) as Kind[]
const icons: Record<Kind, string> = {
  bed: 'M3 17V5m0 8h18v6M3 16h18M5 12V9h5v3m0-2h8a3 3 0 0 1 3 3',
  desk: 'M3 10h18v3H3zM5 13v7m14-7v7M9 10V5h6v5',
  closet: 'M5 3h14v17H5zM12 3v17m-2-9v2m4-2v2M6 20v1m12-1v1',
  nightstand: 'M5 6h14v13H5zM5 12h14m-8-3h2m-2 6h2m-7 4v2m12-2v2',
}

function FurnitureIcon({ kind }: { kind: Kind }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"><path d={icons[kind]} /></svg>
}

function App() {
  const [layout, setLayout] = useState(example)
  const [selected, select] = useState<string | null>('cama')
  const [view, setView] = useState<'plan' | '3d'>('plan')
  const { room, items } = layout
  const active = items.find(item => item.id === selected)

  function edit(id: string, patch: Partial<Furniture>) {
    setLayout(current => ({
      ...current, items: current.items.map(item => item.id === id ? { ...item, ...patch } : item),
    }))
  }

  function add(kind: Kind) {
    const id = crypto.randomUUID()
    setLayout(current => ({
      ...current, items: [...current.items, makeItem(kind, id, Math.round(current.room.width / 3), Math.round(current.room.depth / 3))],
    }))
    select(id)
  }

  function remove(id: string) {
    setLayout(current => ({ ...current, items: current.items.filter(item => item.id !== id) }))
    select(null)
  }

  return <>
    <header className="masthead"><span className="brand-mark" aria-hidden="true">◩</span><div><strong>Pieza</strong><span>Organizador de habitaciones</span></div></header>
    <main>
      <div className="intro"><h1>Organiza tu pieza</h1><p>Prueba cómo hacer espacio para un escritorio de 120 cm.</p></div>
      <div className="editor">
        <aside className="sidebar library" aria-label="Catálogo y habitación">
          <section><h2>Catálogo</h2>
            <div className="catalog">{kinds.map(kind => {
              const entry = catalog[kind]
              return <button key={kind} className="catalog-item" aria-label={`Agregar ${entry.name}`} onClick={() => add(kind)}>
                <span className="catalog-icon" style={{ backgroundColor: entry.color }}><FurnitureIcon kind={kind} /></span>
                <span><strong>{entry.name}</strong><small>{entry.width} × {entry.depth} cm</small></span>
                <span className="add" aria-hidden="true">+</span>
              </button>
            })}</div>
          </section>
          <section className="room-settings"><h2>Medidas de la pieza</h2>
            {([['width', 'Ancho de la pieza'], ['depth', 'Largo de la pieza'], ['height', 'Alto de la pieza']] as const).map(([key, label]) =>
              <Measure key={key} label={label} value={room[key]} change={value => setLayout(current => ({ ...current, room: { ...current.room, [key]: value } }))} />)}
          </section>
        </aside>
        <section className="workspace" aria-label="Espacio de trabajo">
          <div className="toolbar"><h2>Habitación</h2><div className="segmented" role="group" aria-label="Vista">
            <button aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Planta</button>
            <button aria-pressed={view === '3d'} onClick={() => setView('3d')}>Vista 3D</button>
          </div></div>
          <div className="drawing">
            {view === 'plan' ? <Plan layout={layout} selected={selected} select={select} move={(id, x, y) => edit(id, { x, y })} /> :
              <Suspense fallback={<p>Cargando vista 3D…</p>}><Scene layout={layout} selected={selected} select={select} /></Suspense>}
          </div>
          <div className="work-footer"><span>{view === 'plan' ? 'Arrastra un mueble o muévelo con las flechas.' : 'Arrastra para girar la cámara. Usa la rueda o pellizca para acercarte.'}</span><span>{items.length} {items.length === 1 ? 'mueble' : 'muebles'}</span></div>
        </section>
        <aside className="sidebar inspector" aria-label="Medidas del mueble">
          <section>
            <h2>Medidas del mueble</h2>
            {active ? <div key={active.id}>
              <div className="selected-item"><span className="catalog-icon" style={{ backgroundColor: catalog[active.kind].color }}><FurnitureIcon kind={active.kind} /></span><div><h3>{catalog[active.kind].name}</h3><small>{active.rotation}° de giro</small></div></div>
              <div className="measure-grid">
                {([['width', 'Ancho'], ['depth', 'Largo'], ['height', 'Alto']] as const).map(([key, label]) =>
                  <Measure key={key} label={label} value={active[key]} change={value => edit(active.id, { [key]: value })} />)}
              </div>
              <h3 className="position-heading">Posición en planta</h3>
              <p className="muted">Desde la esquina superior izquierda.</p>
              <div className="measure-grid">
                <Measure label="Posición X" value={active.x} min={-3000} change={x => edit(active.id, { x })} />
                <Measure label="Posición Y" value={active.y} min={-3000} change={y => edit(active.id, { y })} />
              </div>
              <div className="item-actions">
                <button className="rotate" onClick={() => edit(active.id, { rotation: ((active.rotation + 90) % 360) as Furniture['rotation'] })}>↻ Girar 90°</button>
                <button className="remove" onClick={() => remove(active.id)}>Eliminar</button>
              </div>
            </div> : <p className="muted empty">Selecciona un mueble en la planta o en la vista 3D.</p>}
          </section>
          {items.length > 0 && <section className="item-list"><h3>En esta pieza</h3>
            <ul>{items.map(item => <li key={item.id}><button aria-pressed={selected === item.id} onClick={() => select(item.id)}>
              <span className="swatch" style={{ backgroundColor: catalog[item.kind].color }} />{catalog[item.kind].name}
            </button></li>)}</ul>
          </section>}
        </aside>
      </div>
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
