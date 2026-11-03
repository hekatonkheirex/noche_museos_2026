import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { emails, esc, infoHtml, instagrams, phones, webUrl } from './info.js'

const info = JSON.parse(readFileSync(new URL('./museos-info.json', import.meta.url)))

test('esc: neutraliza HTML', () => assert.equal(esc(`<img src=x onerror="a('b')">&`), '&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;'))

test('phones: varios números, notas entre paréntesis y números sin prefijo internacional', () => {
  assert.deepEqual(phones('+595 21 447 311 +595 961 196 769'), [{ text: '+595 21 447 311', tel: '+59521447311' }, { text: '+595 961 196 769', tel: '+595961196769' }])
  assert.deepEqual(phones('+595 21 442 448 (int. 120) +595 21 492 524').map((p) => p.tel), ['+59521442448', '+59521492524'])
  assert.equal(phones('+595 21 619 2141 +595 983 477 681 (Departamento de Cultura)')[1].tel, '+595983477681')
  assert.deepEqual(phones('021 123 456'), [{ text: '021 123 456', tel: null }])
  assert.deepEqual(phones(''), [])
})

test('emails, instagrams y webUrl: formatos reales del sitio', () => {
  assert.deepEqual(emails('david.velazquez@unves.edu.py / velazquezd@hotmail.es'), ['david.velazquez@unves.edu.py', 'velazquezd@hotmail.es'])
  assert.deepEqual(emails('no es un correo'), [])
  assert.deepEqual(instagrams('@manzanadelarivera @culturaasu'), ['manzanadelarivera', 'culturaasu'])
  assert.equal(webUrl('www.mre.gov.py'), 'https://www.mre.gov.py')
  assert.equal(webUrl('muci.org/'), 'https://muci.org')
  assert.equal(webUrl('https://www.bcp.gov.py/cultural/'), 'https://www.bcp.gov.py/cultural')
  assert.equal(webUrl('javascript:alert(1)'), null)
  assert.equal(webUrl('x.com"><script>'), null)
})

test('infoHtml: campos hostiles no inyectan HTML ni esquemas peligrosos', () => {
  const h = infoHtml({ horarios: '<script>a()</script>', direccion: '"><img src=x onerror=a()>', contacto: '+595 21 123 456<b>', correo: 'a@b.co"onmouseover="x', web: 'javascript:alert(1)', instagram: '@ok" onclick="x', descripcion: '<iframe>' })
  assert.ok(!h.includes('<script') && !h.includes('<img') && !h.includes('<iframe'))
  assert.ok(!/href="javascript:/i.test(h))
  assert.ok(!/<[^>]+\son(error|mouseover|click)=/i.test(h)) // ningún atributo de evento dentro de una etiqueta real
})

test('infoHtml: muestra horario habitual, dirección y teléfono con enlace tel:', () => {
  const h = infoHtml(info['Archivo Nacional de Asunción'])
  assert.ok(h.includes('Horario habitual') && h.includes('Mariscal Estigarribia e Iturbe'))
  assert.ok(h.includes('href="tel:+59521447311"'))
  assert.ok(h.includes('Más información') && h.includes('Fuente: nochedemuseos.org.py'))
})

test('datos reales: todas las fichas generan HTML con enlaces solo tel:, mailto: o https:', () => {
  assert.ok(Object.keys(info).length >= 24)
  for (const [name, f] of Object.entries(info)) {
    const h = infoHtml(f)
    assert.ok(h.includes('Dirección'), name)
    for (const [, href] of h.matchAll(/href="([^"]*)"/g)) assert.match(href, /^(tel:\+\d+|mailto:[^\s"]+|https:\/\/[\w.-]+[^\s"]*)$/, `${name}: ${href}`)
    assert.ok(!/<(script|iframe|img)\b/i.test(h), name)
  }
})

test('css: los botones del popup (.navpill) ganan a la regla de enlaces de Leaflet y quedan con texto blanco', () => {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  assert.match(css, /\.leaflet-container a\.navpill\s*\{\s*color:\s*#fff/) // especificidad mayor que `.leaflet-container a`
  assert.match(css, /\.navrow\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(/) // grilla que apila en vez de dejar un botón suelto
})
