# Noche de los Museos 2026 · Mapa de rutas

Mapa de las 7 rutas (A-G) en Asunción. Postergada hasta nuevo aviso (era el 7 de noviembre); la organización anunciará la nueva fecha. Producción: https://noche-museos-2026.vercel.app

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

Cada ruta lleva flechas que marcan hacia dónde seguir (`app/src/arrows.js`, función pura `arrowsAlong` con tests). Se colocan cada ~160 px (una ruta) o ~240 px (todas) de pantalla sobre el recorrido, solo en el área visible, y se recalculan al mover o hacer zoom al mapa (el zoom máximo es 19). Dibujar flechas de todo el recorrido a zoom alto colgaba la página: `arrowsAlong` recibe el área visible, salta lo que queda fuera y tiene un tope duro. Los tramos que comparten calle (entre rutas, o la ida y el regreso de una misma ruta) se reparten en carriles paralelos (`app/src/lanes.js`, función pura `laneUnits` con tests): cada sentido va por la derecha, como el tránsito. El desplazamiento es en píxeles y se recalcula con el zoom.

Las paradas que se tapan entre sí (porque el zoom las junta, o porque una parada compartida aparece en varias rutas) se separan en abanico (`app/src/spread.js`, función pura `spread` con tests) y una línea guía une cada pin con su ubicación real. Al acercar, vuelven a su lugar.

## Información de cada parada

El popup de cada parada muestra la ficha publicada en https://www.nochedemuseos.org.py/museos-info: horario habitual, dirección y teléfono (con enlace para llamar) y, en "Más información", categoría, dependencia, descripción, sitio web, correo e Instagram (`app/src/info.js`; los textos son de un tercero, así que se escapan y los enlaces se validan). Es el horario **habitual** del museo; el horario de cierre de la noche del evento sigue saliendo de `app/src/cierres.json`.

Esa página solo lista 42 espacios de Asunción: 25 de nuestras 61 paradas tienen ficha. Para el resto el popup queda como antes. Actualizar:

1. `python3 scripts/fetch-fichas.py` descarga la página y guarda `scripts/fichas.json`.
2. `node scripts/build-info.mjs` cruza las fichas con las paradas y escribe `app/src/museos-info.json` (e imprime las paradas sin ficha). Coincide por nombre normalizado o por los alias de `scripts/info-alias.json`; no hay coincidencia aproximada, porque preferimos no mostrar nada antes que la dirección de otro lugar.
3. `npm test` en `app/` comprueba que todo esté al día.

## Ir a una parada

Cada parada (en el mapa o al tocarla en la lista, que abre su popup) tiene dos filas de enlaces (`app/src/links.js`, sin claves ni SDK):

