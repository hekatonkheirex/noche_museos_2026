// Un color por ruta (paleta distinguible). COLORS = líneas y flechas del mapa (vivos). INK = texto y relleno de pines con número blanco:
// versiones más oscuras donde el color vivo no llega a 4,5:1 sobre blanco (C, D y F; WCAG AA, texto normal).
export const COLORS = { A: '#e11d48', B: '#2563eb', C: '#16a34a', D: '#d97706', E: '#9333ea', F: '#0891b2', G: '#4b5563' }
export const INK = { A: '#e11d48', B: '#2563eb', C: '#15803d', D: '#b45309', E: '#9333ea', F: '#0e7490', G: '#4b5563' }

// NIGHT = texto y borde de chips/títulos en modo noche (fondo slate-900 #0f172a): tonos claros de cada ruta, también con 4,5:1.
export const NIGHT = { A: '#fb7185', B: '#60a5fa', C: '#4ade80', D: '#fbbf24', E: '#c084fc', F: '#22d3ee', G: '#9ca3af' }
export const NIGHT_BG = '#0f172a'

// Contraste WCAG entre dos colores #rrggbb
export function contrast(a, b) {
  const lum = (h) => { const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * bl }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// Oro del logo (tono medio de los píxeles dorados de la "M": #CEA354). Marca los intercambiadores (halo del pin y pastilla).
export const GOLD = '#cea354'
export const SWAP = { bg: '#f8efd9', fg: '#5a3f00', ring: GOLD }
