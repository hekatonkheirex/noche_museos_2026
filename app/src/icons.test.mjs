import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pub = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url))
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('íconos: PNG válidos con el tamaño que declara index.html', () => {
  const dims = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)]
  for (const [f, n] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
    const b = pub(f)
    assert.equal(b.subarray(1, 4).toString(), 'PNG', f)
    assert.deepEqual(dims(b), [n, n], f)
  }
})

test('favicon.ico: cabecera ICO con 16, 32 y 48 px', () => {
  const b = pub('favicon.ico')
  assert.deepEqual([b.readUInt16LE(0), b.readUInt16LE(2), b.readUInt16LE(4)], [0, 1, 3]) // reservado, tipo icono, 3 imágenes
  assert.deepEqual([6, 22, 38].map((o) => b[o]).sort((a, c) => a - c), [16, 32, 48])
})

test('index.html enlaza los tres íconos y los archivos existen', () => {
  for (const f of ['/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png']) {
    assert.ok(html.includes(`href="${f}"`), f)
    assert.ok(pub(f.slice(1)).length > 100, f)
  }
})

test('index.html carga el script de Vercel Web Analytics', () => {
  assert.ok(html.includes('src="/_vercel/insights/script.js"'))
})

const png = (f) => { const b = pub(f); return [b.readUInt32BE(16), b.readUInt32BE(20)] }

test('metadatos para compartir: descripción, Open Graph con imagen absoluta, tarjeta grande, canonical y manifest', () => {
  for (const frag of ['name="description"', 'rel="canonical"', 'rel="manifest" href="/manifest.webmanifest"', 'property="og:title"', 'property="og:description"', 'property="og:image:width" content="1200"', 'property="og:image:height" content="630"', 'name="twitter:card" content="summary_large_image"'])
    assert.ok(html.includes(frag), frag)
  assert.match(html, /property="og:image" content="https:\/\/[^"]+\/og\.png"/) // URL absoluta (WhatsApp/Instagram no resuelven relativas)
  assert.deepEqual(png('og.png'), [1200, 630])
})

test('manifest: JSON válido, instalable (nombre, inicio, display, íconos 192 y 512 + maskable) y los íconos existen con su tamaño', () => {
  const m = JSON.parse(pub('manifest.webmanifest').toString())
  assert.ok(m.name && m.short_name && m.start_url === '/' && m.display === 'standalone' && m.theme_color === '#001e47')
  const sizes = m.icons.map((i) => i.sizes)
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'))
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'))
  for (const i of m.icons) { const n = Number(i.sizes.split('x')[0]); assert.deepEqual(png(i.src.slice(1)), [n, n], i.src) }
})
