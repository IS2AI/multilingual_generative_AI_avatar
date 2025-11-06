import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://oylan.nu.edu.kz',
        changeOrigin: true,
        secure: false,
      },
      '/mangisoz-api': {
        target: 'https://mangisoz.nu.edu.kz',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/mangisoz-api/, '/external-api')
      }
    }
  }
})
