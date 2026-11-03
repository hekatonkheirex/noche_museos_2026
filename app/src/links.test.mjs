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

test('Uber: universal link con setPickup, origen mi ubicación y destino con coordenadas y nombre (acentos y comillas incluidos)', async () => {
  const { uberUrl } = await import('./links.js')
  const u = new URL(uberUrl(-25.2822733, -57.6350903, 'Museo Juan Emiliano O’Leary & Cía'))
  assert.equal(u.origin + u.pathname, 'https://m.uber.com/ul/')
  assert.equal(u.searchParams.get('action'), 'setPickup')
  assert.equal(u.searchParams.get('pickup'), 'my_location')
  assert.equal(u.searchParams.get('dropoff[latitude]'), '-25.282273')
  assert.equal(u.searchParams.get('dropoff[longitude]'), '-57.635090')
  assert.equal(u.searchParams.get('dropoff[nickname]'), 'Museo Juan Emiliano O’Leary & Cía')
  assert.ok(!uberUrl(0, 0, 'a&b').includes('a&b')) // el & del nombre va codificado, no corta el parámetro
})

test('Bolt: texto de destino con nombre, dirección (sin punto final) y ciudad; sin dirección usa solo nombre y ciudad', async () => {
  const { destinoTexto, BOLT_URL } = await import('./links.js')
  assert.equal(destinoTexto('Archivo Nacional de Asunción', 'Mariscal Estigarribia e Iturbe.'), 'Archivo Nacional de Asunción, Mariscal Estigarribia e Iturbe, Asunción')
  assert.equal(destinoTexto('Panteón Nacional de los Héroes'), 'Panteón Nacional de los Héroes, Asunción')
  assert.equal(new URL(BOLT_URL).protocol, 'https:')
})
