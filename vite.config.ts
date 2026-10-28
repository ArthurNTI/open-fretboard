// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Build config: React + installable PWA (offline service worker, manifest).
 *
 * Author: Arthur (ArthurNTI) · Created: 2026-10-28
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /<repo>/; the Pages workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Open Fretboard',
        short_name: 'Fretboard',
        description: 'Free and open-source guitar fretboard visualizer: scales, chords, CAGED and chord finder.',
        theme_color: '#1c1712',
        background_color: '#1c1712',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
