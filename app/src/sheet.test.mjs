import test from 'node:test'
import assert from 'node:assert/strict'
import { clampHeight, HEADER, nearestSnap, PEEK, sheetHeights, stepSnap, tapSnap } from './sheet.js'

test('sheetHeights: mínima fija, media = mitad de la pantalla, máxima deja visible el encabezado; orden creciente en pantallas chicas y grandes', () => {
  for (const vh of [480, 568, 667, 812, 932]) {
    const h = sheetHeights(vh)
    assert.equal(h.peek, PEEK)
    assert.ok(h.peek < h.half && h.half < h.full, `${vh}: ${JSON.stringify(h)}`)
    assert.ok(h.full <= Math.max(vh - HEADER, PEEK + 160))
  }
  assert.equal(sheetHeights(800).half, 400)
  assert.equal(sheetHeights(800).full, 704)
})

test('clampHeight: nunca baja de la mínima ni pasa de la máxima', () => {
  const h = sheetHeights(800)
  assert.equal(clampHeight(10, h), h.peek)
  assert.equal(clampHeight(5000, h), h.full)
  assert.equal(clampHeight(300, h), 300)
})

test('nearestSnap: sin inercia elige el más cercano; un gesto rápido hacia arriba o abajo salta de punto', () => {
  const h = sheetHeights(800) // 84 / 400 / 704
  assert.equal(nearestSnap(h, 120), 'peek')
  assert.equal(nearestSnap(h, 100), 'peek')
  assert.equal(nearestSnap(h, 380), 'half')
  assert.equal(nearestSnap(h, 600), 'full')
  assert.equal(nearestSnap(h, 300, 0), 'half')
  assert.equal(nearestSnap(h, 300, 1.5), 'half') // 300 + 1,5*120 = 480: sigue más cerca de half (400)
  assert.equal(nearestSnap(h, 300, 3.5), 'full') // 300 + 3,5*120 = 720 -> full
  assert.equal(nearestSnap(h, 380, 3), 'full') // 380 + 360 = 740 -> full
  assert.equal(nearestSnap(h, 380, -3), 'peek') // 380 - 360 = 20 -> peek
})

test('tapSnap y stepSnap: toque alterna mínima/media; teclado sube y baja sin pasarse de los extremos', () => {
  assert.equal(tapSnap('peek'), 'half'); assert.equal(tapSnap('half'), 'peek'); assert.equal(tapSnap('full'), 'peek')
  assert.equal(stepSnap('peek', 1), 'half'); assert.equal(stepSnap('half', 1), 'full'); assert.equal(stepSnap('full', 1), 'full')
  assert.equal(stepSnap('full', -1), 'half'); assert.equal(stepSnap('peek', -1), 'peek')
})
