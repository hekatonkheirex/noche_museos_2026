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
