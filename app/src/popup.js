// HTML del popup de una parada (Leaflet no es React: se arma como texto). Todo valor interpolado se escapa con esc().
import { esc, infoHtml } from './info.js'
import { BOLT_URL, destinoTexto, googleMapsUrl, uberUrl, wazeUrl } from './links.js'
import { svg } from './icons.js'
import { SWAP } from './colors.js'

const PILL_CSS = {
  swap: `background:${SWAP.bg};color:${SWAP.fg};border-color:${SWAP.ring}`,
  time: 'background:#f1f5f9;color:#334155;border-color:#cbd5e1',
}
// html: ya escapado por quien llama (puede llevar un svg)
const pillHtml = (kind, html) => `<span style="${PILL_CSS[kind]};border:1px solid;border-radius:9999px;padding:1px 8px;font:600 12px/1.5 system-ui;white-space:nowrap">${html}</span>`

// attrs (opcional): atributos HTML ya escapados (Bolt lo usa para su comportamiento propio, ver popupopen en App.jsx)
const navLink = (href, text, attrs = '') => `<a class="navpill" href="${esc(href)}" target="_blank" rel="noopener noreferrer" ${attrs}>${esc(text)}</a>`

// s: parada; k: letra de la ruta; also: otras rutas ("B, C" o ''); museo: ficha de museos-info.json (o undefined)
export function popupHtml(s, k, also, museo) {
  const pills = [
    s.swap ? pillHtml('swap', `${svg('swap', 12)} Intercambiador: Ruta ${esc(s.swap.join(' ↔ '))}`) : '',
    s.cierra ? pillHtml('time', `Hasta las ${esc(s.cierra)}`) : '',
  ].join('')
  const bolt = `data-bolt="1" data-lat="${esc(s.lat)}" data-lon="${esc(s.lon)}" data-name="${esc(s.nombre)}" data-copy="${esc(destinoTexto(s.nombre, museo?.direccion))}"`
  return `<b>${esc(s.nombre)}</b><br>Ruta ${esc(k)} · parada ${esc(s.orden)}` +
    (pills ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${pills}</div>` : '') +
    (also ? `<br>También en: ${esc(also)}` : '') +
    (s.approx ? '<br><i>Ubicación aproximada (calle)</i>' : '') +
    (museo ? infoHtml(museo) : '') +
    `<div class="navgrp"><span class="navlbl">Llegar</span><div class="navrow">${navLink(googleMapsUrl(s.lat, s.lon), 'Google Maps')}${navLink(wazeUrl(s.lat, s.lon), 'Waze')}</div></div>` +
    `<div class="navgrp"><span class="navlbl">Pedir viaje</span><div class="navrow">${navLink(uberUrl(s.lat, s.lon, s.nombre), 'Uber')}${navLink(BOLT_URL, 'Bolt', bolt)}</div></div>`
}
