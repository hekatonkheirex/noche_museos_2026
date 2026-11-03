import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest', // src/sw.js propio: las teselas necesitan respuestas Range
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false, // el registro lo hace src/offline.js
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{html,js,mjs,css,png,ico,json,pbf,woff2,webmanifest}'],
        globIgnores: ['asuncion.pmtiles', 'og.png'], // og.png solo lo piden los rastreadores de vistas previas
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
})
