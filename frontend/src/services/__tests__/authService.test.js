import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

// Provide a consistent axios mock implementation so axios.create() returns an
// instance-like object with interceptors and method stubs that point back to
// the top-level mocked methods. This prevents import-time code in services
// (which registers interceptors) from crashing when tests run.
vi.mock('axios', () => {
  const m = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
  m.create = vi.fn(() => ({
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    get: m.get,
    post: m.post,
    put: m.put,
    delete: m.delete,
  }))
  return { default: m, ...m }
})

describe('authService', () => {
  let authModule
  beforeEach(async () => {
    // lazy import so mocks are applied (axios mock factory provides methods)
    authModule = await import('../authService')
  })

  it('login posts credentials and returns data', async () => {
    const data = { accessToken: 'a', refreshToken: 'r', user: { id: 1 } }
    axios.post.mockResolvedValueOnce({ data })

    const res = await authModule.authService.login({ email: 'a', password: 'b' })
    expect(axios.post).toHaveBeenCalledWith('/api/auth/login', { email: 'a', password: 'b' })
    expect(res).toEqual(data)
  })

  it('logout posts to logout', async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } })
    const res = await authModule.authService.logout()
    expect(axios.post).toHaveBeenCalledWith('/api/auth/logout')
    expect(res).toEqual({ success: true })
  })

  it('getCurrentUser calls /api/auth/me', async () => {
    axios.get.mockResolvedValueOnce({ data: { user: { id: 2 } } })
    const res = await authModule.authService.getCurrentUser()
    expect(axios.get).toHaveBeenCalledWith('/api/auth/me')
    expect(res).toEqual({ user: { id: 2 } })
  })

  it('changePassword posts password data', async () => {
    const payload = { oldPassword: 'o', newPassword: 'n' }
    axios.post.mockResolvedValueOnce({ data: { ok: true } })
    const res = await authModule.authService.changePassword(payload)
    expect(axios.post).toHaveBeenCalledWith('/api/auth/change-password', payload)
    expect(res).toEqual({ ok: true })
  })

  it('validateSession posts to validate-session', async () => {
    axios.post.mockResolvedValueOnce({ data: { valid: true } })
    const res = await authModule.authService.validateSession()
    expect(axios.post).toHaveBeenCalledWith('/api/auth/validate-session')
    expect(res).toEqual({ valid: true })
  })
})
