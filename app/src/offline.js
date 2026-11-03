// Uso sin conexión: service worker (app + teselas servidas desde caché) y descarga del mapa (10 MB) con consentimiento.
import { prefetchTiles, TILES_CACHE } from './tiles-handler.js'

export const TILES_URL = '/asuncion.pmtiles'
export const TILES_MB = 10 // tamaño aproximado que se muestra en el botón (un test lo compara con el archivo real)

// Descarga automática solo en redes sin costo para el usuario (Wi-Fi o cable) y sin "ahorro de datos". Safari no expone la API: allí siempre pide permiso.
export const shouldAutoSave = (conn) => !!conn && !conn.saveData && (conn.type === 'wifi' || conn.type === 'ethernet')

// Registra el service worker (app y teselas ya guardadas funcionan sin red). false en desarrollo o si el navegador no lo soporta.
export async function registerWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return false
  await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return true
}

export async function tilesSaved() {
  try { return !!(await (await caches.open(TILES_CACHE)).match(TILES_URL)) } catch { return false }
}

export async function saveTiles(onProgress) {
  return prefetchTiles(TILES_URL, await caches.open(TILES_CACHE), fetch, onProgress)
}
