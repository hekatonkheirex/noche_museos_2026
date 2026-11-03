// Geocodifica scripts/addresses.json (dirección de calle) con Nominatim -> scripts/addr-geocoded.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const addr = JSON.parse(readFileSync('scripts/addresses.json', 'utf8'))
const OUT = 'scripts/addr-geocoded.json'
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {} // solo geocodifica lo nuevo (o lo que dio MISS)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function q(text) {
  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.search = new URLSearchParams({ q: text, format: 'jsonv2', limit: '1', countrycodes: 'py', viewbox: '-57.68,-25.23,-57.54,-25.34', bounded: '1' })
  const r = await fetch(u, { headers: { 'User-Agent': 'noche-museos-2026-map/1.0 (yuugen85@gmail.com)' } })
  const j = await r.json()
  return j[0] ? { lat: +j[0].lat, lon: +j[0].lon, display: j[0].display_name } : null
}
for (const [name, a] of Object.entries(addr)) {
  if (out[name]) continue
  // dirección completa; si falla, sin número, luego solo la primera calle
  const tries = [a, a.replace(/ \d+/, ''), a.replace(/ (y|e) .*?,/, ',')]
  let hit = null
  for (const t of tries) { hit = await q(t).catch(() => null); await sleep(1100); if (hit) break }
  out[name] = hit
  console.log(hit ? 'OK  ' : 'MISS', name, '=>', hit?.display.slice(0, 70) ?? '')
}
writeFileSync(OUT, JSON.stringify(out, null, 1))
