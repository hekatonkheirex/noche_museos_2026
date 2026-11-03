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

test('track: ciclo apagado -> esperando -> siguiendo -> apagado', async () => {
  const { track, TRACK_OFF } = await import('./locate.js')
  let s = track(TRACK_OFF, 'toggle')
  assert.deepEqual(s, { mode: 'wait', follow: true })
  s = track(s, 'fix')
  assert.deepEqual(s, { mode: 'on', follow: true })
  assert.deepEqual(track(s, 'toggle'), TRACK_OFF)
})

test('track: arrastrar suelta el seguimiento y centrar lo recupera; eventos tardíos con el seguimiento apagado no lo reactivan', async () => {
  const { track, TRACK_OFF } = await import('./locate.js')
  const on = { mode: 'on', follow: true }
  const dragged = track(on, 'drag')
  assert.deepEqual(dragged, { mode: 'on', follow: false })
  assert.deepEqual(track(dragged, 'fix'), dragged) // una posición nueva no recentra sola
  assert.deepEqual(track(dragged, 'center'), on)
  for (const ev of ['fix', 'drag', 'center']) assert.deepEqual(track(TRACK_OFF, ev), TRACK_OFF)
  assert.deepEqual(track({ mode: 'wait', follow: true }, 'drag'), { mode: 'wait', follow: true })
})

test('track: permiso denegado apaga desde cualquier estado', async () => {
  const { track, TRACK_OFF } = await import('./locate.js')
  for (const s of [{ mode: 'wait', follow: true }, { mode: 'on', follow: false }]) assert.deepEqual(track(s, 'denied'), TRACK_OFF)
})
