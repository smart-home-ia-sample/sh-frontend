import { defineConfig } from 'vitest/config'

// Standalone from vite.config.ts on purpose: the app's Vite 8 and the Vitest 2
// runner bundle different Vite copies, so sharing one config trips a type
// clash on the React plugin. Tests don't need Fast Refresh — Vitest's esbuild
// picks up `jsx: react-jsx` from tsconfig for the JSX transform.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
