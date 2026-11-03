// Flechas de sentido sobre el recorrido. Trabaja en píxeles de pantalla para que la densidad sea igual a cualquier zoom.
// points: [{x, y}] en píxeles, en el orden del recorrido. Devuelve [{x, y, angle}] (grados; 0 = hacia la derecha, 90 = hacia abajo, como CSS rotate).
// view (opcional): {x0, y0, x1, y1} área visible en los mismos píxeles. Solo se devuelven flechas dentro de ella y los tramos fuera se saltan
// sin recorrerlos flecha a flecha: a zoom alto un recorrido mide millones de píxeles y generar flechas de todo colgaba la página.
// Las posiciones no dependen de `view` (la fase se conserva), así que al desplazar el mapa las flechas no "bailan".
// max: tope duro de flechas devueltas (red de seguridad).
export function arrowsAlong(points, gap, view = null, max = 800) {
  if (!(gap > 0) || !Number.isFinite(gap)) return []
  const out = []
  let next = gap / 2 // la primera flecha a media distancia, así no se amontona en el punto de partida
  let done = 0 // distancia recorrida hasta el inicio del tramo actual
  const inView = (x, y) => !view || (x >= view.x0 && x <= view.x1 && y >= view.y0 && y <= view.y1)
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    if (len === 0 || !Number.isFinite(len)) continue
    const end = done + len
    const outside = view && Math.max(a.x, b.x) < view.x0 || view && Math.min(a.x, b.x) > view.x1 || view && Math.max(a.y, b.y) < view.y0 || view && Math.min(a.y, b.y) > view.y1
    if (outside) {
      if (next <= end) next += (Math.floor((end - next) / gap) + 1) * gap // salta las flechas de este tramo sin crearlas
    } else {
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI
      while (next <= end) {
        const t = (next - done) / len
        const x = a.x + dx * t, y = a.y + dy * t
        if (inView(x, y)) {
          if (out.length >= max) return out
          out.push({ x, y, angle })
        }
        next += gap
      }
    }
    done = end
  }
  return out
}

// Flecha SVG (punta a la derecha) girada `angle` grados. Relleno blanco y borde del color de la ruta: se lee sobre la línea de la ruta.
export const arrowHtml = (color, size, angle) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 12 12" style="transform:rotate(${Math.round(angle)}deg);display:block;filter:drop-shadow(0 0 1.5px #0009)"><path d="M1.5 1.5 L10.5 6 L1.5 10.5 L4 6 Z" fill="#fff" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`
