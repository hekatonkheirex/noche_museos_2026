// scripts/fichas.json (python3 scripts/fetch-fichas.py) + app/src/data.json -> app/src/museos-info.json: ficha de cada parada.
// Coincidencia: mismo nombre normalizado (sin tildes, comillas ni orden de palabras) o alias verificado a mano en scripts/info-alias.json.
// No se usa coincidencia aproximada: preferimos no mostrar datos a mostrar la dirección de otro lugar. Uso: node scripts/build-info.mjs
import { readFileSync, writeFileSync } from 'node:fs'

export const norm = (s) =>
  [...new Set(s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' '))].sort().join(' ')

const KEEP = ['categoria', 'subcategoria', 'dependencia', 'direccion', 'contacto', 'correo', 'web', 'facebook', 'instagram', 'twitter', 'youtube', 'horarios', 'descripcion', 'funcion']

// stops: nombres de paradas; devuelve { info: { parada: ficha }, sinFicha: [paradas] }
export function buildInfo(fichas, aliases, stops) {
  const byNorm = new Map(fichas.map((f) => [norm(f.nombre), f]))
  const byName = new Map(fichas.map((f) => [f.nombre, f]))
  const info = {}
  const sinFicha = []
  for (const stop of [...stops].sort()) {
    const f = aliases[stop] ? byName.get(aliases[stop]) : byNorm.get(norm(stop))
    if (!f) { sinFicha.push(stop); continue }
    info[stop] = Object.fromEntries(KEEP.filter((k) => f[k]).map((k) => [k, f[k]]))
  }
  return { info, sinFicha }
}

const root = new URL('../', import.meta.url)
export const readJson = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))
export const stopNames = () => [...new Set(Object.values(readJson('app/src/data.json').routes).flat().map((s) => s.nombre))]

if (import.meta.url === `file://${process.argv[1]}`) {
  const { info, sinFicha } = buildInfo(readJson('scripts/fichas.json'), readJson('scripts/info-alias.json'), stopNames())
  writeFileSync(new URL('app/src/museos-info.json', root), JSON.stringify(info, null, 1) + '\n')
  console.log(`${Object.keys(info).length} paradas con ficha, ${sinFicha.length} sin ficha`)
  console.log('Sin ficha en museos-info:\n  ' + sinFicha.join('\n  '))
}
