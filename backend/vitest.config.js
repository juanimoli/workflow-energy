import { defineConfig } from 'vitest/config'
import path from 'path'

// Unified Vitest config: include tests in coverage and report all files so you
// can see coverage numbers for test files as well as source files.
export default defineConfig({
  test: {
    environment: 'node',
  // only include test files with `.test.` so setup files won't be picked up as tests
  include: ['tests/**/*.test.{js,ts}'],
    // run setup file before tests so we can inject a fake DB and helpers
    setupFiles: ['./tests/setupTests.js'],
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov', 'html'],
    reportsDirectory: path.resolve(__dirname, 'coverage'),
    all: true,
    // include tests and backend code so test files show up in the report
    include: ['tests/**/*.{js,ts}', 'routes/**/*.{js,ts}', 'middleware/**/*.{js,ts}', 'utils/**/*.{js,ts}'],
    // keep excludes minimal so test files are counted
    exclude: ['node_modules/'],
  },
})

