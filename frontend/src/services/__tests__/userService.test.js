import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

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

describe('userService', () => {
  let userModule
  beforeEach(async () => {
    // lazy import so mocks are applied (axios mock factory provides methods)
    userModule = await import('../userService')
  })

  it('getUsers calls /api/users with params', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] })
    const res = await userModule.userService.getUsers({ role: 'employee' })
    expect(axios.get).toHaveBeenCalledWith('/api/users', { params: { role: 'employee' } })
    expect(res).toEqual([{ id: 1 }])
  })

  it('getUser calls /api/users/:id', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 2 } })
    const res = await userModule.userService.getUser(2)
    expect(axios.get).toHaveBeenCalledWith('/api/users/2')
    expect(res).toEqual({ id: 2 })
  })

  it('getTeamMembers calls team members endpoint', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 3 }] })
    const res = await userModule.userService.getTeamMembers()
    expect(axios.get).toHaveBeenCalledWith('/api/users/team/members')
    expect(res).toEqual([{ id: 3 }])
  })
})
