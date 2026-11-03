// Horario de cierre anticipado en la lista: si varias paradas seguidas cierran a la misma hora, se dice una vez en la primera
// ("Paradas 4–9 · hasta las 23:00") en vez de repetir la pastilla en cada una. Devuelve un texto por parada (null = no mostrar).
export function cierreRuns(stops) {
  const out = stops.map(() => null)
  for (let i = 0; i < stops.length; ) {
    const c = stops[i].cierra
    if (!c) { i++; continue }
    let j = i
    while (j + 1 < stops.length && stops[j + 1].cierra === c) j++
    out[i] = j > i ? `Paradas ${stops[i].orden}–${stops[j].orden} · hasta las ${c}` : `Hasta las ${c}`
    i = j + 1
  }
  return out
}
