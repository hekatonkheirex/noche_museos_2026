import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { popupHtml } from './popup.js'

const museos = JSON.parse(readFileSync(new URL('./museos-info.json', import.meta.url)))
const data = JSON.parse(readFileSync(new URL('./data.json', import.meta.url)))
const X = '<img src=x onerror=alert(1)>"\''
const evil = { nombre: X, orden: X, lat: -25.3, lon: -57.6, swap: [X, 'B'], cierra: X, approx: true }

test('popup: ningún campo de la parada inyecta HTML (nombre, orden, ruta, también en, intercambio, cierre)', () => {
  const h = popupHtml(evil, X, X, undefined)
  assert.ok(!h.includes('<img'), h)
  assert.equal((h.match(/&lt;img/g) ?? []).length, 8) // título, orden, ruta, también en, swap, cierre, data-name, data-copy
})

test('popup: los atributos data-* del botón Bolt no se pueden cerrar con comillas', () => {
  const h = popupHtml(evil, 'A', '', { direccion: X })
  const bolt = h.match(/<a [^>]*data-bolt[^>]*>/)[0]
  assert.equal((bolt.match(/"/g) ?? []).length % 2, 0)
  assert.ok(!bolt.includes(X))
})

test('popup: todas las paradas reales producen enlaces https y sin HTML crudo', () => {
  for (const [k, stops] of Object.entries(data.routes)) for (const s of stops) {
    const h = popupHtml({ ...s, swap: s.swap ?? undefined, also: undefined }, k, '', museos[s.nombre])
    for (const [, href] of h.matchAll(/<a [^>]*?href="([^"]*)"/g)) assert.match(href, /^(https:\/\/|tel:\+|mailto:)/, `${s.nombre}: ${href}`)
    assert.ok(!/<(script|iframe|img)\b/i.test(h), s.nombre)
  }
})
