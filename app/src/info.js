// Bloque de información de una parada (datos de https://www.nochedemuseos.org.py/museos-info, ver scripts/fetch-fichas.py).
// Los textos vienen de un sitio de terceros: todo se escapa y los enlaces se construyen solo con tel:, mailto: y https:// validados.
const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ENT[c])

// "+595 21 442 448 (int. 120) +595 21 492 524" -> [{ text, tel }]; tel = null si no es un número internacional reconocible
export function phones(contacto = '') {
  return contacto.split(/\s+(?=\+\d)/).map((t) => t.trim()).filter(Boolean).map((text) => {
    const num = text.replace(/\(.*$/, '').replace(/[^\d+]/g, '')
    return { text, tel: /^\+\d{8,15}$/.test(num) ? num : null }
  })
}

export const emails = (correo = '') => correo.split(/[\s/,;]+/).filter((e) => /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(e))
export const instagrams = (ig = '') => (ig.match(/@[\w.]+/g) ?? []).map((h) => h.slice(1))

// "www.mre.gov.py" / "muci.org/" / "https://www.bcp.gov.py/cultural/" -> https://... (o null si no parece una dirección web)
export function webUrl(web = '') {
  const w = web.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  return /^[\w.-]+\.[a-z]{2,}(\/[\w\-./%~+]*)?$/i.test(w) ? `https://${w}` : null
}

const link = (href, text) => `<a class="pop-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`
const row = (label, html) => `<div><b>${label}:</b> ${html}</div>`

export function infoHtml(f) {
  const main = []
  if (f.horarios) main.push(row('Horario habitual', esc(f.horarios)))
  if (f.direccion) main.push(row('Dirección', esc(f.direccion)))
  const tel = phones(f.contacto).map((p) => (p.tel ? link(`tel:${p.tel}`, p.text) : esc(p.text)))
  if (tel.length) main.push(row('Teléfono', tel.join(' · ')))

  const more = []
  const kind = [f.categoria, f.subcategoria].filter(Boolean).join(' · ')
  if (kind) more.push(`<div><i>${esc(kind)}</i></div>`)
  if (f.dependencia) more.push(row('Dependencia', esc(f.dependencia)))
  if (f.descripcion) more.push(`<p style="margin:6px 0">${esc(f.descripcion)}</p>`)
  if (f.funcion) more.push(`<p style="margin:6px 0"><b>Función principal:</b> ${esc(f.funcion)}</p>`)
  const url = webUrl(f.web)
  if (f.web) more.push(row('Sitio web', url ? link(url, url.replace('https://', '')) : esc(f.web)))
  const mails = emails(f.correo)
  if (mails.length) more.push(row('Correo', mails.map((m) => link(`mailto:${m}`, m)).join(' · ')))
  const igs = instagrams(f.instagram)
  if (igs.length) more.push(row('Instagram', igs.map((h) => link(`https://www.instagram.com/${h}/`, `@${h}`)).join(' · ')))
  if (f.facebook) more.push(row('Facebook', esc(f.facebook)))
  more.push('<div class="pop-muted" style="margin-top:6px;font-size:12px">Fuente: nochedemuseos.org.py</div>')

  return `<div class="pop-sep" style="margin-top:8px;padding-top:6px;font-size:13px;line-height:1.5">${main.join('')}` +
    `<details style="margin-top:4px"><summary style="cursor:pointer;font-weight:600">Más información</summary>` +
    `<div style="max-height:170px;overflow:auto;margin-top:4px">${more.join('')}</div></details></div>`
}
