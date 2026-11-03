// Mapa base: teselas Protomaps de Gran Asunción alojadas en este mismo sitio (public/asuncion.pmtiles, fuentes y sprites en public/map/).
// Si fallan, App.jsx cambia a OpenFreeMap (FALLBACK_STYLE). Regenerar teselas: ver README.
import { layers, namedFlavor } from '@protomaps/basemaps'

export const FALLBACK_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
export const SOURCE = 'protomaps'

// Fuera del recorte (public/asuncion.pmtiles) no hay polígono de tierra: el fondo toma el color de tierra para no ver bandas grises
const flavor = { ...namedFlavor('light'), background: namedFlavor('light').earth }

export function buildStyle(origin) {
  return {
    version: 8,
    glyphs: `${origin}/map/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/map/sprites/light`,
    sources: {
      [SOURCE]: {
        type: 'vector',
        url: `pmtiles://${origin}/asuncion.pmtiles`,
        attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank">Protomaps</a>',
      },
    },
    layers: layers(SOURCE, flavor, { lang: 'es' }),
  }
}
