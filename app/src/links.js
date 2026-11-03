// Enlaces para ir a una parada con apps de navegación (sin claves ni SDK: URLs oficiales).
// Google Maps: https://developers.google.com/maps/documentation/urls/get-started  Waze: https://developers.google.com/waze/deeplinks
const c = (n) => Number(n).toFixed(6) // ~0,1 m; evita notación científica y largos

export const googleMapsUrl = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${c(lat)},${c(lon)}`
export const wazeUrl = (lat, lon) => `https://waze.com/ul?ll=${c(lat)},${c(lon)}&navigate=yes`

// Uber: universal link documentado (https://developer.uber.com/docs/deep-linking): action=setPickup, origen = ubicación actual, destino con coordenadas y nombre.
export function uberUrl(lat, lon, nombre) {
  const q = new URLSearchParams({ action: 'setPickup', pickup: 'my_location', 'dropoff[latitude]': c(lat), 'dropoff[longitude]': c(lon), 'dropoff[nickname]': nombre })
  return `https://m.uber.com/ul/?${q}`
}

// Bolt no publica un enlace para pre-cargar el destino: el botón abre Bolt y copia este texto para pegarlo en "¿A dónde vas?".
export const BOLT_URL = 'https://bolt.eu/'
export const destinoTexto = (nombre, direccion) => [nombre, direccion?.trim().replace(/\.$/, ''), 'Asunción'].filter(Boolean).join(', ')

// Bolt (app "Bolt: Request a Ride", paquete ee.mtakso.client). No hay enlace universal público; el esquema heredado de Taxify
// acepta destino: taxify://action/bookaride?pickup=my_location&dropoff_latitude=..&dropoff_longitude=..&dropoff_title=..
// Fuente (comunitaria, sin documentación oficial de Bolt): https://github.com/byshako-dev/bolt-ios-deeplink
const boltQuery = (lat, lon, nombre) =>
  new URLSearchParams({ pickup: 'my_location', dropoff_latitude: c(lat), dropoff_longitude: c(lon), dropoff_title: nombre }).toString()

export const boltSchemeUrl = (lat, lon, nombre) => `taxify://action/bookaride?${boltQuery(lat, lon, nombre)}`

// Android (Chrome): intent dirigido al paquete de Bolt; si no está instalada, Chrome abre el respaldo (bolt.eu, que ofrece la tienda).
export const boltAndroidIntent = (lat, lon, nombre) =>
  `intent://action/bookaride?${boltQuery(lat, lon, nombre)}#Intent;scheme=taxify;package=ee.mtakso.client;S.browser_fallback_url=${encodeURIComponent(BOLT_URL)};end`

export const platform = (ua = '') => (/android/i.test(ua) ? 'android' : /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && /mobile/i.test(ua)) ? 'ios' : 'other')

// A dónde ir al tocar "Bolt": { url, appScheme }. appScheme = true en iOS (el esquema falla si no hay app: se usa un respaldo con temporizador).
export function boltTarget(ua, lat, lon, nombre) {
  const p = platform(ua)
  if (p === 'android') return { url: boltAndroidIntent(lat, lon, nombre), appScheme: false }
  if (p === 'ios') return { url: boltSchemeUrl(lat, lon, nombre), appScheme: true }
  return { url: BOLT_URL, appScheme: false } // computadora: no hay app que abrir
}
