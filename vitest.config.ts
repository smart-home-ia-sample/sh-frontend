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
    coverage: {
      provider: 'v8',
      // `json-summary` + `json` feed the PR coverage-report action; `lcov` is
      // the artifact; `text` prints the table in the job log.
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx', // app entry, nothing to assert
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
      ],
      // The GitHub ruleset blocks merges when the "coverage" check fails, and
      // `vitest run --coverage` exits non-zero when any of these is missed.
      // Set just under the current numbers (lines ~96, funcs ~94, branches ~81)
      // so a real regression trips the gate without flapping on rounding.
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 88,
        branches: 78,
      },
    },
  },
})
