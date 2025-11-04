import { describe, it, expect, vi, afterEach } from 'vitest'

describe('authenticateToken middleware (unit)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when no Authorization header', async () => {
    // Import middleware fresh
    const { authenticateToken } = await import('../middleware/auth')
    const req = { headers: {} }
    const res = { status: vi.fn(() => res), json: vi.fn() }
    const next = vi.fn()

    await authenticateToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when jwt.verify throws JsonWebTokenError', async () => {
    vi.resetModules()
    // Mock jsonwebtoken verify to throw JsonWebTokenError
    vi.doMock('jsonwebtoken', () => ({ verify: vi.fn(() => { const e = new Error('invalid'); e.name = 'JsonWebTokenError'; throw e }) }))
    const { authenticateToken } = await import('../middleware/auth')

    const req = { headers: { authorization: 'Bearer badtoken' } }
    const res = { status: vi.fn(() => res), json: vi.fn() }
    const next = vi.fn()

    await authenticateToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  // Note: full-success path (valid token + DB user) is exercised indirectly by
  // route-level tests and is sensitive to supabase client shape. We cover the
  // error paths here which are the most important for middleware correctness.
})
