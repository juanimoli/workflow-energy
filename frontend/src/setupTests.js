// Minimal test setup: expose React globally, enable jest-dom matchers, and mark act environment
import React from 'react'
// vitest is configured with `globals: false`, so `expect` isn't injected globally.
// Expose vitest's expect onto globalThis before importing jest-dom so it can extend it.
import { expect } from 'vitest'
globalThis.expect = expect
// Use dynamic import (top-level await) so `expect` is available globally before
// `@testing-library/jest-dom` tries to extend it. Static imports are hoisted and
// would run before the assignment above.
await import('@testing-library/jest-dom')

// Ensure React is available globally for tests/transforms that expect it
if (typeof globalThis.React === 'undefined') {
  globalThis.React = React
}

// Mark that we're running in a React testing environment (helps some libs)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
