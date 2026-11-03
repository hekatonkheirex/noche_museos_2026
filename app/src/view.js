// Vista inicial de "Todas" y tamaño de los pines según el zoom.
// Las rutas D, E, F y G llegan a Lambaré, San Lorenzo, Capiatá y Areguá: encuadrar todo deja el centro (donde está casi todo) diminuto.
// coreBounds encuadra solo las paradas a menos de radiusKm de la mediana: el centro de Asunción. Las demás rutas siguen a un gesto de distancia.
const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

export function coreBounds(stops, radiusKm = 10) {
  if (!stops.length) return null
  const c = { lat: median(stops.map((s) => s.lat)), lon: median(stops.map((s) => s.lon)) }
  const km = (s) => Math.hypot((s.lat - c.lat) * 111, (s.lon - c.lon) * 111 * Math.cos((c.lat * Math.PI) / 180))
  const core = stops.filter((s) => km(s) <= radiusKm)
  if (!core.length) return null
  const lats = core.map((s) => s.lat), lons = core.map((s) => s.lon)
  return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]]
}

// Tamaño (px) del pin. En "Todas" a zoom bajo las paradas son puntos y solo los intercambiadores (⇄) llevan marca: se lee la red de rutas, no confeti.
export const ZOOM_PINS = 14
export const pinSize = (all, swap, zoom) => (!all ? 26 : zoom < ZOOM_PINS ? (swap ? 16 : 8) : swap ? 18 : 12)
