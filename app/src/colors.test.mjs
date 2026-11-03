import test from 'node:test'
import assert from 'node:assert/strict'
import { COLORS, INK, contrast } from './colors.js'

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
