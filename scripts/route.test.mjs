import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { url, routeFor, profileFor, loop, getJson } from './route.mjs'

const stops = [{ orden: 1, lat: -25.1, lon: -57.1 }, { orden: 3, lat: -25.2, lon: -57.2 }, { orden: 4, lat: -25.3, lon: -57.3 }]

test('route: url usa lon,lat en el orden dado y el perfil', () => {
  assert.match(url(stops, 'foot'), /routed-foot\/route\/v1\/driving\/-57\.1,-25\.1;-57\.2,-25\.2;-57\.3,-25\.3\?/)
  assert.equal(profileFor('A'), 'car') // rutas en bus
})

test('route: circuito vuelve a la primera parada', () => {
  assert.deepEqual(loop(stops).map((x) => x.orden), [1, 3, 4, 1])
  assert.deepEqual(loop(stops.slice(0, 1)), stops.slice(0, 1))
})

test('route: convierte respuesta OSRM a lat,lon y tramos entre paradas consecutivas', async () => {
  const fake = async () => ({ code: 'Ok', routes: [{ distance: 1500.4, duration: 900.6, geometry: { coordinates: [[-57.1, -25.1], [-57.3, -25.3]] }, legs: [{ distance: 700, duration: 400 }, { distance: 800.4, duration: 500.6 }] }] })
  const r = await routeFor(stops, 'foot', fake)
  assert.deepEqual(r.geometry, [[-25.1, -57.1], [-25.3, -57.3]])
  assert.deepEqual(r.legs.map((l) => [l.from, l.to]), [[1, 3], [3, 4]])
  assert.equal(r.distance, 1500)
  assert.equal(await routeFor(stops.slice(0, 1), 'foot', fake), null)
  await assert.rejects(routeFor(stops, 'foot', async () => ({ code: 'NoRoute' })), /NoRoute/)
})

test('datos reales: routes-geo.json está al día con data.json (un tramo por par de paradas, incluido el regreso a la primera)', () => {
  const { routes } = JSON.parse(readFileSync(new URL('../app/src/data.json', import.meta.url), 'utf8'))
  const geo = JSON.parse(readFileSync(new URL('../app/src/routes-geo.json', import.meta.url), 'utf8'))
  for (const [k, s] of Object.entries(routes)) {
    if (s.length < 2) { assert.equal(geo[k], null, k); continue }
    assert.deepEqual(geo[k].legs.map((l) => [l.from, l.to]), loop(s).slice(1).map((x, i) => [loop(s)[i].orden, x.orden]), `ruta ${k} desactualizada: correr node scripts/route.mjs`)
  }
})

test('route: getJson reintenta tras un fallo y falla tras agotar intentos', async () => {
  let n = 0
  const flaky = async () => { if (++n < 3) throw new Error('timeout'); return { json: async () => ({ ok: 1 }) } }
  assert.deepEqual(await getJson('x', 4, 1, flaky), { ok: 1 })
  assert.equal(n, 3)
  await assert.rejects(getJson('x', 2, 1, async () => { throw new Error('down') }), /down/)
})
