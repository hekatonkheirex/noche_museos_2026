import data from './data.json'
import geo from './routes-geo.json' // node scripts/route.mjs
import cierres from './cierres.json' // horario de cierre anticipado (el resto: sin dato)
import swaps from './intercambiadores.json' // fuente: Instagram @nochedelosmuseos, posts 2-9 de 10

import { COLORS, INK } from './colors.js' // un color por ruta; INK = versión con contraste AA para texto y pines
// Cada parada sabe en qué otras rutas aparece.

const where = {}
for (const [k, stops] of Object.entries(data.routes)) for (const s of stops) (where[s.nombre] ??= []).push(k)

export const routes = Object.fromEntries(
  Object.entries(data.routes).map(([k, stops]) => [
    k,
    { color: COLORS[k], ink: INK[k], stops: stops.map((s) => ({ ...s, also: where[s.nombre], swap: swaps[s.nombre], cierra: cierres[s.nombre] })), pending: data.pending[k] ?? [], path: geo[k] },
  ]),
)
