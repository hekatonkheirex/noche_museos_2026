// Separa los recorridos que comparten calle: cada tramo compartido se reparte en carriles paralelos.
// Ida y vuelta por la misma calle quedan cada una a la derecha de su sentido de marcha (como el tránsito).
const key = (p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}` // ~1 m: los vértices que comparten calle coinciden

// paths: { id: [[lat, lon], ...] } -> { id: number[] }, un valor por tramo (n puntos -> n-1 valores):
// carriles a desplazar respecto al eje, medidos hacia la IZQUIERDA del sentido de marcha (negativo = derecha).
export function laneUnits(paths) {
  const users = new Map() // arista (sin sentido) -> Set de "id|sentido"
  const segs = {} // id -> [{ edge, dir }]
  for (const [id, pts] of Object.entries(paths)) {
    segs[id] = []
    for (let i = 1; i < pts.length; i++) {
      const a = key(pts[i - 1]), b = key(pts[i])
      if (a === b) { segs[id].push(null); continue }
      const edge = a < b ? `${a}|${b}` : `${b}|${a}`
      const dir = a < b ? 1 : -1 // sentido respecto de la orientación canónica de la arista
      segs[id].push({ edge, dir })
      if (!users.has(edge)) users.set(edge, new Set())
      users.get(edge).add(`${id}|${dir}`)
    }
  }
  // Orden de carriles: primero los que van en sentido canónico (a la derecha del canónico), luego los contrarios; dentro, por id
  const lanes = new Map()
  for (const [edge, set] of users) {
    const list = [...set].map((u) => { const [id, d] = u.split('|'); return { u, id, d: Number(d) } })
    list.sort((x, y) => y.d - x.d || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    lanes.set(edge, new Map(list.map((e, i) => [e.u, i - (list.length - 1) / 2])))
  }
  const out = {}
  for (const [id, list] of Object.entries(segs)) {
    out[id] = list.map((s) => {
      if (!s) return 0
      const p = lanes.get(s.edge).get(`${id}|${s.dir}`) // posición en el marco canónico (positivo = izquierda del sentido canónico)
      return p * s.dir || 0 // la izquierda de quien viaja en sentido contrario es la derecha del canónico: se invierte con `dir`
    })
  }
  return out
}

// Desplaza puntos de pantalla [{x, y}] según `units` (uno por tramo) * spacing px, perpendicular al sentido de marcha.
// En pantalla (y hacia abajo) la izquierda del sentido (dx, dy) es (dy, -dx).
export function offsetPath(points, units, spacing) {
  const seg = []
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x, dy = points[i].y - points[i - 1].y
    const len = Math.hypot(dx, dy)
    const k = len === 0 ? 0 : (units[i - 1] * spacing) / len
    seg.push({ x: dy * k, y: -dx * k })
  }
  return points.map((p, j) => {
    const a = seg[j - 1], b = seg[j]
    const o = a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a ?? b ?? { x: 0, y: 0 }
    return { x: p.x + o.x, y: p.y + o.y }
  })
}
