import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { addProtocol, setWorkerUrl } from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { BOUNDS, errorMessage, inZone, OUT_OF_ZONE, track, TRACK_OFF } from './locate.js'
import { arrowHtml, arrowsAlong } from './arrows.js'
import { laneUnits, offsetPath } from './lanes.js'
import { esc, infoHtml } from './info.js'
import museos from './museos-info.json' // ficha de cada parada (scripts/build-info.mjs)
import { BOLT_URL, boltTarget, destinoTexto, googleMapsUrl, uberUrl, wazeUrl } from './links.js'
import { spread } from './spread.js'
import { coreBounds, pinSize } from './view.js'
import { effectiveTheme, otherTheme, THEME_KEY } from './theme.js'
import { buildStyle, FALLBACK_STYLE, SOURCE } from './basemap.js'
import { registerWorker, saveTiles, shouldAutoSave, tilesSaved, TILES_MB } from './offline.js'
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
  const gl = useRef(null) // capa MapLibre (mapa base)
  // Tema: elección guardada (o el sistema). index.html ya puso data-theme antes del primer pintado para evitar el destello claro.
  const [pref, setPref] = useState(() => { try { return localStorage.getItem(THEME_KEY) } catch { return null } })
  const [sysDark, setSysDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const theme = effectiveTheme(pref, sysDark)
  const [hint, setHint] = useState(() => { try { return !localStorage.getItem('ndm-hint') } catch { return true } }) // pista de primera visita

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const f = (e) => setSysDark(e.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  function toggleTheme() {
    const next = otherTheme(theme)
    setPref(next)
    try { localStorage.setItem(THEME_KEY, next) } catch { /* sin almacenamiento: vale solo esta sesión */ }
  }
  // Elegir ruta (o "Todas"); la primera ruta elegida retira la pista de bienvenida
  const pick = (v) => { setSel(v); if (v !== 'ALL') dismissHint() }
  function dismissHint() {
    setHint(false)
    try { localStorage.setItem('ndm-hint', '1') } catch { /* igual */ }
  }
  // Estados: mapa cargando, conexión, mapa de respaldo y descarga del mapa para uso sin conexión
  const [ready, setReady] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [fallback, setFallback] = useState(false)
  const [off, setOff] = useState({ s: 'unsupported', pct: 0 }) // s: unsupported | idle | saving | saved | error
  const [flash, setFlash] = useState(false) // "Mapa guardado" visible unos segundos
  useEffect(() => {
    const on = () => setOnline(true), offl = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', offl)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', offl) }
  }, [])
  async function startSave() {
    setOff({ s: 'saving', pct: 0 })
    try {
      const ok = await saveTiles((got, total) => setOff({ s: 'saving', pct: total ? Math.min(99, Math.round((got / total) * 100)) : 0 }))
      setOff({ s: ok ? 'saved' : 'error', pct: 100 })
      if (ok) setFlash(true)
    } catch { setOff({ s: 'error', pct: 0 }) }
  }
  useEffect(() => {
    (async () => {
      if (!(await registerWorker())) return // desarrollo o sin service worker: no hay modo sin conexión
      if (await tilesSaved()) return setOff({ s: 'saved', pct: 100 })
      if (shouldAutoSave(navigator.connection)) startSave() // Wi-Fi o cable: se guarda sola
      else setOff({ s: 'idle', pct: 0 }) // datos móviles o red desconocida: se pide permiso
    })()
  }, [])
  useEffect(() => { if (flash) { const t = setTimeout(() => setFlash(false), 6000); return () => clearTimeout(t) } }, [flash])

  useEffect(() => { if (hint) { const t = setTimeout(() => setHint(false), 12000); return () => clearTimeout(t) } }, [hint])

  useEffect(() => {
    // maxBounds = zona de las teselas propias (public/asuncion.pmtiles); fuera de ella no hay mapa base
    map.current = L.map(mapEl.current, { zoomControl: false, minZoom: 10, maxZoom: 19, maxBounds: BOUNDS }).setView([-25.2867, -57.6333], 14)
    // Zoom arriba a la izquierda en escritorio; en pantallas táctiles abajo a la izquierda (los popups ocupan casi todo el ancho y lo tapaban)
    L.control.zoom({ position: window.matchMedia('(pointer: coarse)').matches ? 'bottomleft' : 'topleft' }).addTo(map.current)
    gl.current = L.maplibreGL({ style: buildStyle(location.origin, theme) }).addTo(map.current)
    // Respaldo: si las teselas propias fallan (no cargan o error de red), cambiar a OpenFreeMap una sola vez
    const glMap = gl.current.getMaplibreMap()
    glMap.__theme = theme
    glMap.once('idle', () => setReady(true)) // primer dibujo completo del mapa base
    glMap.on('error', (e) => {
      if (e.sourceId !== SOURCE || glMap.__fallback) return
      glMap.__fallback = true
      setFallback(true)
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
    // Bolt no tiene enlace universal: se intenta abrir la app con el destino (Android: intent al paquete; iOS: esquema taxify://) con respaldo a bolt.eu.
    // Además se copia el destino por si la app abre sin él. En computadora se abre bolt.eu (el <a> normal).
    map.current.on('popupopen', (e) => {
      for (const el of e.popup.getElement()?.querySelectorAll('a[data-bolt]') ?? []) {
        if (el.dataset.bound) continue
        el.dataset.bound = '1'
        el.addEventListener('click', (ev) => {
          const { lat, lon, name, copy } = el.dataset
          navigator.clipboard?.writeText(copy).then(() => setMsg(`Destino copiado por si Bolt no lo trae: “${copy}”.`), () => {})
          const t = boltTarget(navigator.userAgent, lat, lon, name)
          if (t.url === BOLT_URL) return // computadora: el enlace abre bolt.eu en pestaña nueva
          ev.preventDefault()
          window.location.href = t.url
          if (t.appScheme) setTimeout(() => { if (!document.hidden) window.location.href = BOLT_URL }, 1800) // iOS sin la app: el esquema no abre nada
        })
      }
    })
    map.current.on('dragstart', () => send('drag')) // si la persona mueve el mapa, deja de acompañarla
    return () => map.current.remove()
  }, [])

  useEffect(() => {
    const g = gl.current?.getMaplibreMap()
    if (!g || g.__fallback || g.__theme === theme) return
    g.__theme = theme
    g.setStyle(buildStyle(location.origin, theme))
  }, [theme])

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
        const size = pinSize(sel === 'ALL', !!s.swap, map.current.getZoom())
        const icon = pinIcon(s, r, size, sel === 'ALL')
        const also = (routes[k] && s.also.filter((x) => x !== k).join(', ')) || ''
        const marker = L.marker([s.lat, s.lon], { icon })
          .bindPopup(`<b>${s.nombre}</b><br>Ruta ${k} · parada ${s.orden}${s.swap || s.cierra ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${s.swap ? pillHtml('swap', `⇄ Intercambiador: Ruta ${s.swap.join(' ↔ ')}`) : ''}${s.cierra ? pillHtml('time', `Hasta las ${s.cierra}`) : ''}</div>` : ''}${also ? `<br>También en: ${also}` : ''}${s.approx ? '<br><i>Ubicación aproximada (calle)</i>' : ''}${museos[s.nombre] ? infoHtml(museos[s.nombre]) : ''}<div class="navgrp"><span class="navlbl">Llegar</span><div class="navrow">${navLink(googleMapsUrl(s.lat, s.lon), 'Google Maps')}${navLink(wazeUrl(s.lat, s.lon), 'Waze')}</div></div><div class="navgrp"><span class="navlbl">Pedir viaje</span><div class="navrow">${navLink(uberUrl(s.lat, s.lon, s.nombre), 'Uber')}${navLink(BOLT_URL, 'Bolt', `data-bolt="1" data-lat="${s.lat}" data-lon="${s.lon}" data-name="${esc(s.nombre)}" data-copy="${esc(destinoTexto(s.nombre, museos[s.nombre]?.direccion))}"`)}</div></div>`, { minWidth: 240, maxWidth: 300, autoPanPaddingTopLeft: [12, 64], autoPanPaddingBottomRight: [12, 112] })
          .addTo(g)
        pins.current.push({ id: `${k}-${s.orden}`, marker, ll: [s.lat, s.lon], size, s, r })
      }
    }
    // "Todas" encuadra el centro (donde está casi todo); las rutas de Lambaré, San Lorenzo y Areguá quedan a un gesto. Una ruta: todas sus paradas.
    const fit = sel === 'ALL' ? coreBounds(bounds.map(([lat, lon]) => ({ lat, lon }))) ?? bounds : bounds
    if (fit.length) map.current.fitBounds(fit, { padding: [40, 40] })
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
        for (const p of arrowsAlong(pts, all ? 240 : 160, view)) {
          const icon = L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], html: arrowHtml(r.color, size, p.angle) })
          L.marker(m.unproject([p.x, p.y], z), { icon, interactive: false, keyboard: false, zIndexOffset: -1000 }).addTo(arrows)
        }
      }
    }
    // Paradas que se tapan entre sí (en este zoom): se separan y una línea guía marca su ubicación real
    const declutter = () => {
      const z = m.getZoom()
      for (const p of pins.current) { // a zoom bajo en "Todas" las paradas son puntos; al acercar vuelven a ser pines
        const want = pinSize(all, !!p.s.swap, z)
        if (want !== p.size) { p.size = want; p.marker.setIcon(pinIcon(p.s, p.r, want, all)) }
      }
      const orig = pins.current.map((p) => m.project(p.ll, z))
      const out = spread(pins.current.map((p, i) => ({ ...orig[i], r: p.size / 2 })))
      leaders.clearLayers()
      pins.current.forEach((p, i) => {
        const ll = m.unproject([out[i].x, out[i].y], z)
        p.marker.setLatLng(ll) // setLatLng mantiene abierto el popup de esa parada
        if (Math.hypot(out[i].x - orig[i].x, out[i].y - orig[i].y) > 3) L.polyline([p.ll, ll], { color: theme === 'dark' ? '#cbd5e1' : '#334155', weight: 1.5, opacity: 0.85, interactive: false }).addTo(leaders)
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
  }, [shown, sel, theme])

  return (
    <div className="flex h-full flex-col md:flex-row">
      <aside className={`z-[1000] flex flex-col bg-white shadow-lg dark:bg-slate-900 md:w-80 ${open ? 'h-[72%]' : 'h-auto'} md:h-full`}>
        <header className="flex items-center justify-between gap-3 bg-ndm-navy px-3 py-3 text-white">
          <div className="min-w-0">
            <h1 className="sr-only">Noche de los Museos 2026 · Mapa de rutas</h1>
            <img src="/ndm-2026-logo.png" alt="" width="104" height="48" className="h-12 w-auto" />
            <p className="mt-1 text-[13px] font-normal tracking-wide text-ndm-sky">Rutas · 7 de noviembre · 18 h</p>
          </div>
          <button className="shrink-0 rounded-full border border-white/70 px-4 py-1 text-sm font-semibold pointer-coarse:min-h-11 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Ocultar' : 'Rutas'}
          </button>
        </header>
        <div className={`${open ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col md:flex`}>
          <div className="flex gap-2 overflow-x-auto p-3 [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
            <Chip active={sel === 'ALL'} ink="#001e47" night="#e2e8f0" onClick={() => pick('ALL')}>Todas</Chip>
            {keys.map((k) => (
              <Chip key={k} active={sel === k} ink={routes[k].ink} night={routes[k].night} onClick={() => pick(k)}>{k}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 pb-2 text-[13px] text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1"><Pill kind="swap">⇄ A ↔ B</Pill> cambio de ruta</span>
            <span className="flex items-center gap-1"><Pill kind="time">Hasta las 22:00</Pill> cierra antes</span>
            <span className="flex items-center gap-1"><span aria-hidden="true" className="text-base leading-none text-slate-700 dark:text-slate-200">➤</span> sentido del recorrido</span>
          </div>
          <ol className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 text-sm">
            {shown.map((k) => (
              <li key={k} className="mb-3">
                <p className="mb-1 font-semibold text-(color:--ink) dark:text-(color:--night)" style={{ '--ink': routes[k].ink, '--night': routes[k].night }}>Ruta {k} · {routes[k].stops.length} paradas{routes[k].path && ` · ${fmt(routes[k].path)}`}</p>
                <ol className="space-y-1">
                  {routes[k].stops.map((s) => (
                    <li key={s.orden}>
                      <button
                        className="flex w-full items-start gap-1.5 rounded px-1 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800 pointer-coarse:min-h-11 pointer-coarse:items-center pointer-coarse:py-2"
                        onClick={() => openStop(k, s)}
                      >
                        <span className="w-6 shrink-0 pt-px text-right font-mono text-slate-500 dark:text-slate-400">{s.orden}.</span>
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
                  <details className="mt-1 text-slate-500 dark:text-slate-400">
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
        <footer className={`${open ? 'block' : 'hidden'} border-t px-3 py-2 text-xs leading-4 text-slate-500 dark:border-slate-700 dark:text-slate-400 md:block`}>
          Mapa no oficial. Datos de la{' '}
          <a className="underline" href="https://www.nochedemuseos.org.py" target="_blank" rel="noreferrer">Asociación Noche de los Museos</a>.
          {off.s === 'saved' && <span className="block">Mapa guardado para usar sin conexión.</span>}
        </footer>
      </aside>
      <div className="relative min-h-0 flex-1">
        <main ref={mapEl} className="h-full" aria-label="Mapa de rutas" />
        <button
          onClick={toggleTheme}
          aria-label="Modo noche"
          aria-pressed={theme === 'dark'}
          className="absolute right-3 top-3 z-[1000] grid h-11 w-11 place-items-center rounded-full bg-white text-ndm-navy shadow-lg dark:bg-slate-800 dark:text-slate-100"
        >
          {theme === 'dark' ? <Icon d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /> : <Icon d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />}
        </button>
        <div className="absolute left-3 right-16 top-3 z-[1000] flex flex-col items-start gap-2 md:left-1/2 md:right-auto md:-translate-x-1/2 md:items-center">
          {hint && sel === 'ALL' && (
            <div role="note" className="flex items-center justify-between gap-2 rounded-full bg-ndm-navy py-1.5 pl-4 pr-1.5 text-[13px] text-white shadow-lg">
              <span><span className="md:hidden">Tocá «Rutas» y elegí un recorrido</span><span className="hidden md:inline">Elegí una ruta para ver su recorrido y sus paradas</span></span>
              <button onClick={dismissHint} aria-label="Cerrar aviso" className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-white/15 pointer-coarse:h-11 pointer-coarse:w-11">
                <Icon d="M6 6l12 12M18 6L6 18" />
              </button>
            </div>
          )}
          <div role="status" aria-live="polite" className="flex flex-col items-start gap-2 md:items-center">
            {!ready && <StatusPill><span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" />Cargando mapa…</StatusPill>}
            {!online && <StatusPill>{off.s === 'saved' ? 'Sin conexión · usando el mapa guardado' : 'Sin conexión · el mapa puede no cargar'}</StatusPill>}
            {fallback && <StatusPill>Mapa de respaldo (OpenFreeMap)</StatusPill>}
          </div>
        </div>
        <div className="absolute bottom-8 right-3 z-[1000] flex max-w-[16rem] flex-col items-end gap-2">
          {off.s === 'idle' && online && (
            <button onClick={startSave} className="rounded-2xl bg-white px-3 py-2 text-left text-xs font-semibold text-ndm-navy shadow-lg pointer-coarse:min-h-11 dark:bg-slate-800 dark:text-slate-100">
              Guardar mapa sin conexión ({TILES_MB} MB)
            </button>
          )}
          {off.s === 'saving' && (
            <div className="w-56 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-ndm-navy shadow-lg dark:bg-slate-800 dark:text-slate-100">
              Guardando mapa… {off.pct ? `${off.pct} %` : ''}
              <progress className="mt-1 block h-1.5 w-full" max="100" value={off.pct || undefined} aria-label="Guardando el mapa para usar sin conexión" />
            </div>
          )}
          {off.s === 'error' && (
            <button onClick={startSave} className="rounded-2xl bg-white px-3 py-2 text-left text-xs font-semibold text-ndm-navy shadow-lg pointer-coarse:min-h-11 dark:bg-slate-800 dark:text-slate-100">
              No se pudo guardar el mapa. Reintentar
            </button>
          )}
          {off.s === 'saved' && flash && <p className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-ndm-navy shadow-lg dark:bg-slate-800 dark:text-slate-100">Mapa guardado: funciona sin conexión</p>}
          {msg && <p role="status" className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700 shadow-lg dark:bg-slate-800 dark:text-slate-100">{msg}</p>}
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

// Pin de una parada: número (una ruta), punto o ⇄ (todas). Los pines de menos de 18 px no llevan número ni aro grueso.
const pinIcon = (s, r, size, all) => L.divIcon({
  className: '',
  iconSize: [size, size],
  html: `<div class="pin${s.swap ? ' swap' : ''}" style="width:${size}px;height:${size}px;font-size:${size < 18 ? 10 : 12}px;background:${s.approx ? '#fff' : r.ink};color:${s.approx ? r.ink : '#fff'};border:${size < 12 ? 1.5 : 2}px ${s.approx ? 'dashed' : 'solid'} ${r.ink}">${all ? (s.swap ? '⇄' : '') : s.orden}</div>`,
})

const BTN = 'flex items-center gap-2 rounded-full bg-ndm-navy px-4 py-3 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-ndm-navy'

// attrs (opcional): atributos HTML ya escapados (Bolt lo usa para su comportamiento propio, ver popupopen)
const navLink = (href, text, attrs = '') => `<a class="navpill" href="${href}" target="_blank" rel="noopener noreferrer" ${attrs}>${text}</a>`

const fmt = (p) => `${(p.distance / 1000).toFixed(1)} km · ${Math.round(p.duration / 60)} min en bus`

const PILL = {
  swap: { cls: 'bg-yellow-100 text-yellow-900 ring-yellow-400', css: 'background:#fef9c3;color:#713f12;border-color:#facc15' },
  time: { cls: 'bg-slate-100 text-slate-700 ring-slate-300', css: 'background:#f1f5f9;color:#334155;border-color:#cbd5e1' },
}
const pillHtml = (kind, text) => `<span style="${PILL[kind].css};border:1px solid;border-radius:9999px;padding:1px 8px;font:600 12px/1.5 system-ui;white-space:nowrap">${text}</span>`
function Pill({ kind, title, children }) {
  return <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2 py-px text-xs font-semibold leading-5 ring-1 ring-inset ${PILL[kind].cls}`}>{children}</span>
}

// Íconos SVG de una sola familia (trazo 2, estilo Lucide)
function StatusPill({ children }) {
  return <p className="flex items-center gap-2 rounded-full bg-slate-800/90 px-3 py-1.5 text-[13px] text-white shadow-lg">{children}</p>
}

function Icon({ d }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  )
}

// ink = color con contraste AA sobre blanco (texto, relleno activo); night = tono claro para texto y borde sobre fondo oscuro
function Chip({ active, ink, night, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{ '--ink': ink, '--night': night }}
      className={`shrink-0 rounded-full border-2 border-(color:--ink) px-3 py-1 text-sm font-semibold pointer-coarse:min-h-11 pointer-coarse:min-w-11 dark:border-(color:--night) ${active ? 'bg-(--ink) text-white' : 'bg-white text-(color:--ink) dark:bg-slate-900 dark:text-(color:--night)'}`}
    >
      {children}
    </button>
  )
}
