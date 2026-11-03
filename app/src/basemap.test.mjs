import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, statSync } from 'node:fs'
import { buildStyle, EARTH, SOURCE } from './basemap.js'

const s = buildStyle('https://x.test')

test('estilo apunta al origen propio, sin hosts de terceros', () => {
  assert.equal(s.sources[SOURCE].url, 'pmtiles://https://x.test/asuncion.pmtiles')
  assert.equal(s.glyphs, 'https://x.test/map/fonts/{fontstack}/{range}.pbf')
  assert.equal(s.sprite, 'https://x.test/map/sprites/light')
  assert.ok(!JSON.stringify(s).includes('protomaps.github.io'))
})

test('todas las capas usan nuestra fuente y hay capas', () => {
  assert.ok(s.layers.length > 50)
  for (const l of s.layers) if (l.source) assert.equal(l.source, SOURCE)
})

test('cada fuente de texto del estilo existe en public/map/fonts (rango Latin básico)', () => {
  const fonts = new Set(JSON.stringify(s.layers).match(/Noto Sans (Regular|Medium|Italic)/g))
  assert.ok(fonts.size > 0)
  for (const f of fonts) assert.ok(existsSync(new URL(`../public/map/fonts/${f}/0-255.pbf`, import.meta.url)), f)
})

test('sprites presentes y, si existe, asuncion.pmtiles es válido (va en Git LFS: ver README)', () => {
  const tiles = new URL('../public/asuncion.pmtiles', import.meta.url)
  if (existsSync(tiles)) assert.ok(statSync(tiles).size > 1e6)
  for (const p of ['map/sprites/light.json', 'map/sprites/light.png', 'map/sprites/light@2x.png'])
    assert.ok(statSync(new URL(`../public/${p}`, import.meta.url)).size > 1000, p)
})

test('fondo = color de tierra (sin bandas grises fuera del recorte)', () => {
  const bg = s.layers.find((l) => l.type === 'background')
  assert.equal(bg.paint['background-color'], '#e2dfda')
})

test('estilo oscuro: sprite oscuro propio, mismas fuentes y fondo = tierra oscura; el claro no cambia', () => {
  const d = buildStyle('https://x.test', 'dark'), l = buildStyle('https://x.test')
  assert.equal(d.sprite, 'https://x.test/map/sprites/dark')
  assert.equal(l.sprite, 'https://x.test/map/sprites/light')
  assert.equal(d.glyphs, l.glyphs)
  assert.equal(d.layers.find((x) => x.type === 'background').paint['background-color'], EARTH.dark)
  assert.equal(l.layers.find((x) => x.type === 'background').paint['background-color'], EARTH.light)
  assert.notEqual(EARTH.dark, EARTH.light)
  for (const f of ['dark.json', 'dark.png', 'dark@2x.json', 'dark@2x.png']) assert.ok(statSync(new URL(`../public/map/sprites/${f}`, import.meta.url)).size > 500, f)
})
