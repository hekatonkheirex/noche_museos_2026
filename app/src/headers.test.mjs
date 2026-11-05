import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const headers = Object.fromEntries(JSON.parse(read('../vercel.json')).headers[0].headers.map((h) => [h.key, h.value]))
const csp = Object.fromEntries(headers['Content-Security-Policy'].split('; ').map((d) => { const [k, ...v] = d.split(' '); return [k, v] }))

test('vercel.json: cabeceras de seguridad presentes', () => {
  assert.equal(headers['X-Content-Type-Options'], 'nosniff')
  assert.ok(headers['Referrer-Policy'])
  assert.match(headers['Strict-Transport-Security'], /max-age=\d{7,}/)
  assert.match(headers['Permissions-Policy'], /geolocation=\(self\)/) // el botón "Dónde estoy" lo necesita
  assert.match(headers['Permissions-Policy'], /camera=\(\)/)
})

test('CSP: sin unsafe-inline ni unsafe-eval en scripts, sin objetos, sin iframes ajenos', () => {
  assert.ok(!csp['script-src'].some((s) => /unsafe-/.test(s) || s === '*' || s === 'https:'))
  assert.deepEqual(csp['object-src'], ["'none'"])
  assert.deepEqual(csp['frame-ancestors'], ["'none'"])
  assert.deepEqual(csp['base-uri'], ["'self'"])
  assert.deepEqual(csp['form-action'], ["'none'"])
})

test('CSP: los hashes cubren exactamente los scripts inline de index.html (si cambia uno, regenerar vercel.json)', () => {
  const inline = [...read('../index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`)
  assert.ok(inline.length >= 2)
  assert.deepEqual(csp['script-src'].filter((s) => s.startsWith("'sha256-")).sort(), inline.sort())
})

test('CSP: los únicos orígenes externos son el mapa de respaldo (basemap.js FALLBACK_STYLE)', () => {
  const fallback = new URL(read('./basemap.js').match(/FALLBACK_STYLE = '([^']+)'/)[1]).origin
  const external = Object.values(csp).flat().filter((s) => s.startsWith('https://'))
  assert.ok(external.length > 0 && external.every((s) => s === fallback), external.join())
})
