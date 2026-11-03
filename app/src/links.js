// Enlaces para ir a una parada con apps de navegación (sin claves ni SDK: URLs oficiales).
// Google Maps: https://developers.google.com/maps/documentation/urls/get-started  Waze: https://developers.google.com/waze/deeplinks
const c = (n) => Number(n).toFixed(6) // ~0,1 m; evita notación científica y largos

export const googleMapsUrl = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${c(lat)},${c(lon)}`
export const wazeUrl = (lat, lon) => `https://waze.com/ul?ll=${c(lat)},${c(lon)}&navigate=yes`
