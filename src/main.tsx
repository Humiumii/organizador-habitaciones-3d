import { templates } from './templates'
import { readWorkspaces, saveWorkspaces } from './storage'
import type { Slot } from './storage'
import { inspectLayout } from './geometry'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { catalog, furnitureName, makeItem } from './model'
import type { Furniture, Kind, Layout } from './model'
import { Measure } from './Measure'
import { Plan } from './Plan'
import './style.css'

const Scene = lazy(() => import('./Scene'))
const kinds = ['bed', 'desk', 'closet', 'nightstand'] as const
const icons: Record<Kind, string> = {
  bed: 'M3 17V5m0 8h18v6M3 16h18M5 12V9h5v3m0-2h8a3 3 0 0 1 3 3',
  desk: 'M3 10h18v3H3zM5 13v7m14-7v7M9 10V5h6v5',
  closet: 'M5 3h14v17H5zM12 3v17m-2-9v2m4-2v2M6 20v1m12-1v1',
  custom: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 9 8-4.5M12 12 4 7.5m8 4.5v9',
  nightstand: 'M5 6h14v13H5zM5 12h14m-8-3h2m-2 6h2m-7 4v2m12-2v2',
}

function FurnitureIcon({ kind }: { kind: Kind }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"><path d={icons[kind]} /></svg>
}

