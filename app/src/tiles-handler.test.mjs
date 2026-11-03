import test from 'node:test'
import assert from 'node:assert/strict'
globalThis.self ??= globalThis // workbox asume un service worker (self) al importarse
const { prefetchTiles, serveTiles } = await import('./tiles-handler.js')

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
