import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { addProtocol, setWorkerUrl } from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { BOUNDS, errorMessage, inZone, OUT_OF_ZONE, track, TRACK_OFF } from './locate.js'
import { arrowHtml, arrowsAlong } from './arrows.js'
import { laneUnits, offsetPath } from './lanes.js'
import { esc, infoHtml } from './info.js'
import museos from './museos-info.json' // ficha de cada parada (scripts/build-info.mjs)
import { BOLT_URL, destinoTexto, googleMapsUrl, uberUrl, wazeUrl } from './links.js'
import { spread } from './spread.js'
import { buildStyle, FALLBACK_STYLE, SOURCE } from './basemap.js'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import '@maplibre/maplibre-gl-leaflet'
import { routes } from './routes.js'

setWorkerUrl(workerUrl) // Vite no resuelve solo el worker de MapLibre 6
addProtocol('pmtiles', new Protocol().tile)

export default function App() {
  const [sel, setSel] = useState('ALL') // 'ALL' o letra de ruta
  const [open, setOpen] = useState(false) // panel en móvil
  const mapEl = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const lineLayer = useRef(null) // líneas de las rutas
  const leaderLayer = useRef(null) // líneas guía de cada parada desplazada a su ubicación real
  const pins = useRef([]) // paradas dibujadas: { marker, ll, size }
  const pendingOpen = useRef(null) // id de la parada cuyo popup se abre al terminar el vuelo
  const arrowLayer = useRef(null) // flechas de sentido
  const me = useRef(null) // marcador de "dónde estoy"
  const [msg, setMsg] = useState('') // aviso de ubicación
  const [tr, setTr] = useState(TRACK_OFF) // seguimiento: { mode: off|wait|on, follow }
  const trRef = useRef(TRACK_OFF) // misma info para los eventos del mapa (se registran una sola vez)
  const last = useRef(null) // última posición dentro de la zona
  const outShown = useRef(false) // avisar "fuera de zona" una vez, no en cada posición
  const send = (ev) => { trRef.current = track(trRef.current, ev); setTr(trRef.current) }
  const keys = Object.keys(routes)

  useEffect(() => {
    // maxBounds = zona de las teselas propias (public/asuncion.pmtiles); fuera de ella no hay mapa base
    map.current = L.map(mapEl.current, { zoomControl: true, minZoom: 10, maxZoom: 19, maxBounds: BOUNDS }).setView([-25.2867, -57.6333], 14)
    const gl = L.maplibreGL({ style: buildStyle(location.origin) }).addTo(map.current)
    // Respaldo: si las teselas propias fallan (no cargan o error de red), cambiar a OpenFreeMap una sola vez
    const glMap = gl.getMaplibreMap()
    glMap.on('error', (e) => {
      if (e.sourceId !== SOURCE || glMap.__fallback) return
      glMap.__fallback = true
      console.warn('Teselas propias fallaron, usando OpenFreeMap', e.error)
      glMap.setStyle(FALLBACK_STYLE)
    })
    layer.current = L.layerGroup().addTo(map.current)
    lineLayer.current = L.layerGroup().addTo(map.current)
    leaderLayer.current = L.layerGroup().addTo(map.current)
    arrowLayer.current = L.layerGroup().addTo(map.current)
    me.current = L.layerGroup().addTo(map.current)
    map.current.on('locationfound', (e) => {
      const first = trRef.current.mode === 'wait'
      send('fix')
      me.current.clearLayers()
      if (!inZone(e.latlng.lat, e.latlng.lng)) {
        last.current = null
        if (!outShown.current) setMsg(OUT_OF_ZONE)
        outShown.current = true
        return
      }
      outShown.current = false
      last.current = e.latlng
      L.circle(e.latlng, { radius: e.accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.12, interactive: false }).addTo(me.current)
      L.circleMarker(e.latlng, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).bindTooltip('Estás acá').addTo(me.current)
      if (!trRef.current.follow) return
      if (first) map.current.flyTo(e.latlng, Math.max(map.current.getZoom(), 16))
      else map.current.panTo(e.latlng)
    })
    map.current.on('locationerror', (e) => {
      if (e.code === 1) { map.current.stopLocate(); send('denied'); return setMsg(errorMessage(1)) }
      // Con el seguimiento activo, los fallos puntuales (señal débil) se ignoran: se conserva la última posición
      if (trRef.current.mode === 'wait') setMsg(errorMessage(e.code))
    })
    // Enlaces con data-copy (Bolt): al tocarlos se copia el destino y se avisa. El enlace se abre igual (comportamiento normal del <a>).
    map.current.on('popupopen', (e) => {
      for (const el of e.popup.getElement()?.querySelectorAll('a[data-copy]') ?? []) {
        if (el.dataset.bound) continue
        el.dataset.bound = '1'
        el.addEventListener('click', async () => {
          const text = el.dataset.copy
          try { await navigator.clipboard.writeText(text); setMsg(`Destino copiado: pegalo en Bolt (“${text}”).`) }
          catch { setMsg(`Escribí este destino en Bolt: ${text}`) }
        })
      }
    })
    map.current.on('dragstart', () => send('drag')) // si la persona mueve el mapa, deja de acompañarla
    return () => map.current.remove()
  }, [])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 8000)
    return () => clearTimeout(t)
  }, [msg])

  function toggleLocate() {
    setMsg('')
    outShown.current = false
    if (tr.mode === 'off') {
      send('toggle')
      map.current.locate({ watch: true, enableHighAccuracy: true, timeout: 60000, maximumAge: 5000, setView: false })
    } else {
      map.current.stopLocate()
      me.current.clearLayers()
      last.current = null
      send('toggle')
    }
  }

  // Desde la lista: acerca el mapa a la parada y abre su popup (con los enlaces para ir)
  // Un solo popup pendiente (no un oyente por clic): clics rápidos en la lista no apilan aperturas sobre vuelos interrumpidos
  function openStop(k, s) {
    pendingOpen.current = `${k}-${s.orden}`
    map.current.flyTo([s.lat, s.lon], 17)
  }

  const shown = useMemo(() => (sel === 'ALL' ? keys : [sel]), [sel])

  useEffect(() => {
    const g = layer.current
    g.clearLayers()
    pins.current = []
    const bounds = []
    for (const k of shown) {
      const r = routes[k]
      const pts = r.stops.map((s) => [s.lat, s.lon])
      bounds.push(...pts)
      for (const s of r.stops) {
        const size = sel === 'ALL' ? (s.swap ? 18 : 12) : 26
        const icon = L.divIcon({
          className: '',
          iconSize: [size, size],
          html: `<div class="pin${s.swap ? ' swap' : ''}" style="width:${size}px;height:${size}px;background:${s.approx ? '#fff' : r.color};color:${s.approx ? r.color : '#fff'};border:2px ${s.approx ? 'dashed' : 'solid'} ${r.color}">${sel === 'ALL' ? (s.swap ? '⇄' : '') : s.orden}</div>`,
        })
        const also = (routes[k] && s.also.filter((x) => x !== k).join(', ')) || ''
        const marker = L.marker([s.lat, s.lon], { icon })
          .bindPopup(`<b>${s.nombre}</b><br>Ruta ${k} · parada ${s.orden}${s.swap || s.cierra ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${s.swap ? pillHtml('swap', `⇄ Intercambiador: Ruta ${s.swap.join(' ↔ ')}`, { maxWidth: 300 }) : ''}${s.cierra ? pillHtml('time', `Hasta las ${s.cierra}`) : ''}</div>` : ''}${also ? `<br>También en: ${also}` : ''}${s.approx ? '<br><i>Ubicación aproximada (calle)</i>' : ''}${museos[s.nombre] ? infoHtml(museos[s.nombre]) : ''}<div style="margin-top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:6px"><span style="font:600 11px system-ui;color:#475569">Cómo llegar</span>${navLink(googleMapsUrl(s.lat, s.lon), 'Google Maps')}${navLink(wazeUrl(s.lat, s.lon), 'Waze')}</div><div style="margin-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:6px"><span style="font:600 11px system-ui;color:#475569">Pedir un viaje</span>${navLink(uberUrl(s.lat, s.lon, s.nombre), 'Uber')}${navLink(BOLT_URL, 'Bolt', destinoTexto(s.nombre, museos[s.nombre]?.direccion))}</div>`)
          .addTo(g)
        pins.current.push({ id: `${k}-${s.orden}`, marker, ll: [s.lat, s.lon], size })
      }
    }
    if (bounds.length) map.current.fitBounds(bounds, { padding: [40, 40] })
  }, [shown, sel])

  // Líneas y flechas: los tramos que comparten calle se reparten en carriles paralelos (lanes.js); se recalcula al cambiar el zoom
  useEffect(() => {
    const m = map.current, lines = lineLayer.current, arrows = arrowLayer.current, leaders = leaderLayer.current
    const all = sel === 'ALL'
    const weight = all ? 3 : 5
    const size = all ? 14 : 20
    const paths = Object.fromEntries(shown.map((k) => [k, routes[k].path?.geometry ?? routes[k].stops.map((s) => [s.lat, s.lon])]))
    const units = laneUnits(paths)
    const draw = () => {
      lines.clearLayers()
      arrows.clearLayers()
      const z = m.getZoom()
      // Solo se dibujan flechas en el área visible (+120 px): a zoom alto el recorrido mide millones de píxeles y colgaba la página
      const pb = m.getPixelBounds()
      const view = { x0: pb.min.x - 120, y0: pb.min.y - 120, x1: pb.max.x + 120, y1: pb.max.y + 120 }
      for (const k of shown) {
        const r = routes[k]
        const pts = offsetPath(paths[k].map((ll) => m.project(ll, z)), units[k], weight + 1)
        L.polyline(pts.map((p) => m.unproject([p.x, p.y], z)), { color: r.color, weight, opacity: all ? 0.7 : 0.9 }).addTo(lines)
        for (const p of arrowsAlong(pts, all ? 120 : 80, view)) {
          const icon = L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: arrowHtml(r.color, size, p.angle) })
          L.marker(m.unproject([p.x, p.y], z), { icon, interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(arrows)
        }
      }
    }
    // Paradas que se tapan entre sí (en este zoom): se separan y una línea guía marca su ubicación real
    const declutter = () => {
      const z = m.getZoom()
      const orig = pins.current.map((p) => m.project(p.ll, z))
      const out = spread(pins.current.map((p, i) => ({ ...orig[i], r: p.size / 2 })))
      leaders.clearLayers()
      pins.current.forEach((p, i) => {
        const ll = m.unproject([out[i].x, out[i].y], z)
        p.marker.setLatLng(ll) // setLatLng mantiene abierto el popup de esa parada
        if (Math.hypot(out[i].x - orig[i].x, out[i].y - orig[i].y) > 3) L.polyline([p.ll, ll], { color: '#334155', weight: 1.5, opacity: 0.85, interactive: false }).addTo(leaders)
      })
    }
    // Una excepción en un oyente de Leaflet aborta a los demás (entre ellos el que sincroniza el mapa base): se atrapan aquí
    const safe = (fn) => () => { try { fn() } catch (e) { console.error(e) } }
    const redraw = safe(() => { draw(); declutter() })
    const openPending = safe(() => {
      const id = pendingOpen.current
      if (!id) return
      pendingOpen.current = null
      const p = pins.current.find((x) => x.id === id)
      if (p?.marker._map) p.marker.openPopup() // solo si el pin sigue en el mapa
    })
    const cancelPending = () => { pendingOpen.current = null } // si la persona arrastra el mapa, el vuelo se cancela: no abrir popups después
    redraw()
    m.on('moveend', redraw) // moveend ocurre tras mover o hacer zoom: con las flechas recortadas a la vista, también al desplazarse
    m.on('moveend', openPending)
    m.on('dragstart', cancelPending)
    return () => { m.off('moveend', redraw); m.off('moveend', openPending); m.off('dragstart', cancelPending) }
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
            <span className="flex items-center gap-1"><span aria-hidden="true" className="text-base leading-none text-slate-700">➤</span> sentido del recorrido</span>
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
                        onClick={() => openStop(k, s)}
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
      <div className="relative min-h-0 flex-1">
        <main ref={mapEl} className="h-full" aria-label="Mapa de rutas" />
        <div className="absolute bottom-8 right-3 z-[1000] flex max-w-[16rem] flex-col items-end gap-2">
          {msg && <p role="status" className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700 shadow-lg">{msg}</p>}
          <div className="flex gap-2">
            {tr.mode === 'on' && !tr.follow && (
              <button className={BTN} onClick={() => { send('center'); if (last.current) map.current.flyTo(last.current, Math.max(map.current.getZoom(), 16)) }}>
                <span aria-hidden="true">⌖</span>Centrar
              </button>
            )}
            <button className={BTN} aria-pressed={tr.mode !== 'off'} onClick={toggleLocate}>
              <span aria-hidden="true">◎</span>{{ off: 'Dónde estoy', wait: 'Buscando… (cancelar)', on: 'Detener seguimiento' }[tr.mode]}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const BTN = 'flex items-center gap-2 rounded-full bg-ndm-navy px-4 py-2.5 text-sm font-semibold text-white shadow-lg'

// copy (opcional): texto que se copia al portapapeles al tocar el enlace (Bolt no admite pre-cargar el destino)
const navLink = (href, text, copy) => `<a href="${href}" target="_blank" rel="noopener noreferrer"${copy ? ` data-copy="${esc(copy)}"` : ''} style="background:#001e47;color:#fff;border-radius:9999px;padding:3px 10px;font:600 11px/1.5 system-ui;text-decoration:none">↗ ${text}</a>`

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
