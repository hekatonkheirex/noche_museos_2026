// Sirve public/asuncion.pmtiles desde la caché (con soporte de Range, que pmtiles exige) o, si no está, desde la red.
import { createPartialResponse } from 'workbox-range-requests'

export const TILES_CACHE = 'tiles-v2' // subir el número al regenerar asuncion.pmtiles

export async function serveTiles(request, cache, net = fetch) {
  const hit = await cache.match(request.url) // por URL: Cache API no entiende Range
  if (hit) return request.headers.has('range') ? createPartialResponse(request, hit) : hit
  return net(request)
}

// Lee la respuesta por trozos avisando el avance (bytes leídos, total; total = 0 si el servidor no lo informa).
export async function readWithProgress(res, onProgress) {
  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body) { const b = await res.blob(); onProgress?.(b.size, total || b.size); return b }
  const reader = res.body.getReader()
  const chunks = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    got += value.length
    onProgress?.(got, total)
  }
  return new Blob(chunks)
}

// Descarga el archivo completo (200) a la caché para uso sin conexión. true si quedó guardado.
export async function prefetchTiles(url, cache, net = fetch, onProgress) {
  if (await cache.match(url)) return true
  const res = await net(url)
  if (res.status !== 200) return false
  const body = await readWithProgress(res, onProgress)
  await cache.put(url, new Response(body, { status: 200, headers: { 'content-type': res.headers.get('content-type') ?? 'application/octet-stream' } }))
  return true
}

// Borra cachés de teselas de versiones anteriores (liberan 10-25 MB por teléfono). Devuelve los nombres borrados.
export async function dropOldTiles(storage, current = TILES_CACHE) {
  const old = (await storage.keys()).filter((k) => k.startsWith('tiles-') && k !== current)
  await Promise.all(old.map((k) => storage.delete(k)))
  return old
}
