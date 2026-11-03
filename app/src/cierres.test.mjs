import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cierreRuns } from './cierres.js'

const s = (orden, cierra) => ({ orden, cierra })

test('cierreRuns: una pastilla por tramo de paradas seguidas con la misma hora; solas dicen "Hasta las"', () => {
  const r = cierreRuns([s(1), s(2, '23:00'), s(3, '23:00'), s(4, '23:00'), s(5), s(6, '22:00'), s(7, '23:00')])
  assert.deepEqual(r, [null, 'Paradas 2–4 · hasta las 23:00', null, null, null, 'Hasta las 22:00', 'Hasta las 23:00'])
})

test('cierreRuns: una hora distinta corta el tramo; vacío y sin cierres no rompen', () => {
  assert.deepEqual(cierreRuns([s(1, '22:00'), s(2, '22:00'), s(3, '23:00'), s(4, '23:00')]), ['Paradas 1–2 · hasta las 22:00', null, 'Paradas 3–4 · hasta las 23:00', null])
  assert.deepEqual(cierreRuns([]), [])
  assert.deepEqual(cierreRuns([s(1), s(2)]), [null, null])
})

test('datos reales: cada parada con cierre queda cubierta por exactamente un aviso (el suyo o el de su tramo)', () => {
  const d = JSON.parse(readFileSync(new URL('./data.json', import.meta.url))).routes
  const cierres = JSON.parse(readFileSync(new URL('./cierres.json', import.meta.url)))
  let shown = 0, withCierre = 0
  for (const stops of Object.values(d)) {
    const withC = stops.map((x) => ({ ...x, cierra: cierres[x.nombre] }))
    const r = cierreRuns(withC)
    withCierre += withC.filter((x) => x.cierra).length
    shown += r.filter(Boolean).length
    withC.forEach((x, i) => { if (r[i]) assert.match(r[i], new RegExp(x.cierra)) })
  }
  assert.ok(withCierre > 0 && shown < withCierre, `${shown} avisos para ${withCierre} paradas con cierre`)
})
