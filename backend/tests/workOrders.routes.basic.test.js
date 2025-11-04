import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

describe('WorkOrders routes - basic coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should reject unauthenticated access to GET /workOrders', async () => {
    const app = express()
    app.use(express.json())
    const workOrdersRouter = (await import('../routes/workOrders')).default
    app.use('/workOrders', workOrdersRouter)

    const res = await request(app).get('/workOrders')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to POST /workOrders', async () => {
    const app = express()
    app.use(express.json())
    const workOrdersRouter = (await import('../routes/workOrders')).default
    app.use('/workOrders', workOrdersRouter)

    const res = await request(app).post('/workOrders').send({ title: 'Test' })
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to GET /workOrders/:id', async () => {
    const app = express()
    app.use(express.json())
    const workOrdersRouter = (await import('../routes/workOrders')).default
    app.use('/workOrders', workOrdersRouter)

    const res = await request(app).get('/workOrders/123')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to PUT /workOrders/:id', async () => {
    const app = express()
    app.use(express.json())
    const workOrdersRouter = (await import('../routes/workOrders')).default
    app.use('/workOrders', workOrdersRouter)

    const res = await request(app).put('/workOrders/123').send({ title: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to DELETE /workOrders/:id', async () => {
    const app = express()
    app.use(express.json())
    const workOrdersRouter = (await import('../routes/workOrders')).default
    app.use('/workOrders', workOrdersRouter)

    const res = await request(app).delete('/workOrders/123')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to GET /workOrders/stats/summary', async () => {
    const app = express()
    app.use(express.json())
    const workOrdersRouter = (await import('../routes/workOrders')).default
    app.use('/workOrders', workOrdersRouter)

    const res = await request(app).get('/workOrders/stats/summary')
    expect(res.status).toBe(401)
  })
})