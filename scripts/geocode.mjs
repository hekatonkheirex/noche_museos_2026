// Geocodifica los lugares únicos del CSV con Nominatim (OSM). Uso: node scripts/geocode.mjs
// Salida: scripts/geocoded.json { "<ubicación>": {lat,lon,display} | null }. Reanuda si ya existe.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { parseCsv } from './csv.mjs'

const rows = parseCsv(readFileSync('noche_museos_2026_mymaps.csv', 'utf8'))
const out = existsSync('scripts/geocoded.json') ? JSON.parse(readFileSync('scripts/geocoded.json', 'utf8')) : {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// Asunción y Areguá caben en este recuadro (lon_min,lat_max,lon_max,lat_min)
const VIEWBOX = '-57.75,-25.10,-57.35,-25.40'

async function q(text, bounded) {
  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.search = new URLSearchParams({ q: text, format: 'jsonv2', limit: '1', viewbox: VIEWBOX, bounded: bounded ? '1' : '0', countrycodes: 'py' })
  const r = await fetch(u, { headers: { 'User-Agent': 'noche-museos-2026-map/1.0 (yuugen85@gmail.com)' } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const j = await r.json()
  return j[0] ? { lat: +j[0].lat, lon: +j[0].lon, display: j[0].display_name } : null
}

for (const loc of [...new Set(rows.map((r) => r['Ubicación para buscar']))]) {
  if (out[loc]) continue // ponytail: los MISS (null) se reintentan en cada corrida
  const name = loc.split(',')[0]
  const city = loc.split(',')[1]?.trim() ?? 'Asunción'
  let hit = null
  // variantes: nombre completo, sin ciudad, sin sufijos tras "Museo/Centro X", y marca corta
  const short = name.replace(/^(Museo|Centro Cultural|Fundación|Casa Bicentenario) (de la |del |de los |de las |de )?/i, '')
  for (const t of [loc, `${name}, ${city}`, name, `${short}, ${city}`, short]) {
    hit = await q(t, true).catch(() => null)
    await sleep(1100)
    if (hit) break
  }
  out[loc] = hit
  console.log(hit ? 'OK  ' : 'MISS', loc)
  writeFileSync('scripts/geocoded.json', JSON.stringify(out, null, 1))
}
