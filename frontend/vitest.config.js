import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    globals: false,
    // setupFiles can point to a file that configures globals or polyfills for tests
    setupFiles: ['src/setupTests.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'cobertura'],
      reportsDirectory: path.resolve(__dirname, 'coverage'),
      all: true,
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'node_modules/',
        'src/**/*.test.{js,jsx,ts,tsx}',
        'src/**/index.{js,ts}',
        'src/main.*',
        'src/**/*.stories.*'
      ],
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  }
})
