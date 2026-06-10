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
})
