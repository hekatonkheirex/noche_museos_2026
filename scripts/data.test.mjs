import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCsv } from './csv.mjs'
import { build } from './build-data.mjs'

const rows = parseCsv(readFileSync(new URL('../noche_museos_2026_mymaps.csv', import.meta.url), 'utf8'))

test('csv: 71 filas, 7 rutas, BOM y comas entre comillas', () => {
  assert.equal(rows.length, 71)
  assert.deepEqual([...new Set(rows.map((r) => r.Ruta))], ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  assert.equal(rows[0].Nombre, 'Panteón Nacional de los Héroes')
})

test('build: ordena por Orden y reporta faltantes', () => {
  const r = [
    { Ruta: 'A', Orden: '2', Nombre: 'b', 'Ubicación para buscar': 'x' },
    { Ruta: 'A', Orden: '1', Nombre: 'a', 'Ubicación para buscar': 'y' },
    { Ruta: 'A', Orden: '3', Nombre: 'c', 'Ubicación para buscar': 'z' },
  ]
  const d = build(r, { x: { lat: 1, lon: 1 }, y: { lat: 2, lon: 2 }, z: null })
  assert.deepEqual(d.routes.A.map((s) => s.nombre), ['a', 'b'])
  assert.deepEqual(d.missing, ['z'])
})

test('datos reales: toda parada ubicada cae dentro del área de Asunción/Areguá', () => {
  const geo = JSON.parse(readFileSync(new URL('./geocoded.json', import.meta.url), 'utf8'))
  const ov = JSON.parse(readFileSync(new URL('./overrides.json', import.meta.url), 'utf8'))
  const d = build(rows, geo, ov)
  for (const s of Object.values(d.routes).flat()) {
    assert.ok(s.lat < -25.15 && s.lat > -25.40 && s.lon > -57.70 && s.lon < -57.35, `${s.nombre} fuera de área: ${s.lat},${s.lon}`)
  }
  // ubicadas + sin ubicación = 71 filas del CSV
  const located = Object.values(d.routes).flat().length
  const missingRows = rows.filter((r) => d.missing.includes(r['Ubicación para buscar'])).length
  assert.equal(located + missingRows, 71)
})

test('datos reales: dirección con número de puerta en el resultado (aunque tras el nombre del lugar) no es aproximada', () => {
  const d = JSON.parse(readFileSync(new URL('../app/src/data.json', import.meta.url), 'utf8'))
  const mef = d.routes.A.find((s) => s.nombre === 'Museo de Economía y Finanzas MEF') // Palma 364
  assert.equal(mef.approx, false)
})

test('intercambiadores: cada uno existe en las dos rutas que declara', () => {
  const d = JSON.parse(readFileSync(new URL('../app/src/data.json', import.meta.url), 'utf8'))
  const sw = JSON.parse(readFileSync(new URL('../app/src/intercambiadores.json', import.meta.url), 'utf8'))
  assert.equal(Object.keys(sw).length, 7) // fuente: posts del Instagram oficial
  for (const [nombre, rs] of Object.entries(sw)) {
    assert.equal(rs.length, 2, nombre)
    for (const r of rs) assert.ok(d.routes[r].some((s) => s.nombre === nombre), `${nombre} no está en ruta ${r}`)
  }
})

test('cierres: cada parada con horario de cierre existe en data.json', () => {
  const d = JSON.parse(readFileSync(new URL('../app/src/data.json', import.meta.url), 'utf8'))
  const c = JSON.parse(readFileSync(new URL('../app/src/cierres.json', import.meta.url), 'utf8'))
  const names = new Set(Object.values(d.routes).flat().map((s) => s.nombre))
  for (const [n, h] of Object.entries(c)) { assert.ok(names.has(n), n); assert.match(h, /^\d{2}:\d{2}$/) }
})

test('MEF: en la esquina de Palma y Chile, en diagonal al Panteón (no a mitad de cuadra por el geocodificador)', () => {
  const stops = JSON.parse(readFileSync(new URL('../app/src/data.json', import.meta.url), 'utf8')).routes
  const find = (route, nombre) => stops[route].find((s) => s.nombre.includes(nombre))
  const m = (a, b) => Math.hypot((a.lat - b.lat) * 111_000, (a.lon - b.lon) * 100_600) // metros (aprox. a la latitud de Asunción)
  const CORNER = { lat: -25.281969, lon: -57.635142 } // intersección Palma / Chile: vértice donde gira el recorrido Panteón -> MEF
  for (const r of ['A', 'B']) {
    const mef = find(r, 'Economía y Finanzas'), pan = find(r, 'Panteón')
    assert.ok(m(mef, CORNER) < 25, `${r}: el MEF está a ${Math.round(m(mef, CORNER))} m de la esquina`)
    assert.ok(mef.lat > pan.lat, `${r}: el MEF queda al norte del Panteón (esquina opuesta)`)
    assert.ok(m(mef, pan) > 25 && m(mef, pan) < 80, `${r}: a ${Math.round(m(mef, pan))} m del Panteón`)
    assert.equal(mef.approx, false)
  }
})
