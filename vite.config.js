import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ЛОКАЛЬНО:
  // base: '/',
  // ДЛЯ GITHUB PAGES (project pages):
  base: '/physNS/',
})
