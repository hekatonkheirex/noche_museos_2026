import data from './data.json'
import geo from './routes-geo.json' // node scripts/route.mjs
import cierres from './cierres.json' // horario de cierre anticipado (el resto: sin dato)
import swaps from './intercambiadores.json' // fuente: Instagram @nochedelosmuseos, posts 2-9 de 10

// Un color por ruta (paleta distinguible). Cada parada sabe en qué otras rutas aparece.
const COLORS = { A: '#e11d48', B: '#2563eb', C: '#16a34a', D: '#d97706', E: '#9333ea', F: '#0891b2', G: '#4b5563' }

const where = {}
for (const [k, stops] of Object.entries(data.routes)) for (const s of stops) (where[s.nombre] ??= []).push(k)

export const routes = Object.fromEntries(
  Object.entries(data.routes).map(([k, stops]) => [
    k,
    { color: COLORS[k], stops: stops.map((s) => ({ ...s, also: where[s.nombre], swap: swaps[s.nombre], cierra: cierres[s.nombre] })), pending: data.pending[k] ?? [], path: geo[k] },
  ]),
)
