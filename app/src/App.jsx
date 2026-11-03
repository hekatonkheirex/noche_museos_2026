import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { routes } from './routes.js'

export default function App() {
  const [sel, setSel] = useState('ALL') // 'ALL' o letra de ruta
  const [open, setOpen] = useState(false) // panel en móvil
  const mapEl = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const keys = Object.keys(routes)

  useEffect(() => {
    map.current = L.map(mapEl.current, { zoomControl: true }).setView([-25.2867, -57.6333], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => map.current.remove()
  }, [])

  const shown = useMemo(() => (sel === 'ALL' ? keys : [sel]), [sel])

  useEffect(() => {
    const g = layer.current
    g.clearLayers()
    const bounds = []
    for (const k of shown) {
      const r = routes[k]
      const pts = r.stops.map((s) => [s.lat, s.lon])
      bounds.push(...pts)
      L.polyline(r.path?.geometry ?? pts, { color: r.color, weight: sel === 'ALL' ? 3 : 5, opacity: sel === 'ALL' ? 0.6 : 0.9 }).addTo(g)
      for (const s of r.stops) {
        const size = sel === 'ALL' ? (s.swap ? 18 : 12) : 26
        const icon = L.divIcon({
          className: '',
          iconSize: [size, size],
          html: `<div class="pin${s.swap ? ' swap' : ''}" style="width:${size}px;height:${size}px;background:${s.approx ? '#fff' : r.color};color:${s.approx ? r.color : '#fff'};border:2px ${s.approx ? 'dashed' : 'solid'} ${r.color}">${sel === 'ALL' ? (s.swap ? '⇄' : '') : s.orden}</div>`,
        })
        const also = (routes[k] && s.also.filter((x) => x !== k).join(', ')) || ''
        L.marker([s.lat, s.lon], { icon })
          .bindPopup(`<b>${s.nombre}</b><br>Ruta ${k} · parada ${s.orden}${s.swap || s.cierra ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${s.swap ? pillHtml('swap', `⇄ Intercambiador: Ruta ${s.swap.join(' ↔ ')}`) : ''}${s.cierra ? pillHtml('time', `Hasta las ${s.cierra}`) : ''}</div>` : ''}${also ? `<br>También en: ${also}` : ''}${s.approx ? '<br><i>Ubicación aproximada (calle)</i>' : ''}`)
          .addTo(g)
      }
    }
    if (bounds.length) map.current.fitBounds(bounds, { padding: [40, 40] })
  }, [shown, sel])

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className={`z-[1000] flex flex-col bg-white shadow-lg md:w-80 ${open ? 'h-3/5' : 'h-auto'} md:h-full`}>
        <header className="flex items-center justify-between gap-3 bg-ndm-navy px-3 py-3 text-white">
          <div className="min-w-0">
            <img src="/ndm-2026-logo.png" alt="Noche de los Museos 2026" width="104" height="48" className="h-12 w-auto" />
            <h1 className="mt-1 text-xs font-light tracking-wide text-ndm-sky">Rutas · 7 de noviembre · 18 h</h1>
          </div>
          <button className="shrink-0 rounded-full border border-white/70 px-3 py-1 text-sm font-semibold md:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Ocultar' : 'Rutas'}
          </button>
        </header>
        <div className={`${open ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col md:flex`}>
          <div className="flex flex-wrap gap-2 p-3">
            <Chip active={sel === 'ALL'} color="#001e47" onClick={() => setSel('ALL')}>Todas</Chip>
            {keys.map((k) => (
              <Chip key={k} active={sel === k} color={routes[k].color} onClick={() => setSel(k)}>{k}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2 text-xs text-slate-600">
            <span className="flex items-center gap-1"><Pill kind="swap">⇄ A ↔ B</Pill> cambio de ruta</span>
            <span className="flex items-center gap-1"><Pill kind="time">Hasta las 22:00</Pill> cierra antes</span>
          </div>
          <ol className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 text-sm">
            {shown.map((k) => (
              <li key={k} className="mb-3">
                <p className="mb-1 font-semibold" style={{ color: routes[k].color }}>Ruta {k} · {routes[k].stops.length} paradas{routes[k].path && ` · ${fmt(routes[k].path)}`}</p>
                <ol className="space-y-1">
                  {routes[k].stops.map((s) => (
                    <li key={s.orden}>
                      <button
                        className="flex w-full items-start gap-1.5 rounded px-1 py-1 text-left hover:bg-slate-100"
                        onClick={() => map.current.flyTo([s.lat, s.lon], 17)}
                      >
                        <span className="w-6 shrink-0 pt-px text-right font-mono text-slate-500">{s.orden}.</span>
                        <span className="min-w-0">
                          {s.nombre}{s.approx && <span title="Ubicación aproximada"> ≈</span>}
                          {(s.swap || s.cierra) && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {s.swap && <Pill kind="swap" title="Intercambiador: podés cambiar de ruta acá">⇄ Ruta {s.swap.join(' ↔ ')}</Pill>}
                              {s.cierra && <Pill kind="time" title="Cierra antes que el resto">Hasta las {s.cierra}</Pill>}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                {routes[k].pending.length > 0 && (
                  <details className="mt-1 text-slate-500">
                    <summary className="cursor-pointer">{routes[k].pending.length} sin ubicación en el mapa</summary>
                    <ul className="ml-4 list-disc">
                      {routes[k].pending.map((s) => <li key={s.orden}>{s.orden}. {s.nombre}</li>)}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </div>
        <footer className={`${open ? 'block' : 'hidden'} border-t px-3 py-2 text-[11px] leading-4 text-slate-500 md:block`}>
          Mapa no oficial. Datos de la{' '}
          <a className="underline" href="https://www.nochedemuseos.org.py" target="_blank" rel="noreferrer">Asociación Noche de los Museos</a>.
        </footer>
      </aside>
      <main ref={mapEl} className="min-h-0 flex-1" aria-label="Mapa de rutas" />
    </div>
  )
}

const fmt = (p) => `${(p.distance / 1000).toFixed(1)} km · ${Math.round(p.duration / 60)} min en bus`

const PILL = {
  swap: { cls: 'bg-yellow-100 text-yellow-900 ring-yellow-400', css: 'background:#fef9c3;color:#713f12;border-color:#facc15' },
  time: { cls: 'bg-slate-100 text-slate-700 ring-slate-300', css: 'background:#f1f5f9;color:#334155;border-color:#cbd5e1' },
}
const pillHtml = (kind, text) => `<span style="${PILL[kind].css};border:1px solid;border-radius:9999px;padding:1px 7px;font:600 11px/1.5 system-ui;white-space:nowrap">${text}</span>`
function Pill({ kind, title, children }) {
  return <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2 py-px text-[11px] font-semibold leading-5 ring-1 ring-inset ${PILL[kind].cls}`}>{children}</span>
}

function Chip({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border-2 px-3 py-1 text-sm font-semibold"
      style={{ borderColor: color, background: active ? color : '#fff', color: active ? '#fff' : color }}
    >
      {children}
    </button>
  )
}
