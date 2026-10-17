import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.ts, which needs VITE_SITE_URL for the sitemap.
export default defineConfig({
  plugins: [react()],
  test: {
    restoreMocks: true,
    unstubEnvs: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/py/**', 'src/lib/pyodide.worker.test.ts'],
          setupFiles: ['src/test/setup.ts'],
        },
      },
      {
        // Runs the real Python sources on Pyodide, and the worker that hosts them.
        extends: true,
        test: {
          name: 'python',
          environment: 'node',
          include: ['src/py/**/*.test.ts', 'src/lib/pyodide.worker.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
})
