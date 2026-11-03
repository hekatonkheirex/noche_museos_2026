// CSV + geocoded.json + overrides.json -> app/src/data.json  { routes: {A:[{orden,nombre,lat,lon}]}, missing: [] }
import { readFileSync, writeFileSync } from 'node:fs'
import { parseCsv } from './csv.mjs'

export function build(rows, geo, overrides = {}, addr = {}, alias = {}) {
  const routes = {}, missing = [], pending = {}
  for (const r of rows) {
    const key = r['Ubicación para buscar']
    const p = overrides[key] ?? geo[key] ?? addr[r.Nombre] ?? alias[r.Nombre]
    if (!p) { missing.push(key); ;(pending[r.Ruta] ??= []).push({ orden: +r.Orden, nombre: r.Nombre }); continue }
    ;(routes[r.Ruta] ??= []).push({ orden: +r.Orden, nombre: r.Nombre, lat: p.lat, lon: p.lon, approx: !!p.approx })
  }
  for (const k in routes) routes[k].sort((a, b) => a.orden - b.orden)
  return { routes, pending, missing: [...new Set(missing)] }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = parseCsv(readFileSync('noche_museos_2026_mymaps.csv', 'utf8'))
  const geo = JSON.parse(readFileSync('scripts/geocoded.json', 'utf8'))
  const ov = JSON.parse(readFileSync('scripts/overrides.json', 'utf8'))
  // Dirección de calle: exacta si el resultado trae número de puerta, si no es el centro de la calle (approx)
  const raw = JSON.parse(readFileSync('scripts/addr-geocoded.json', 'utf8'))
  // Centro de calle larga que cae lejos del lugar real: se descarta (queda "sin ubicación")
  const drop = new Set(['Casa Bicentenario de la Danza Tala Ern de Retivoff', 'Museo Histórico de la Masonería Paraguaya', 'Museo de Arte Sacro Fundación Nicolás Darío Latourrette Bo'])
  const addr = Object.fromEntries(Object.entries(raw).filter(([k, v]) => v && !drop.has(k)).map(([k, v]) => [k, { lat: v.lat, lon: v.lon, approx: !/^([^,]*\b\d{2,4}\b|[^,]*, \d{1,4},)/.test(v.display) }]))
  // Museos dentro del edificio del Banco Central comparten su punto
  const bcp = geo['Banco Central del Paraguay, Asunción, Paraguay']
  const alias = Object.fromEntries(['Museo de Arte e Historia Colonial Banco Central del Paraguay', 'Museo de Numismática y Joyas Banco Central del Paraguay'].map((n) => [n, bcp]))
  // Museo de Arte Sacro: Manuel Domínguez esq. Paraguarí, a una cuadra de Fundación TEXO (Paraguarí 852)
  const texo = addr['Fundación TEXO para el Arte Contemporáneo']
  alias['Museo de Arte Sacro Fundación Nicolás Darío Latourrette Bo'] = { ...texo, approx: true }
  const d = build(rows, geo, ov, addr, alias)
  writeFileSync('app/src/data.json', JSON.stringify(d))
  console.log(Object.entries(d.routes).map(([k, v]) => `${k}:${v.length}`).join(' '), '| sin coordenadas:', d.missing)
}
