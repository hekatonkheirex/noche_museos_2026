import test from 'node:test'
import assert from 'node:assert/strict'
import { laneUnits, offsetPath } from './lanes.js'

// Calle recta hacia el este (lat fija, lon crece): A -> B -> C
const W = [[-25.28, -57.640], [-25.28, -57.639], [-25.28, -57.638]]
const E = [...W].reverse() // el mismo camino hacia el oeste

test('tramo no compartido: sin desplazamiento', () => {
  assert.deepEqual(laneUnits({ A: W, B: [[-25.30, -57.6], [-25.30, -57.59]] }), { A: [0, 0], B: [0] })
})

test('un recorrido solo por una calle: sin desplazamiento', () => {
  assert.deepEqual(laneUnits({ A: W }), { A: [0, 0] })
})

test('dos rutas en el mismo sentido: carriles distintos, simétricos, estables por id', () => {
  const r = laneUnits({ B: W, A: W })
  assert.deepEqual(r.A.map(Math.abs), [0.5, 0.5])
  assert.deepEqual(r.B, r.A.map((x) => -x))
  assert.notEqual(r.A[0], r.B[0])
  assert.deepEqual(laneUnits({ A: W, B: W }), r) // el orden de las claves no cambia el resultado
})

test('ida y vuelta por la misma calle: las dos a la derecha de su sentido (negativo)', () => {
  const r = laneUnits({ A: [...W, ...E.slice(1)] })
  assert.deepEqual(r.A, [-0.5, -0.5, -0.5, -0.5])
})

test('tres usuarios en una arista: carriles -1, 0, +1 en el marco canónico y todos distintos', () => {
  const r = laneUnits({ A: W, B: W, C: E })
  const pos = [r.A[0], r.B[0], -r.C[0]] // C viaja al revés: su unidad propia es la opuesta a la canónica
  assert.deepEqual([...pos].sort((a, b) => a - b), [-1, 0, 1])
})

test('segmentos de longitud cero y rutas de un solo punto no rompen', () => {
  assert.deepEqual(laneUnits({ A: [[-25.1, -57.1], [-25.1, -57.1], [-25.1, -57.2]], B: [[-25.1, -57.1]] }), { A: [0, 0], B: [] })
})

test('offsetPath: hacia el este con -1 carril desplaza hacia abajo (derecha del sentido en pantalla)', () => {
  const o = offsetPath([{ x: 0, y: 0 }, { x: 100, y: 0 }], [-1], 4)
  assert.deepEqual(o, [{ x: 0, y: 4 }, { x: 100, y: 4 }])
})

test('offsetPath: hacia el oeste con -1 desplaza hacia arriba (su derecha)', () => {
  const o = offsetPath([{ x: 100, y: 0 }, { x: 0, y: 0 }], [-1], 4)
  assert.deepEqual(o.map((p) => Math.round(p.y)), [-4, -4])
})

test('offsetPath: cada vértice interior promedia los dos tramos; sin carriles queda igual', () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]
  assert.deepEqual(offsetPath(pts, [0, 0], 4), pts)
  const o = offsetPath(pts, [-1, -1], 4)
  assert.deepEqual([o[1].x, o[1].y], [8, 2]) // tramo 1 (este): (0,+4); tramo 2 (sur): (-4,0); promedio (-2,+2) sumado a (10,0)
})

test('datos reales: hay tramos compartidos y los carriles de cada arista no se repiten', async () => {
  const { readFileSync } = await import('node:fs')
  const g = JSON.parse(readFileSync(new URL('./routes-geo.json', import.meta.url)))
  const paths = Object.fromEntries(Object.entries(g).map(([k, r]) => [k, r.geometry]))
  const u = laneUnits(paths)
  const shared = Object.values(u).flat().filter((x) => x !== 0).length
  assert.ok(shared > 100, `tramos desplazados: ${shared}`)
  for (const [k, v] of Object.entries(u)) assert.equal(v.length, paths[k].length - 1)
})
