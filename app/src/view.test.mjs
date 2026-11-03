import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { coreBounds, pinSize, ZOOM_PINS } from './view.js'

test('coreBounds: ignora las paradas lejanas y encuadra el resto; vacío -> null', () => {
  const stops = [{ lat: -25.28, lon: -57.63 }, { lat: -25.29, lon: -57.62 }, { lat: -25.27, lon: -57.64 }, { lat: -25.30, lon: -57.60 }, { lat: -25.20, lon: -57.20 }]
  const b = coreBounds(stops, 10)
  assert.deepEqual(b, [[-25.30, -57.64], [-25.27, -57.60]]) // la de lon -57.20 (~40 km) queda fuera
  assert.equal(coreBounds([]), null)
  assert.deepEqual(coreBounds([{ lat: 1, lon: 2 }]), [[1, 2], [1, 2]])
})

test('datos reales: el centro encuadra casi todas las paradas y deja fuera las de Areguá y San Lorenzo', () => {
  const d = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))).routes
  const all = Object.values(d).flat()
  const b = coreBounds(all, 10)
  const inside = all.filter((s) => s.lat >= b[0][0] && s.lat <= b[1][0] && s.lon >= b[0][1] && s.lon <= b[1][1])
  assert.ok(inside.length / all.length > 0.85, `${inside.length}/${all.length}`)
  const aregua = all.find((s) => /Areguá/.test(s.nombre))
  assert.ok(aregua.lon > b[1][1], 'Areguá queda fuera del encuadre inicial')
  assert.ok((b[1][1] - b[0][1]) < 0.2 && (b[1][0] - b[0][0]) < 0.2, 'el encuadre es solo el centro')
})

test('pinSize: una ruta siempre 26; en "Todas" puntos a zoom bajo y pines normales desde el zoom de la ciudad; intercambiadores siempre mayores', () => {
  assert.equal(pinSize(false, false, 10), 26)
  assert.equal(pinSize(true, false, ZOOM_PINS - 1), 8)
  assert.equal(pinSize(true, true, ZOOM_PINS - 1), 16)
  assert.equal(pinSize(true, false, ZOOM_PINS), 12)
  assert.equal(pinSize(true, true, ZOOM_PINS), 18)
  for (const z of [10, 13, 14, 19]) assert.ok(pinSize(true, true, z) > pinSize(true, false, z))
})
