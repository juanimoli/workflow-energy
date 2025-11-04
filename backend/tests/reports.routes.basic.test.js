import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

describe('Reports routes - basic coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should reject unauthenticated access to GET /work-orders', async () => {
    const app = express()
    app.use(express.json())
    const reportsRouter = (await import('../routes/reports')).default
    app.use('/reports', reportsRouter)

    const res = await request(app).get('/reports/work-orders')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to GET /team-performance', async () => {
    const app = express()
    app.use(express.json())
    const reportsRouter = (await import('../routes/reports')).default
    app.use('/reports', reportsRouter)

    const res = await request(app).get('/reports/team-performance')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to GET /metrics-summary', async () => {
    const app = express()
    app.use(express.json())
    const reportsRouter = (await import('../routes/reports')).default
    app.use('/reports', reportsRouter)

    const res = await request(app).get('/reports/metrics-summary')
    expect(res.status).toBe(401)
  })
})