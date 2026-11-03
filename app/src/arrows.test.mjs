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