function App() {
  const [workspaces, setWorkspaces] = useState(readWorkspaces)
  const [confirmTemplate, setConfirmTemplate] = useState(false)
  const [templateIndex, setTemplateIndex] = useState(0)
  const [saved, setSaved] = useState(true)
  const layout = workspaces.layouts[workspaces.active]
  const activeSlot = useRef(workspaces.active)
  activeSlot.current = workspaces.active
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')

  useEffect(() => {
    setSaved(saveWorkspaces(workspaces))
  }, [workspaces])

  function setLayout(change: (layout: Layout) => Layout) {
    setWorkspaces(current => {
      const layouts: [Layout, Layout] = [...current.layouts]
      layouts[current.active] = change(layouts[current.active])
      return { ...current, layouts }
    })
  }

  function switchLayout(slot: Slot) {
    if (slot === workspaces.active) return
    setConfirmTemplate(false)
    setWorkspaces(current => ({ ...current, active: slot }))
    select(null)
  }
  const [selected, select] = useState<string | null>('cama')
  const [view, setView] = useState<'plan' | '3d'>('plan')
  const { room, items } = layout
  const active = items.find(item => item.id === selected)

  const status = inspectLayout(layout)
  const issues = new Set(items.filter(item => {
    const check = status.get(item.id)!
    return !check.clearance || check.collisions.length > 0
  }).map(item => item.id))
  const activeStatus = active && status.get(active.id)

  function edit(id: string, patch: Partial<Furniture>) {
    setLayout(current => ({
      ...current, items: current.items.map(item => item.id === id ? { ...item, ...patch } : item),
    }))
  }

  function applyTemplate() {
    const template = templates[templateIndex]
    setConfirmTemplate(false)
    setLayout(template.create)
    select(null)
  }

  function move(id: string, x: number, y: number) {
    edit(id, { x: Math.max(-3000, Math.min(3000, Math.round(x))), y: Math.max(-3000, Math.min(3000, Math.round(y))) })
  }

  function add(kind: Kind) {
    const id = crypto.randomUUID()
    setLayout(current => ({
      ...current, items: [...current.items, makeItem(kind, id, Math.round(current.room.width / 3), Math.round(current.room.depth / 3))],
    }))
    select(id)
  }

  async function importFile(file: File) {
    const slot = workspaces.active
    setImporting(true)
    setImportMessage('Leyendo modelo…')
    try {
      const { maxModelSize, loadModel, disposeModel, saveModel } = await import('./modelFiles')
      if (!file.name.toLowerCase().endsWith('.glb')) throw new Error('Selecciona un archivo .glb.')
      if (file.size > maxModelSize) throw new Error('El archivo supera el límite de 10 MB.')
      const model = await loadModel(file).catch(error => {
        throw new Error(error instanceof Error && error.message.startsWith('El GLB')
          ? error.message : 'No se pudo leer el GLB. Usa un archivo GLB 2.0 autocontenido.')
      })
      const { x, y, z } = model.size
      disposeModel(model.scene)
      const centimeters = (meters: number) => Math.max(1, Math.min(3000, Math.round(meters * 100)))
      const id = crypto.randomUUID()
      const assetName = file.name.slice(0, -4).trim().slice(0, 64) || 'Modelo importado'
      await saveModel(id, file).catch(() => { throw new Error('El navegador no pudo guardar el modelo.') })
      setWorkspaces(current => {
        const layouts: [Layout, Layout] = [...current.layouts]
        const target = layouts[slot]
        const item = makeItem('custom', id, Math.round(target.room.width / 3), Math.round(target.room.depth / 3))
        layouts[slot] = { ...target, items: [...target.items, {
          ...item, assetName, width: centimeters(x), height: centimeters(y), depth: centimeters(z),
        }] }
        return { ...current, layouts }
      })
      if (activeSlot.current === slot) select(id)
      setImportMessage(`Modelo agregado a la distribución ${slot === 0 ? 'A' : 'B'}.`)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'No se pudo importar el modelo.')
    } finally {
      setImporting(false)
    }
  }

  function remove(id: string) {
    setLayout(current => ({ ...current, items: current.items.filter(item => item.id !== id) }))
    select(null)
  }

  return <>
    <header className="masthead"><span className="brand-mark" aria-hidden="true">◩</span><div><strong>Pieza</strong><span>Organizador de habitaciones</span></div></header>
    <main>
      <div className="intro"><h1>Organiza tu pieza</h1><p>Prueba cómo hacer espacio para un escritorio de 120 cm.</p></div>
      <div className="layout-tools">
        <div className="segmented" role="group" aria-label="Distribuciones">
          <button aria-pressed={workspaces.active === 0} onClick={() => switchLayout(0)}>Distribución A</button>
          <button aria-pressed={workspaces.active === 1} onClick={() => switchLayout(1)}>Distribución B</button>
        </div>
        <span className={saved ? 'muted' : 'warning-text'} role="status">{saved ? 'Guardado en este navegador' : 'No se pudo guardar en este navegador'}</span>
      </div>
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
          <section className="model-import">
            <h2>Importar modelo</h2>
            <label className="measure">Archivo 3D (.glb)
              <input type="file" accept=".glb,model/gltf-binary" disabled={importing} aria-describedby="import-hint"
                onChange={event => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void importFile(file)
                }} />
            </label>
            <small id="import-hint">GLB autocontenido de hasta 10 MB.</small>
            <p className="muted" role="status">{importMessage}</p>
          </section>
          <section className="template-settings">
            <h2>Plantillas</h2>
            <label className="measure">Tipo de habitación
              <select value={templateIndex} onChange={event => { setTemplateIndex(Number(event.target.value)); setConfirmTemplate(false) }}>
                {templates.map((template, index) => <option key={template.name} value={index}>{template.name}</option>)}
              </select>
            </label>
            {confirmTemplate ? <>
              <p className="muted" role="status">Se reemplazará la distribución {workspaces.active === 0 ? 'A' : 'B'}.</p>
              <button className="template-load" onClick={applyTemplate}>Confirmar reemplazo</button>
              <button className="template-load" onClick={() => setConfirmTemplate(false)}>Cancelar</button>
            </> : <button className="template-load" onClick={() => setConfirmTemplate(true)}>Cargar plantilla</button>}
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
            {view === 'plan' ? <Plan issues={issues} layout={layout} selected={selected} select={select} move={move} /> :
              <Suspense fallback={<p>Cargando vista 3D…</p>}><Scene move={move} issues={issues} layout={layout} selected={selected} select={select} /></Suspense>}
          </div>
          <div className="work-footer"><span>{view === 'plan' ? 'Arrastra un mueble o muévelo con las flechas.' : 'Arrastra un mueble para moverlo o el fondo para girar. Usa la rueda para acercarte.'}</span><span role="status" className={issues.size ? 'warning-text' : undefined}>{issues.size ? `${issues.size} con avisos · ` : ''}{items.length} {items.length === 1 ? 'mueble' : 'muebles'}</span></div>
        </section>
        <aside className="sidebar inspector" aria-label="Medidas del mueble">
          <section>
            <h2>Medidas del mueble</h2>
            {active ? <div key={active.id}>
              <div className="selected-item"><span className="catalog-icon" style={{ backgroundColor: catalog[active.kind].color }}><FurnitureIcon kind={active.kind} /></span><div><h3>{furnitureName(active)}</h3><small>{active.rotation}° de giro</small></div></div>
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
              <div className="clearance" aria-live="polite">
                {activeStatus?.clearance ? <p>Pared {activeStatus.clearance.wall} <strong>{activeStatus.clearance.distance} cm</strong></p> :
                  <p className="warning-text">Fuera de la habitación</p>}
                {!!activeStatus?.collisions.length && <p className="warning-text">Se superpone con {activeStatus.collisions.map(item => furnitureName(item).toLowerCase()).join(', ')}.</p>}
              </div>
              <div className="item-actions">
                <button className="rotate" onClick={() => edit(active.id, { rotation: ((active.rotation + 90) % 360) as Furniture['rotation'] })}><span aria-hidden="true">↻</span> Girar 90°</button>
                <button className="remove" onClick={() => remove(active.id)}>Eliminar</button>
              </div>
            </div> : <p className="muted empty">Selecciona un mueble en la planta o en la vista 3D.</p>}
          </section>
          {items.length > 0 && <section className="item-list"><h3>En esta pieza</h3>
            <ul>{items.map(item => <li key={item.id}><button aria-pressed={selected === item.id} onClick={() => select(item.id)}>
              <span className="swatch" style={{ backgroundColor: catalog[item.kind].color }} />{furnitureName(item)}
            </button></li>)}</ul>
          </section>}
        </aside>
      </div>
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
