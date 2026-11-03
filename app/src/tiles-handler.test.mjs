import test from 'node:test'
import assert from 'node:assert/strict'
globalThis.self ??= globalThis // workbox asume un service worker (self) al importarse
const { dropOldTiles, prefetchTiles, readWithProgress, serveTiles } = await import('./tiles-handler.js')

const U = 'https://x.test/asuncion.pmtiles'
const body = Uint8Array.from({ length: 100 }, (_, i) => i)
// Cache mínima en memoria (por URL, como Cache API)
const fakeCache = () => {
  const m = new Map()
  return { match: async (u) => m.get(u)?.clone(), put: async (u, r) => void m.set(u, r), has: (u) => m.has(u) }
}
const req = (range) => new Request(U, range ? { headers: { range } } : {})
const failNet = async () => { throw new Error('sin red') }

test('prefetch: guarda solo respuestas 200 y no vuelve a bajar lo ya guardado', async () => {
  const c = fakeCache(); let calls = 0
  const net = async () => (calls++, new Response(body, { status: 200 }))
  assert.equal(await prefetchTiles(U, c, net), true)
  assert.equal(await prefetchTiles(U, c, net), true)
  assert.equal(calls, 1)
  const c2 = fakeCache()
  assert.equal(await prefetchTiles(U, c2, async () => new Response('x', { status: 404 })), false)
  assert.equal(c2.has(U), false)
})

test('sin conexión: Range desde la caché devuelve 206 con los bytes exactos', async () => {
  const c = fakeCache(); await c.put(U, new Response(body, { status: 200 }))
  const r = await serveTiles(req('bytes=10-19'), c, failNet)
  assert.equal(r.status, 206)
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  assert.equal(r.headers.get('content-range'), 'bytes 10-19/100')
})

test('sin conexión: pedido completo desde la caché; sin caché y sin red falla (el mapa cae al respaldo)', async () => {
  const c = fakeCache(); await c.put(U, new Response(body, { status: 200 }))
  assert.equal((await serveTiles(req(), c, failNet)).status, 200)
  await assert.rejects(serveTiles(req('bytes=0-9'), fakeCache(), failNet))
})

test('con conexión y sin caché: pasa el pedido (con su Range) a la red', async () => {
  let seen
  const r = await serveTiles(req('bytes=0-9'), fakeCache(), async (q) => ((seen = q), new Response('ok', { status: 206 })))
  assert.equal(r.status, 206)
  assert.equal(seen.headers.get('range'), 'bytes=0-9')
})

test('dropOldTiles borra solo cachés tiles-* de otras versiones', async () => {
  const names = new Set(['tiles-v1', 'tiles-v2', 'tiles-v3', 'workbox-precache-v2-x', 'otra'])
  const storage = { keys: async () => [...names], delete: async (k) => names.delete(k) }
  assert.deepEqual((await dropOldTiles(storage, 'tiles-v2')).sort(), ['tiles-v1', 'tiles-v3'])
  assert.deepEqual([...names].sort(), ['otra', 'tiles-v2', 'workbox-precache-v2-x'])
})

// Respuesta de prueba que entrega el cuerpo en trozos de 25 bytes (como una descarga real)
const chunked = (len, headers = {}) => new Response(new ReadableStream({ start(c) { for (let i = 0; i < len; i += 25) c.enqueue(new Uint8Array(Math.min(25, len - i))); c.close() } }), { status: 200, headers })

test('readWithProgress: avisa el avance creciente hasta el total y devuelve todos los bytes', async () => {
  const seen = []
  const blob = await readWithProgress(chunked(100, { 'content-length': '100' }), (got, total) => seen.push([got, total]))
  assert.equal(blob.size, 100)
  assert.deepEqual(seen, [[25, 100], [50, 100], [75, 100], [100, 100]])
})

test('readWithProgress: sin content-length el total es 0 (la interfaz no inventa un porcentaje)', async () => {
  let last
  await readWithProgress(chunked(50), (got, total) => (last = [got, total]))
  assert.deepEqual(last, [50, 0])
})

test('prefetchTiles con progreso: guarda el archivo completo como 200 y no avisa si ya estaba guardado', async () => {
  const c = fakeCache(); let calls = 0
  const net = async () => (calls++, chunked(100, { 'content-length': '100', 'content-type': 'application/octet-stream' }))
  let ticks = 0
  assert.equal(await prefetchTiles(U, c, net, () => ticks++), true)
  assert.ok(ticks >= 4)
  const saved = await c.match(U)
  assert.equal(saved.status, 200)
  assert.equal((await saved.arrayBuffer()).byteLength, 100)
  ticks = 0
  assert.equal(await prefetchTiles(U, c, net, () => ticks++), true)
  assert.equal(calls, 1); assert.equal(ticks, 0)
})

test('offline.js: auto-descarga solo con Wi-Fi/cable y sin ahorro de datos; el tamaño del botón coincide con el archivo', async () => {
  const { shouldAutoSave, TILES_MB } = await import('./offline.js')
  assert.equal(shouldAutoSave({ type: 'wifi' }), true)
  assert.equal(shouldAutoSave({ type: 'ethernet', saveData: false }), true)
  assert.equal(shouldAutoSave({ type: 'cellular' }), false)
  assert.equal(shouldAutoSave({ type: 'wifi', saveData: true }), false)
  assert.equal(shouldAutoSave({ effectiveType: '4g' }), false) // tipo desconocido: pide permiso
  assert.equal(shouldAutoSave(undefined), false) // Safari
  const { statSync } = await import('node:fs')
  const mb = statSync(new URL('../public/asuncion.pmtiles', import.meta.url)).size / 1e6
  assert.ok(Math.abs(mb - TILES_MB) <= 1, `archivo real: ${mb.toFixed(1)} MB`)
})
