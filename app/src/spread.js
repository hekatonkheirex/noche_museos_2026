// Separa puntos de pantalla que se tapan entre sí. points: [{x, y, r}] (r = radio en px). Devuelve [{x, y}] en el mismo orden.
// Relajación por pares: cada par más cerca que r1 + r2 + gap se aleja a partes iguales a lo largo de la línea que los une.
// Puntos en el mismo lugar se reparten en abanico con el ángulo áureo (determinista). Un punto aislado no se mueve.
const GOLDEN = 2.399963229728653

export function spread(points, gap = 1, maxIter = 60) {
  const p = points.map(({ x, y }) => ({ x, y }))
  for (let it = 0; it < maxIter; it++) {
    let moved = false
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const need = points[i].r + points[j].r + gap
        let dx = p[j].x - p[i].x, dy = p[j].y - p[i].y
        let d = Math.hypot(dx, dy)
        if (d >= need) continue
        if (d < 1e-6) { const a = (i + j + it) * GOLDEN; dx = Math.cos(a); dy = Math.sin(a); d = 1 }
        const push = (need - d) / 2 / d
        p[i].x -= dx * push; p[i].y -= dy * push
        p[j].x += dx * push; p[j].y += dy * push
        moved = true
      }
    }
    if (!moved) break
  }
  return p
}
