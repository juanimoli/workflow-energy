/* Vitest global setup for backend tests
   - Injects a default fake Supabase client so modules calling getDB() won't throw
   - Exposes global.setTestDB(db) to allow tests to override the DB per-test
*/

const path = require('path')
const dbModule = require(path.resolve(__dirname, '../config/database'))

// A very small, resilient fake supabase client with common chain methods used in tests.
// Tests may overwrite this by calling `global.setTestDB(...)` or by importing
// the config/database and calling setTestDB directly inside the test file.
const chainable = (result = { data: null, error: null }) => {
  const res = () => Promise.resolve(result)
  const chain = {
    single: res,
    limit: res,
    gt: () => chain,
    eq: () => chain,
    or: () => chain,
    select: () => chain,
    // some code expects .limit() to be a function returning a promise
  }
  return chain
}

const defaultFakeDB = {
  from: (/*table*/) => ({
    select: () => chainable(),
    // insert(...).select().single() chain supported
    insert: () => ({ select: () => chainable() }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ error: null }) })
  })
}

// Inject the default fake DB into the config module so all modules that `require` it
// will see the same instance and won't throw "Supabase not initialized".
try {
  dbModule.setTestDB(defaultFakeDB)
} catch (err) {
  // In case of a weird module loading issue, ensure tests still run.
  // We'll log to console to aid debugging in CI.
  // eslint-disable-next-line no-console
  console.error('setupTests: could not set test DB', err)
}

// Expose a helper so tests can swap the fake DB at runtime.
global.setTestDB = (db) => dbModule.setTestDB(db)

// Also export for ESM-style imports (some tests use dynamic import on the setup helpers)
module.exports = { setTestDB: global.setTestDB }

// Lightweight monkey-patch for jsonwebtoken.verify to make common test tokens
// behave predictably. Tests that explicitly mock jsonwebtoken with vi.doMock
// will still override this behavior.
try {
  /* eslint-disable global-require */
  const jwt = require('jsonwebtoken')
  const originalVerify = jwt.verify
  jwt.verify = (token, secret) => {
    // common test tokens used in the suite
    if (token === 'rt') return { userId: 11, username: 'u' }
    if (token === 'ok') return { userId: 1 }
    if (token === 'valid') return { userId: 1 }
    // fallback to original to preserve behavior in other tests
    return originalVerify(token, secret)
  }
} catch (err) {
  // no-op if jsonwebtoken isn't available in environment
}
