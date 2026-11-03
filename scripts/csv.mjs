// Parser CSV mínimo (comillas, comas dentro de comillas, BOM). Devuelve [{col: valor}].
export function parseCsv(text) {
  text = text.replace(/^﻿/, '')
  const recs = []
  let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur); cur = ''
      if (row.some((x) => x !== '')) recs.push(row)
      row = []
    } else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); recs.push(row) }
  const [head, ...body] = recs
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])))
}
