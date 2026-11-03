import test from 'node:test'
import assert from 'node:assert/strict'
import { googleMapsUrl, wazeUrl } from './links.js'

test('Google Maps: indicaciones hacia lat,lon (el origen lo pone la app con la ubicación del teléfono)', () => {
  const u = new URL(googleMapsUrl(-25.2822733, -57.6350903))
  assert.equal(u.origin + u.pathname, 'https://www.google.com/maps/dir/')
  assert.equal(u.searchParams.get('api'), '1')
  assert.equal(u.searchParams.get('destination'), '-25.282273,-57.635090')
})

test('Waze: ll=lat,lon y navegar', () => {
  const u = new URL(wazeUrl(-25.2822733, -57.6350903))
  assert.equal(u.origin + u.pathname, 'https://waze.com/ul')
  assert.equal(u.searchParams.get('ll'), '-25.282273,-57.635090')
  assert.equal(u.searchParams.get('navigate'), 'yes')
})

test('datos reales: todas las paradas ubicadas generan coordenadas válidas en ambos enlaces', async () => {
  const { readFileSync } = await import('node:fs')
  const d = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))).routes
  let n = 0
  for (const stops of Object.values(d)) for (const s of stops) {
    n++
    for (const url of [googleMapsUrl(s.lat, s.lon), wazeUrl(s.lat, s.lon)]) {
      const [lat, lon] = (new URL(url).searchParams.get('destination') ?? new URL(url).searchParams.get('ll')).split(',').map(Number)
      assert.ok(Math.abs(lat - s.lat) < 1e-6 && Math.abs(lon - s.lon) < 1e-6, s.nombre)
    }
  }
  assert.ok(n > 50)
})
