// Sirve public/asuncion.pmtiles desde la caché (con soporte de Range, que pmtiles exige) o, si no está, desde la red.
import { createPartialResponse } from 'workbox-range-requests'

export const TILES_CACHE = 'tiles-v2' // subir el número al regenerar asuncion.pmtiles

export async function serveTiles(request, cache, net = fetch) {
  const hit = await cache.match(request.url) // por URL: Cache API no entiende Range
  if (hit) return request.headers.has('range') ? createPartialResponse(request, hit) : hit
  return net(request)
}

// Descarga el archivo completo (200) a la caché para uso sin conexión. true si quedó guardado.
export async function prefetchTiles(url, cache, net = fetch) {
  if (await cache.match(url)) return true
  const res = await net(url)
  if (res.status !== 200) return false
  await cache.put(url, res)
  return true
}
