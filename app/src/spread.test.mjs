import test from 'node:test'
import assert from 'node:assert/strict'
import { spread } from './spread.js'

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const pt = (x, y, r = 10) => ({ x, y, r })

test('puntos lejanos no se mueven', () => {
  const pts = [pt(0, 0), pt(100, 0), pt(0, 100)]
  assert.deepEqual(spread(pts), [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }])
})

test('dos puntos solapados quedan a r1 + r2 + gap, en la misma línea y centrados en el original', () => {
  const [a, b] = spread([pt(0, 0), pt(10, 0)], 1)
  assert.ok(dist(a, b) >= 21 - 1e-6)
  assert.equal(a.y, 0); assert.equal(b.y, 0)
  assert.ok(Math.abs((a.x + b.x) / 2 - 5) < 1e-6)
})

test('varios puntos en el mismo lugar: ninguno se tapa y todos quedan cerca del origen', () => {
  const pts = Array.from({ length: 5 }, () => pt(50, 50))
  const out = spread(pts)
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) assert.ok(dist(out[i], out[j]) >= 20.9, `${i}-${j}`)
  for (const o of out) assert.ok(dist(o, { x: 50, y: 50 }) < 50) // abanico de 5 pines de 21 px de diámetro: llega a ~42 px
})

test('radios distintos: respeta la suma de radios de cada par', () => {
  const [a, b] = spread([pt(0, 0, 13), pt(5, 0, 6)], 1)
  assert.ok(dist(a, b) >= 20 - 1e-6)
})

test('determinista, no modifica la entrada y acepta listas vacías o de un punto', () => {
  const pts = [pt(0, 0), pt(0, 0), pt(3, 3)]
  const copy = JSON.stringify(pts)
  assert.deepEqual(spread(pts), spread(pts))
  assert.equal(JSON.stringify(pts), copy)
  assert.deepEqual(spread([]), [])
  assert.deepEqual(spread([pt(7, 8)]), [{ x: 7, y: 8 }])
})

test('datos reales: en el centro de Asunción hay paradas que se tapan y quedan separadas', async () => {
  const { readFileSync } = await import('node:fs')
  const d = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))).routes
  // proyección Mercator a zoom 14 (px)
  const proj = (lat, lon) => { const s = 256 * 2 ** 14, r = (lat * Math.PI) / 180; return { x: ((lon + 180) / 360) * s, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s } }
  const pts = Object.values(d).flat().map((s) => ({ ...proj(s.lat, s.lon), r: 13 }))
  const overlaps = (ps) => { let n = 0; for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (dist(ps[i], ps[j]) < 26) n++; return n }
  assert.ok(overlaps(pts) > 0, 'hay solapamientos de partida')
  assert.equal(overlaps(spread(pts)), 0)
})
