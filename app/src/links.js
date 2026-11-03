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
