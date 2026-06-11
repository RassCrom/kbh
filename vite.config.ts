import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // honour PORT from the environment (used by preview tooling)
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
  build: {
    rollupOptions: {
      output: {
        // keep the heavy map engine out of the MapPage chunk so the two
        // download in parallel and the engine stays cached across deploys
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl') || id.includes('node_modules/pmtiles')) {
            return 'maplibre'
          }
        },
      },
    },
  },
})
