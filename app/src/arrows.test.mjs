import test from 'node:test'
import assert from 'node:assert/strict'
import { arrowHtml, arrowsAlong } from './arrows.js'

const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≠ ${b}`)

test('recta horizontal: flechas cada gap px, la primera a gap/2, apuntando a la derecha', () => {
  const r = arrowsAlong([{ x: 0, y: 0 }, { x: 100, y: 0 }], 40)
  assert.deepEqual(r.map((p) => p.x), [20, 60, 100])
  for (const p of r) { near(p.y, 0); near(p.angle, 0) }
})

test('el ángulo sigue el sentido del recorrido (abajo 90, izquierda 180, arriba -90)', () => {
  const ang = (a, b) => arrowsAlong([a, b], 10)[0].angle
  near(ang({ x: 0, y: 0 }, { x: 0, y: 50 }), 90)
  near(Math.abs(ang({ x: 50, y: 0 }, { x: 0, y: 0 })), 180)
  near(ang({ x: 0, y: 50 }, { x: 0, y: 0 }), -90)
})

test('la distancia se acumula entre tramos (una esquina no reinicia el espaciado)', () => {
  const r = arrowsAlong([{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 60 }], 40)
  // recorrido total 90: flechas a 20 (tramo 1) y a 60 (tramo 2, a 30 px de la esquina)
  assert.equal(r.length, 2)
  near(r[0].x, 20); near(r[0].angle, 0)
  near(r[1].x, 30); near(r[1].y, 30); near(r[1].angle, 90)
})

test('casos borde: sin puntos, un punto, puntos repetidos', () => {
  assert.deepEqual(arrowsAlong([], 40), [])
  assert.deepEqual(arrowsAlong([{ x: 1, y: 1 }], 40), [])
  assert.deepEqual(arrowsAlong([{ x: 1, y: 1 }, { x: 1, y: 1 }], 40), [])
})

test('recorrido corto (menor que gap/2): sin flechas', () => {
  assert.deepEqual(arrowsAlong([{ x: 0, y: 0 }, { x: 10, y: 0 }], 40), [])
})

test('arrowHtml: color, tamaño y rotación en el SVG', () => {
  const h = arrowHtml('#e11d48', 14, 90.4)
  assert.ok(h.includes('stroke="#e11d48"') && h.includes('width="14"') && h.includes('rotate(90deg)'))
})

test('view: solo devuelve flechas visibles y conserva la fase (mismas posiciones que sin recorte)', () => {
  const path = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }]
  const all = arrowsAlong(path, 40)
  const view = { x0: 300, y0: -10, x1: 700, y1: 10 }
  const cut = arrowsAlong(path, 40, view)
  assert.deepEqual(cut, all.filter((p) => p.x >= 300 && p.x <= 700 && p.y >= -10 && p.y <= 10))
  assert.ok(cut.length > 5 && cut.length < all.length)
})

test('view: un tramo fuera de pantalla no genera flechas pero sí avanza la fase del siguiente', () => {
  const path = [{ x: 0, y: 0 }, { x: 0, y: 5000 }, { x: 100, y: 5000 }] // baja 5000 px (fuera de la vista) y luego gira
  const view = { x0: -10, y0: 4990, x1: 110, y1: 5010 }
  assert.deepEqual(arrowsAlong(path, 70, view), arrowsAlong(path, 70).filter((p) => p.y >= 4990 && p.y <= 5010 && p.x >= -10 && p.x <= 110))
})

test('rendimiento: un recorrido de millones de píxeles con vista pequeña termina al instante y respeta el tope', () => {
  const big = Array.from({ length: 3000 }, (_, i) => ({ x: i * 4000, y: (i % 2) * 3000 })) // ~12 millones de px de largo
  const t0 = Date.now()
  const r = arrowsAlong(big, 80, { x0: 0, y0: 0, x1: 1000, y1: 1000 })
  assert.ok(Date.now() - t0 < 200, `tardó ${Date.now() - t0} ms`)
  assert.ok(r.length < 50)
  assert.equal(arrowsAlong(big, 80, null, 100).length, 100) // sin vista: el tope corta
})

test('entradas peligrosas: gap 0, negativo, NaN o Infinity; coordenadas no finitas; no se cuelga', () => {
  const p = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
  for (const g of [0, -5, NaN, Infinity]) assert.deepEqual(arrowsAlong(p, g), [])
  assert.deepEqual(arrowsAlong([{ x: 0, y: 0 }, { x: Infinity, y: 0 }], 10), [])
  assert.deepEqual(arrowsAlong([{ x: 0, y: 0 }, { x: NaN, y: 0 }], 10), [])
})
