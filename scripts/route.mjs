// app/src/data.json -> app/src/routes-geo.json: ruta por calles siguiendo el orden de las paradas ubicadas.
// Rutas pensadas para bus del evento: perfil auto (calles transitables y sentidos de circulación). Motor: OSRM (routing.openstreetmap.de). Uso: node scripts/route.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://routing.openstreetmap.de'
export const profileFor = () => 'car' // ponytail: bus = auto; sin paradas de bus ni tiempos de detención

// Circuito: la última parada vuelve a la primera (salida y regreso del bus)
export const loop = (stops) => (stops.length > 1 ? [...stops, stops[0]] : stops)

export function url(stops, profile) {
  const c = stops.map((s) => `${s.lon},${s.lat}`).join(';')
  return `${BASE}/routed-${profile}/route/v1/driving/${c}?overview=full&geometries=geojson&steps=false`
}

// El servidor público falla a veces (timeouts): 4 intentos con espera creciente
export async function getJson(u, tries = 4, wait = 2000, f = fetch) {
  for (let i = 1; ; i++) {
    try { return await f(u, { signal: AbortSignal.timeout(20000) }).then((r) => r.json()) }
    catch (e) { if (i >= tries) throw e; await new Promise((r) => setTimeout(r, wait * i)) }
  }
}

export async function routeFor(stops, profile, get = getJson) {
  if (stops.length < 2) return null
  const j = await get(url(stops, profile))
  if (j.code !== 'Ok') throw new Error(`OSRM ${j.code}: ${j.message ?? ''}`)
  const r = j.routes[0]
  return {
    profile,
    distance: Math.round(r.distance), // metros
    duration: Math.round(r.duration), // segundos
    geometry: r.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    legs: r.legs.map((l, i) => ({ from: stops[i].orden, to: stops[i + 1].orden, distance: Math.round(l.distance), duration: Math.round(l.duration) })),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { routes } = JSON.parse(readFileSync('app/src/data.json', 'utf8'))
  const out = {}
  for (const [k, stops] of Object.entries(routes)) {
    out[k] = await routeFor(loop(stops), profileFor(k))
    if (out[k]) console.log(k, out[k].profile, `${(out[k].distance / 1000).toFixed(1)} km`, `${Math.round(out[k].duration / 60)} min`, `${stops.length} paradas`)
    await new Promise((r) => setTimeout(r, 1000))
  }
  writeFileSync('app/src/routes-geo.json', JSON.stringify(out))
}
