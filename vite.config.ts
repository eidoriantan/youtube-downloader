import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import Sitemap from 'vite-plugin-sitemap'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const hostname = env.VITE_SITE_URL

  if (!hostname) {
    throw new Error('VITE_SITE_URL must be set to generate the sitemap')
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      Sitemap({
        hostname,
        generateRobotsTxt: true,
      })
    ],
  }
})
