import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/I-AM-SENSING-A-CONNECTION-DATING-APP/' : '/',
  server: { host: '0.0.0.0' }
}))
