import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeShort } from './olc.mjs'

test('olc: códigos cortos de Asunción', () => {
  assert.deepEqual(decodeShort('P9C7+P26'), { lat: -25.2782125, lon: -57.6374844 })
  assert.deepEqual(decodeShort('P9C5+Q8C'), { lat: -25.2780625, lon: -57.6417344 })
  assert.deepEqual(decodeShort('P9C7+P26, Asunción 001011'), decodeShort('P9C7+P26'))
})
test('olc: rechaza basura', () => assert.throws(() => decodeShort('hola')))
