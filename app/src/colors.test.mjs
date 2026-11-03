import test from 'node:test'
import assert from 'node:assert/strict'
import { COLORS, INK, NIGHT, NIGHT_BG, contrast } from './colors.js'

test('contrast: valores conocidos (negro/blanco 21, igual 1, simétrico)', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21)
  assert.equal(contrast('#336699', '#336699'), 1)
  assert.equal(contrast('#e11d48', '#ffffff'), contrast('#ffffff', '#e11d48'))
})

test('INK: texto de ruta sobre blanco y número blanco sobre el pin llegan a 4,5:1 (AA) en las 7 rutas', () => {
  for (const [k, c] of Object.entries(INK)) assert.ok(contrast(c, '#ffffff') >= 4.5, `${k} ${c}: ${contrast(c, '#ffffff').toFixed(2)}`)
})

test('INK se parece a COLORS (mismo tono: no cambia la identidad de la ruta) y solo C, D y F se oscurecen', () => {
  assert.deepEqual(Object.keys(INK), Object.keys(COLORS))
  assert.deepEqual(Object.keys(COLORS).filter((k) => INK[k] !== COLORS[k]), ['C', 'D', 'F'])
})

test('NIGHT: texto de ruta sobre el fondo del modo noche llega a 4,5:1 en las 7 rutas', () => {
  assert.deepEqual(Object.keys(NIGHT), Object.keys(COLORS))
  for (const [k, c] of Object.entries(NIGHT)) assert.ok(contrast(c, NIGHT_BG) >= 4.5, `${k} ${c}: ${contrast(c, NIGHT_BG).toFixed(2)}`)
})

test('oro del logo: la pastilla de intercambiador se lee (texto sobre fondo >= 7:1) y el halo contrasta con el blanco del contorno del pin', async () => {
  const { GOLD, SWAP } = await import('./colors.js')
  assert.ok(contrast(SWAP.fg, SWAP.bg) >= 7, contrast(SWAP.fg, SWAP.bg).toFixed(2))
  assert.equal(SWAP.ring, GOLD)
  assert.match(GOLD, /^#[0-9a-f]{6}$/)
})
