import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

describe('Sync routes - basic coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should reject unauthenticated access to POST /work-orders', async () => {
    const app = express()
    app.use(express.json())
    const syncRouter = (await import('../routes/sync')).default
    app.use('/sync', syncRouter)

    const res = await request(app).post('/sync/work-orders').send({ workOrders: [] })
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to GET /changes', async () => {
    const app = express()
    app.use(express.json())
    const syncRouter = (await import('../routes/sync')).default
    app.use('/sync', syncRouter)

    const res = await request(app).get('/sync/changes')
    expect(res.status).toBe(401)
  })
})