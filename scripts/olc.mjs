// Plus Code (Open Location Code) corto -> {lat, lon} del centro de la celda. Uso: node scripts/olc.mjs "P8CX+23H"
const A = '23456789CFGHJMPQRVWX'
const REF = { lat: -25.2822733, lon: -57.6350903 } // Panteón, Asunción: aporta el prefijo de área

export function decodeShort(code, ref = REF) {
  let la = ref.lat + 90, lo = ref.lon + 180, pre = ''
  for (const r of [20, 1]) { const a = Math.floor(la / r), b = Math.floor(lo / r); pre += A[a] + A[b]; la -= a * r; lo -= b * r }
  const k = (pre + code.trim().toUpperCase().split(/[\s,]/)[0].replace('+', '')).split('')
  if (k.length < 10 || k.some((c) => !A.includes(c))) throw new Error(`Plus Code inválido: ${code}`)
  let lat = -90, lon = -180, r = 20
  for (let i = 0; i < 10; i += 2) { lat += A.indexOf(k[i]) * r; lon += A.indexOf(k[i + 1]) * r; r /= 20 }
  let h = r * 20, w = r * 20 // tamaño de celda de 10 dígitos (0.000125°)
  if (k[10]) { h /= 5; w /= 4; const g = A.indexOf(k[10]); lat += Math.floor(g / 4) * h; lon += (g % 4) * w }
  return { lat: +(lat + h / 2).toFixed(7), lon: +(lon + w / 2).toFixed(7) }
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(decodeShort(process.argv[2])))
