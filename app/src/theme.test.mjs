import test from 'node:test'
import assert from 'node:assert/strict'
import { effectiveTheme, otherTheme } from './theme.js'

test('effectiveTheme: la elección guardada manda; sin elección sigue al sistema', () => {
  assert.equal(effectiveTheme('dark', false), 'dark')
  assert.equal(effectiveTheme('light', true), 'light')
  assert.equal(effectiveTheme(null, true), 'dark')
  assert.equal(effectiveTheme(null, false), 'light')
  assert.equal(effectiveTheme('basura', true), 'dark') // valor guardado inválido = como sin elección
})

test('otherTheme alterna', () => { assert.equal(otherTheme('dark'), 'light'); assert.equal(otherTheme('light'), 'dark') })
