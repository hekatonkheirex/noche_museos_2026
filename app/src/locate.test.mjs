import test from 'node:test'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { BOUNDS, errorMessage, inZone, OUT_OF_ZONE } from './locate.js'

test('inZone: centro de Asunción dentro; Buenos Aires y bordes fuera/dentro', () => {
  assert.equal(inZone(-25.2867, -57.6333), true)
  assert.equal(inZone(-34.6, -58.4), false)
  assert.equal(inZone(BOUNDS[0][0], BOUNDS[0][1]), true) // esquina sur-oeste incluida
  assert.equal(inZone(-25.56, -57.6), false)
  assert.equal(inZone(-25.3, -57.19), false)
})

test('la zona del mapa contiene todas las paradas ubicadas', () => {
  const { routes } = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)))
  for (const stops of Object.values(routes)) for (const s of stops) assert.ok(inZone(s.lat, s.lon), s.nombre)
})

test('mensajes: permiso denegado distinto del resto; hay mensaje fuera de zona', () => {
  assert.match(errorMessage(1), /Permiso/)
  assert.match(errorMessage(2), /No se pudo/)
  assert.equal(errorMessage(3), errorMessage(2))
  assert.match(OUT_OF_ZONE, /fuera de la zona/)
})
