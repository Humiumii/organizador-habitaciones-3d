import { lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { example } from './model'
import { Plan } from './Plan'
import './style.css'

const Scene = lazy(() => import('./Scene'))

function App() {
  const [layout] = useState(example)
  const [selected, select] = useState<string | null>('cama')
  const [view, setView] = useState<'plan' | '3d'>('plan')
  return <>
    <header className="masthead"><span className="brand-mark" aria-hidden="true">◩</span><div><strong>Pieza</strong><span>Organizador de habitaciones</span></div></header>
    <main>
      <div className="intro"><h1>Organiza tu pieza</h1><p>Prueba cómo hacer espacio para un escritorio de 120 cm.</p></div>
      <section className="workspace" aria-label="Espacio de trabajo">
        <div className="toolbar"><h2>Habitación</h2><div className="segmented" aria-label="Vista">
          <button aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Planta</button>
          <button aria-pressed={view === '3d'} onClick={() => setView('3d')}>Vista 3D</button>
        </div></div>
        <div className="drawing">
          {view === 'plan' ? <Plan layout={layout} selected={selected} select={select} /> :
            <Suspense fallback={<p>Cargando vista 3D…</p>}><Scene layout={layout} selected={selected} select={select} /></Suspense>}
        </div>
        <div className="work-footer">{view === 'plan' ? 'Selecciona un mueble en la planta.' : 'Arrastra para girar la cámara. Usa la rueda para acercarte.'}</div>
      </section>
    </main>
  </>
}

createRoot(document.getElementById('root')!).render(<App />)
