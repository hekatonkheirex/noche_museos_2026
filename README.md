# Noche de los Museos 2026 · Mapa de rutas

Mapa de las 7 rutas (A-G) del 7 de noviembre, 18:00, Asunción. Producción: https://noche-museos-2026.vercel.app

- `app/`: Vite + React + Leaflet + MapLibre. `npm run dev` para desarrollar, `npm run build` para compilar, `npm test` para los tests.
- Mapa base: teselas Protomaps de Gran Asunción alojadas en el propio sitio (`app/public/asuncion.pmtiles`, fuentes y sprites en `app/public/map/`), configuradas en `app/src/basemap.js`. Si no cargan, `App.jsx` cambia solo a OpenFreeMap (gratis, sin clave). El `.pmtiles` (10 MB) va en Git LFS (requiere `git lfs install` y "Git LFS" activo en Vercel); `scripts/build-tiles.sh` lo regenera. Sin ese archivo en el deploy, el mapa usa el respaldo.
- `scripts/`: datos de las paradas y rutas. `node --test scripts/` corre los tests.
- `noche_museos_2026_mymaps.csv`: lista original de paradas (ruta, orden, nombre).

## Actualizar datos

1. Coordenadas exactas en `scripts/overrides.json` (clave: columna "Ubicación para buscar" del CSV). `node scripts/olc.mjs "P9C7+P26"` decodifica un Plus Code de Asunción.
2. Dirección de calle: agregar en `scripts/addresses.json` y correr `node scripts/geocode-addr.mjs`.
3. `node scripts/build-data.mjs` genera `app/src/data.json`.
4. `node scripts/route.mjs` calcula las rutas por calle (perfil auto, en circuito) y escribe `app/src/routes-geo.json`. Usa el servidor público de OSRM.
5. `node --test scripts/` debe pasar antes de empujar.

Intercambiadores: `app/src/intercambiadores.json`. Horarios de cierre anticipado: `app/src/cierres.json`. Ambos salen del Instagram oficial @nochedelosmuseos.

## Flechas de sentido

Cada ruta lleva flechas que marcan hacia dónde seguir (`app/src/arrows.js`, función pura `arrowsAlong` con tests). Se colocan cada ~80 px (una ruta) o ~120 px (todas) de pantalla sobre el recorrido y se recalculan al cambiar el zoom. Los tramos que comparten calle (entre rutas, o la ida y el regreso de una misma ruta) se reparten en carriles paralelos (`app/src/lanes.js`, función pura `laneUnits` con tests): cada sentido va por la derecha, como el tránsito. El desplazamiento es en píxeles y se recalcula con el zoom.

## Dónde estoy

Botón sobre el mapa (`app/src/App.jsx`, lógica en `app/src/locate.js`): pide la ubicación al navegador (solo HTTPS) y la sigue mientras camina: punto con radio de precisión, el mapa acompaña. Si se arrastra el mapa deja de acompañar y aparece "Centrar"; "Detener seguimiento" lo apaga. Fuera de la zona del mapa (`BOUNDS`, igual al recorte de teselas) avisa una vez en vez de mover el mapa. Los estados del seguimiento están en la función pura `track` (con tests). Usa GPS de alta precisión, que gasta batería; por eso arranca solo con el botón y se apaga con "Detener". Funciona sin conexión.

## Uso sin conexión

La app registra un service worker (`app/src/sw.js`, plugin `vite-plugin-pwa`). Tras la primera visita guarda la app, la fuente Montserrat (alojada en el sitio) y, en segundo plano, el mapa completo (`asuncion.pmtiles`, 10 MB; no lo hace con "ahorro de datos"). Desde entonces abre sin red. Solo funciona en el build de producción (en `npm run dev` no se registra). Al regenerar las teselas con `scripts/build-tiles.sh`, subir `TILES_CACHE` en `app/src/tiles-handler.js` (`tiles-v2` a `tiles-v3`) para que los teléfonos las vuelvan a bajar.

## Íconos

`favicon.ico`, `favicon-32.png` y `apple-touch-icon.png` (en `app/public/`) salen de la M dorada del logo oficial: `python3 scripts/make-icons.py` (requiere Pillow) los regenera desde `ndm-2026-logo.png`.

## Publicar

Cada push a `main` se publica solo en Vercel (carpeta raíz `app`). Para publicar a mano, desde la raíz del repo: `vercel deploy --prod`.
