// Registra el service worker y, ya cargada la app, baja las teselas (25 MB) a la caché para uso sin conexión.
import { prefetchTiles, TILES_CACHE } from './tiles-handler.js'

export async function enableOffline() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  if (navigator.connection?.saveData) return // respetar ahorro de datos
  const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 3000))
  idle(async () => {
    try { await prefetchTiles('/asuncion.pmtiles', await caches.open(TILES_CACHE)) }
    catch (e) { console.warn('No se pudo guardar el mapa para uso sin conexión', e) }
  })
}
