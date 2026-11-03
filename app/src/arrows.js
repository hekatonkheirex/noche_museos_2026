// Flechas de sentido sobre el recorrido. Trabaja en píxeles de pantalla para que la densidad sea igual a cualquier zoom.
// points: [{x, y}] en píxeles, en el orden del recorrido. Devuelve [{x, y, angle}] (grados; 0 = hacia la derecha, 90 = hacia abajo, como CSS rotate).
export function arrowsAlong(points, gap) {
  const out = []
  let next = gap / 2 // la primera flecha a media distancia, así no se amontona en el punto de partida
  let done = 0 // distancia recorrida hasta el inicio del tramo actual
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len === 0) continue
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    while (next <= done + len) {
      const t = (next - done) / len
      out.push({ x: a.x + dx * t, y: a.y + dy * t, angle })
      next += gap
    }
    done += len
  }
  return out
}

// Flecha SVG (punta a la derecha) girada `angle` grados. Relleno blanco y borde del color de la ruta: se lee sobre la línea de la ruta.
export const arrowHtml = (color, size, angle) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 12 12" style="transform:rotate(${Math.round(angle)}deg);display:block;filter:drop-shadow(0 0 1.5px #0009)"><path d="M1.5 1.5 L10.5 6 L1.5 10.5 L4 6 Z" fill="#fff" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`
