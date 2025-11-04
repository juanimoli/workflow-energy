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

describe('workOrderService', () => {
  let woModule
  beforeEach(async () => {
    // lazy import so mocks are applied (axios mock factory provides methods)
    woModule = await import('../workOrderService')
  })

  it('getWorkOrders calls list endpoint with params', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ id: 1 }] })
    const res = await woModule.workOrderService.getWorkOrders({ page: 1 })
    expect(axios.get).toHaveBeenCalledWith('/api/work-orders', { params: { page: 1 } })
    expect(res).toEqual([{ id: 1 }])
  })

  it('getWorkOrder calls /api/work-orders/:id', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 2 } })
    const res = await woModule.workOrderService.getWorkOrder(2)
    expect(axios.get).toHaveBeenCalledWith('/api/work-orders/2')
    expect(res).toEqual({ id: 2 })
  })

  it('create/update/delete/assign/updateStatus call correct endpoints', async () => {
    axios.post.mockResolvedValueOnce({ data: { created: true } })
    const created = await woModule.workOrderService.createWorkOrder({ a: 1 })
    expect(axios.post).toHaveBeenCalledWith('/api/work-orders', { a: 1 })
    expect(created).toEqual({ created: true })

    axios.put.mockResolvedValueOnce({ data: { ok: true } })
    const updated = await woModule.workOrderService.updateWorkOrder(3, { b: 2 })
    expect(axios.put).toHaveBeenCalledWith('/api/work-orders/3', { b: 2 })
    expect(updated).toEqual({ ok: true })

    axios.delete.mockResolvedValueOnce({ data: { deleted: true } })
    const deleted = await woModule.workOrderService.deleteWorkOrder(4)
    expect(axios.delete).toHaveBeenCalledWith('/api/work-orders/4')
    expect(deleted).toEqual({ deleted: true })

    axios.get.mockResolvedValueOnce({ data: { stats: {} } })
    const stats = await woModule.workOrderService.getWorkOrderStats()
    expect(axios.get).toHaveBeenCalledWith('/api/work-orders/stats/summary')
    expect(stats).toEqual({ stats: {} })

    axios.put.mockResolvedValueOnce({ data: { ok: true } })
    const status = await woModule.workOrderService.updateStatus(5, 'done')
    expect(axios.put).toHaveBeenCalledWith('/api/work-orders/5', { status: 'done' })
    expect(status).toEqual({ ok: true })

    axios.put.mockResolvedValueOnce({ data: { ok: true } })
    const assign = await woModule.workOrderService.assignWorkOrder(6, 'user1')
    expect(axios.put).toHaveBeenCalledWith('/api/work-orders/6', { assignedTo: 'user1' })
    expect(assign).toEqual({ ok: true })
  })
})
