// "Dónde estoy": zona con mapa base y mensajes. La zona = recorte de public/asuncion.pmtiles (ver scripts/build-tiles.sh).
export const BOUNDS = [[-25.55, -57.85], [-25.05, -57.2]] // [[sur, oeste], [norte, este]]

export const inZone = (lat, lng, [[s, w], [n, e]] = BOUNDS) => lat >= s && lat <= n && lng >= w && lng <= e

// code: 1 permiso denegado, 2 posición no disponible, 3 tiempo agotado (GeolocationPositionError)
export const errorMessage = (code) =>
  code === 1 ? 'Permiso de ubicación denegado. Activalo en los ajustes del navegador.' : 'No se pudo obtener tu ubicación. Probá de nuevo al aire libre.'

export const OUT_OF_ZONE = 'Estás fuera de la zona del mapa (Gran Asunción).'

// Seguimiento: mode 'off' | 'wait' (esperando 1ª posición) | 'on'; follow = el mapa acompaña a la persona.
// Eventos: toggle (botón), fix (posición válida dentro o fuera de zona), denied (permiso denegado), drag (la persona mueve el mapa), center.
export const TRACK_OFF = { mode: 'off', follow: false }
export function track(s, ev) {
  if (ev === 'toggle') return s.mode === 'off' ? { mode: 'wait', follow: true } : TRACK_OFF
  if (ev === 'denied') return TRACK_OFF
  if (s.mode === 'off') return s
  if (ev === 'fix') return s.mode === 'wait' ? { mode: 'on', follow: true } : s
  if (ev === 'drag') return s.mode === 'on' ? { ...s, follow: false } : s
  if (ev === 'center') return s.mode === 'on' ? { ...s, follow: true } : s
  return s
}
