/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { dropOldTiles, serveTiles, TILES_CACHE } from './tiles-handler.js'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
self.addEventListener('activate', (e) => e.waitUntil(dropOldTiles(caches)))
precacheAndRoute(self.__WB_MANIFEST) // app, estilos, worker de MapLibre, fuentes y sprites del mapa (no el .pmtiles)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

registerRoute(
  ({ url }) => url.pathname === '/asuncion.pmtiles',
  async ({ request }) => serveTiles(request, await caches.open(TILES_CACHE)),
)
