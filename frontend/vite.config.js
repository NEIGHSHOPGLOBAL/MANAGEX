import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isElectronBuild = process.env.VITE_ELECTRON === '1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: isElectronBuild,
      registerType: 'prompt',
      includeAssets: ['managex_logo.png'],
      manifest: {
        name: 'ManageX',
        short_name: 'ManageX',
        description: 'Team Planner & Task Management',
        theme_color: '#2563eb',
        background_color: '#f4f6f9',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/managex_logo.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/managex_logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/firebase-messaging-sw.js'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'firebase-messaging-sw': resolve(__dirname, 'src/firebase-messaging-sw.js'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'firebase-messaging-sw' ? '[name].js' : 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
})
