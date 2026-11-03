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

test('Bolt: esquema taxify con origen mi ubicación y destino (coordenadas y título codificado)', async () => {
  const { boltSchemeUrl } = await import('./links.js')
  const u = new URL(boltSchemeUrl(-25.2822733, -57.6350903, 'Museo O’Leary & Cía'))
  assert.equal(u.protocol, 'taxify:')
  assert.equal(u.hostname + u.pathname, 'action/bookaride')
  assert.equal(u.searchParams.get('pickup'), 'my_location')
  assert.equal(u.searchParams.get('dropoff_latitude'), '-25.282273')
  assert.equal(u.searchParams.get('dropoff_longitude'), '-57.635090')
  assert.equal(u.searchParams.get('dropoff_title'), 'Museo O’Leary & Cía')
})

test('Bolt Android: intent con el paquete de la app, mismo esquema y respaldo a bolt.eu', async () => {
  const { boltAndroidIntent, boltSchemeUrl } = await import('./links.js')
  const i = boltAndroidIntent(-25.28, -57.63, 'A b')
  assert.ok(i.startsWith('intent://action/bookaride?pickup=my_location&dropoff_latitude=-25.280000'))
  assert.ok(i.includes('#Intent;scheme=taxify;package=ee.mtakso.client;'))
  assert.ok(i.includes('S.browser_fallback_url=https%3A%2F%2Fbolt.eu%2F;end'))
  assert.equal(i.split('?')[1].split('#')[0], boltSchemeUrl(-25.28, -57.63, 'A b').split('?')[1]) // misma consulta que el esquema directo
})

test('platform y boltTarget: Android, iPhone, iPad (Safari de escritorio con "Mobile"), y computadora', async () => {
  const { platform, boltTarget, BOLT_URL } = await import('./links.js')
  const A = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'
  const I = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'
  const P = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1' // iPadOS "modo escritorio"
  const D = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'
  assert.deepEqual([A, I, P, D, ''].map(platform), ['android', 'ios', 'ios', 'other', 'other'])
  assert.ok(boltTarget(A, 1, 2, 'x').url.startsWith('intent://') && !boltTarget(A, 1, 2, 'x').appScheme)
  assert.ok(boltTarget(I, 1, 2, 'x').url.startsWith('taxify://') && boltTarget(I, 1, 2, 'x').appScheme)
  assert.deepEqual(boltTarget(D, 1, 2, 'x'), { url: BOLT_URL, appScheme: false })
})
