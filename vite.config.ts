import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // VITE_BASE lets the Pages build serve from /<repo>/ while dev stays at /.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