- **Cómo llegar:** Google Maps y Waze, con indicaciones desde la ubicación actual hacia las coordenadas de la parada.
- **Pedir un viaje:** **Uber** abre la app (o m.uber.com) con el destino ya cargado y el origen en "mi ubicación" (universal link documentado por Uber). **Bolt** no tiene enlace universal público: en Android se lanza un `intent://` al paquete de la app (`ee.mtakso.client`) y en iOS el esquema `taxify://action/bookaride?...` (el heredado de Taxify, descrito en https://github.com/byshako-dev/bolt-ios-deeplink; **no es oficial ni está verificado en un teléfono**), ambos con destino y origen "mi ubicación"; si la app no está instalada, se cae a bolt.eu. Además se copia "Nombre, dirección, Asunción" al portapapeles por si la app abre sin el destino. En computadora se abre bolt.eu.

En las paradas con ubicación aproximada (calle) el destino es esa calle. Los enlaces necesitan conexión.

## Dónde estoy

Botón sobre el mapa (`app/src/App.jsx`, lógica en `app/src/locate.js`): pide la ubicación al navegador (solo HTTPS) y la sigue mientras camina: punto con radio de precisión, el mapa acompaña. Si se arrastra el mapa deja de acompañar y aparece "Centrar"; "Detener seguimiento" lo apaga. Fuera de la zona del mapa (`BOUNDS`, igual al recorte de teselas) avisa una vez en vez de mover el mapa. Los estados del seguimiento están en la función pura `track` (con tests). Usa GPS de alta precisión, que gasta batería; por eso arranca solo con el botón y se apaga con "Detener". Funciona sin conexión.

## Uso sin conexión

**Mapa con consentimiento:** el mapa (10 MB) ya no se baja solo con datos móviles. Si la red es Wi-Fi o cable (y sin "ahorro de datos") se guarda sola; si no, o si el navegador no informa el tipo de red (Safari), aparece el botón "Guardar mapa sin conexión (10 MB)" con barra de avance, y luego un aviso "Mapa guardado" y una línea en el pie (`app/src/offline.js`). **Estados visibles:** "Cargando mapa…", "Sin conexión · usando el mapa guardado" (o "el mapa puede no cargar" si no se guardó) y "Mapa de respaldo (OpenFreeMap)".

La app registra un service worker (`app/src/sw.js`, plugin `vite-plugin-pwa`). Tras la primera visita guarda la app, la fuente Montserrat (alojada en el sitio) y, en segundo plano, el mapa completo (`asuncion.pmtiles`, 10 MB; no lo hace con "ahorro de datos"). Desde entonces abre sin red. Solo funciona en el build de producción (en `npm run dev` no se registra). Al regenerar las teselas con `scripts/build-tiles.sh`, subir `TILES_CACHE` en `app/src/tiles-handler.js` (`tiles-v2` a `tiles-v3`) para que los teléfonos las vuelvan a bajar.

## Accesibilidad y pantallas táctiles

- **Contraste:** `app/src/colors.js` tiene `COLORS` (líneas y flechas, vivos) e `INK` (texto de rutas y relleno de pines, con al menos 4,5:1 sobre blanco; C, D y F son más oscuros). El test falla si una ruta nueva no llega.
- **Táctil:** en `pointer: coarse` los chips, filas de la lista, botones del popup, zoom y cerrar popup miden 44 px. El zoom pasa abajo a la izquierda (arriba tapaba el título del popup) y los chips van en una fila con scroll.
- **Teclado y lectores:** los chips tienen `aria-pressed`, el foco es un anillo de dos tonos (`:focus-visible` en `app/src/index.css`) y el `h1` es "Noche de los Museos 2026 · Mapa de rutas".

## Vista inicial, modo noche y pista

- **Vista inicial:** "Todas" encuadra el centro de Asunción, no toda la región (`app/src/view.js`, `coreBounds`: paradas a menos de 10 km de la mediana). Las rutas de Lambaré, San Lorenzo y Areguá siguen a un gesto o eligiéndolas. A zoom menor que 14 las paradas son puntos y solo los intercambiadores (⇄) llevan marca, para que se lea la red de rutas.
- **Modo noche** (el evento es de 18 a 23 h): botón de luna/sol arriba a la derecha del mapa. Sigue al sistema (`prefers-color-scheme`) hasta que la persona elige; la elección queda en `localStorage` (`ndm-theme`). Cambia el estilo del mapa (`buildStyle(origin, 'dark')`, sprites `public/map/sprites/dark.*`) y la barra lateral (variante `dark:` de Tailwind sobre `data-theme` en `<html>`). Los colores de texto por ruta para fondo oscuro están en `NIGHT` (`app/src/colors.js`, con test de contraste). Los popups se quedan claros.
- **Pista de primera visita:** una línea ("Elegí una ruta…") que se va al elegir una ruta, al cerrarla o a los 12 s, y no vuelve (`ndm-hint`).

## Hoja inferior en celular

En pantallas de menos de 768 px el panel de rutas es una hoja inferior (`app/src/sheet.js`, funciones puras con tests): asomada (asa + chips, 84 px), media (la mitad de la pantalla) y completa (deja visible el logo). Se arrastra desde el asa (con inercia al soltar), un toque alterna asomada y media, y las flechas del teclado suben y bajan. El zoom, la atribución, los botones del mapa y el margen de los popups suben junto con la hoja (variable CSS `--sheet-h`). Al elegir una parada de la lista la hoja baja a asomada para dejar ver el mapa y el popup. En escritorio es la barra lateral de siempre.

## Detalles visuales

- **Oro del logo:** `GOLD` y `SWAP` en `app/src/colors.js` (tono medio de los píxeles dorados de la "M") marcan los intercambiadores: halo del pin y pastilla. Un test comprueba el contraste de la pastilla.
- **Contorno de las líneas:** cada ruta lleva un contorno blanco (azul noche en modo noche) para leerse sobre las calles; todos los contornos se dibujan antes que las líneas.
- **Íconos:** `app/src/icons.js` (SVG de trazo, estilo Lucide) en vez de símbolos Unicode, que cada sistema dibuja distinto.
- **Horario de cierre:** `app/src/cierres.js` agrupa las paradas seguidas que cierran a la misma hora ("Paradas 4–9 · hasta las 23:00") en vez de repetir la pastilla.
- **Popups en modo noche:** colores en clases (`.pop-*`, `.navpill`) con variantes bajo `[data-theme=dark]` en `app/src/index.css`.

## Vista previa al compartir e instalación

`app/index.html` tiene descripción, Open Graph y tarjeta grande (`og.png`, 1200x630), canonical y `manifest.webmanifest` (íconos 192, 512 y maskable). Se generan con `python3 scripts/make-icons.py`. Para probar la vista previa: https://developers.facebook.com/tools/debug/ (WhatsApp usa lo mismo).

## Íconos

`favicon.ico`, `favicon-32.png` y `apple-touch-icon.png` (en `app/public/`) salen de la M dorada del logo oficial: `python3 scripts/make-icons.py` (requiere Pillow) los regenera desde `ndm-2026-logo.png`.

## Publicar

Cada push a `main` se publica solo en Vercel (carpeta raíz `app`). Para publicar a mano, desde la raíz del repo: `vercel deploy --prod`.
