import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Old OYLAN API
        // target: 'https://oylan.nu.edu.kz',
        // New: Local LMDeploy model (OpenAI-compatible)
        target: 'http://localhost:23333',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/mangisoz-api': {
        target: 'https://mangisoz.nu.edu.kz',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/mangisoz-api/, '/external-api')
      },
      '/tts-api': {
        // Local TTS API (OpenAI-compatible)
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tts-api/, '')
      },
      '/asr-api': {
        // Local ASR API (Faster Whisper)
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/asr-api/, '')
      }
    }
  }
})
