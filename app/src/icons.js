// Íconos SVG de una sola familia (trazo 2, estilo Lucide, licencia ISC) en vez de símbolos Unicode, que cada sistema dibuja distinto.
export const ICONS = {
  swap: 'M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4', // flechas izquierda-derecha: intercambiador
  down: 'M12 5v14M5 12l7 7 7-7', // más contenido abajo
  arrow: 'M5 12h14M12 5l7 7-7 7', // sentido del recorrido
  locate: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM2 12h3M19 12h3M12 2v3M12 19v3', // dónde estoy
  crosshair: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM22 12h-4M6 12H2M12 6V2M12 22v-4', // centrar
  close: 'M6 6l12 12M18 6L6 18',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
  sun: 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
}

// Mismo ícono como texto HTML (popups y pines de Leaflet, que no son React). currentColor: toma el color del texto.
export const svg = (name, size = 14, style = '') =>
  `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;${style}"><path d="${ICONS[name]}"/></svg>`
