import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildInfo, norm, readJson, stopNames } from './build-info.mjs'

const fichas = readJson('scripts/fichas.json')
const aliases = readJson('scripts/info-alias.json')
const stops = stopNames()
const FETCH = fileURLToPath(new URL('./fetch-fichas.py', import.meta.url)) // ruta absoluta: el test corre desde la raíz o desde app/

test('norm: ignora tildes, comillas, puntuación y orden de palabras', () => {
  assert.equal(norm('Museo de Ciencias (MuCi)'), norm('MuCi Museo de Ciencias'))
  assert.equal(norm('Casa Bicentenario de la Música “Agustín Pío Barrios”'), norm('Casa Bicentenario de la Música Agustín Pío Barrios'))
  assert.notEqual(norm('Museo de Numismática y Joyas del Banco Central'), norm('Museo de Arte e Historia Colonial Banco Central'))
})

test('extractor (python): rótulos conocidos, descripción multilínea y "Algo:" dentro de la descripción no es un campo', () => {
  const page = `<div data-testid="richTextElement"><p>Museo &ldquo;Prueba&rdquo;</p><p>Categor&iacute;a: ARTE<br>Direcci&oacute;n: Calle 1 &amp; 2</p><p>Horarios: lunes a viernes</p>
    <p>Descripci&oacute;n: Primera l&iacute;nea</p><p>segunda l&iacute;nea</p><p>Exposiciones: sala A</p><p>Funci&oacute;n principal: Mostrar</p></div>`
  const out = JSON.parse(execFileSync('python3', ['-c', `import importlib.util as u, json, sys
s = u.spec_from_file_location('ff', sys.argv[1]); m = u.module_from_spec(s); s.loader.exec_module(m)
print(json.dumps(m.parse_page(sys.stdin.read()), ensure_ascii=False))`, FETCH], { input: page, encoding: 'utf8' }))
  assert.deepEqual(out, [{ nombre: 'Museo “Prueba”', categoria: 'ARTE', direccion: 'Calle 1 & 2', horarios: 'lunes a viernes', descripcion: 'Primera línea segunda línea Exposiciones: sala A', funcion: 'Mostrar' }])
})

test('fichas.json: 42 fichas con nombre, dirección, contacto y horarios', () => {
  assert.ok(fichas.length >= 40)
  for (const f of fichas) for (const k of ['nombre', 'direccion', 'contacto', 'horarios', 'categoria']) assert.ok(f[k], `${f.nombre}: falta ${k}`)
  assert.equal(new Set(fichas.map((f) => f.nombre)).size, fichas.length)
})

test('alias: cada clave es una parada real y cada destino una ficha real', () => {
  for (const [stop, nombre] of Object.entries(aliases)) {
    assert.ok(stops.includes(stop), `parada inexistente: ${stop}`)
    assert.ok(fichas.some((f) => f.nombre === nombre), `ficha inexistente: ${nombre}`)
  }
})

test('cruce: sin coincidencia aproximada (museos distintos del mismo organismo no se mezclan)', () => {
  const { info, sinFicha } = buildInfo(fichas, aliases, stops)
  assert.ok(info['Museo de Numismática y Joyas Banco Central del Paraguay'].direccion.includes('Federación Rusa'))
  for (const s of ['Museo de Arte e Historia Colonial Banco Central del Paraguay', 'Banco Central del Paraguay', 'Museo Nacional de Historia Natural del Paraguay', 'Templo Histórico de Palma Gran Logia Simbólica del Paraguay'])
    assert.ok(sinFicha.includes(s), s)
  assert.ok(Object.keys(info).length >= 24)
  assert.equal(Object.keys(info).length + sinFicha.length, stops.length)
})

test('museos-info.json está al día con fichas.json, alias y data.json (node scripts/build-info.mjs)', () => {
  assert.deepEqual(readJson('app/src/museos-info.json'), buildInfo(fichas, aliases, stops).info)
})
