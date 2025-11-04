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

describe('projectService', () => {
  let projectModule
  beforeEach(async () => {
    // lazy import so mocks are applied (axios mock factory provides methods)
    projectModule = await import('../projectService')
  })

  it('getProjects calls /api/projects with params', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] })
    const res = await projectModule.projectService.getProjects({ q: 'x' })
    expect(axios.get).toHaveBeenCalledWith('/api/projects', { params: { q: 'x' } })
    expect(res).toEqual([{ id: 1 }])
  })

  it('getProject calls /api/projects/:id', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 2 } })
    const res = await projectModule.projectService.getProject(2)
    expect(axios.get).toHaveBeenCalledWith('/api/projects/2')
    expect(res).toEqual({ id: 2 })
  })
})
