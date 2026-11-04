// Hoja inferior del celular: tres alturas ("peek" = solo asa y chips de ruta, "half", "full") y arrastre con inercia.
export const PEEK = 84 // px: asa (24) + fila de chips (4 + 44 + 12): al asomar se ve solo el selector de ruta
export const HEADER = 96 // px: el encabezado con el logo queda siempre visible arriba

export const sheetHeights = (viewportH) => ({ peek: PEEK, half: Math.max(PEEK + 80, Math.round(viewportH * 0.5)), full: Math.max(PEEK + 160, viewportH - HEADER) })

export const clampHeight = (h, heights) => Math.min(heights.full, Math.max(heights.peek, h))

// Punto de anclaje al soltar: el más cercano a la altura proyectada con la velocidad del gesto (px/ms, positiva = hacia arriba).
export function nearestSnap(heights, h, velocity = 0) {
  const target = clampHeight(h + velocity * 120, heights)
  return Object.entries(heights).sort((a, b) => Math.abs(a[1] - target) - Math.abs(b[1] - target))[0][0]
}

// Un toque (sin arrastre) sobre el asa alterna entre mínima y media.
export const tapSnap = (snap) => (snap === 'peek' ? 'half' : 'peek')

// Teclado: flecha arriba sube un punto, abajo baja uno.
const ORDER = ['peek', 'half', 'full']
export const stepSnap = (snap, dir) => ORDER[Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(snap) + dir))]

// ¿Queda lista por ver debajo? (tolerancia de 4 px por redondeos; con alto 0, hoja asomada, no hay nada que avisar)
export const hasMore = ({ scrollTop, clientHeight, scrollHeight }) => clientHeight > 0 && scrollHeight - scrollTop - clientHeight > 4
