import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

describe('Metrics routes - basic coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should reject unauthenticated access to /dashboard', async () => {
    const app = express()
    app.use(express.json())
    const metricsRouter = (await import('../routes/metrics')).default
    app.use('/metrics', metricsRouter)

    const res = await request(app).get('/metrics/dashboard')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to /teams', async () => {
    const app = express()
    app.use(express.json())
    const metricsRouter = (await import('../routes/metrics')).default
    app.use('/metrics', metricsRouter)

    const res = await request(app).get('/metrics/teams')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to /employees', async () => {
    const app = express()
    app.use(express.json())
    const metricsRouter = (await import('../routes/metrics')).default
    app.use('/metrics', metricsRouter)

    const res = await request(app).get('/metrics/employees')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to /projects', async () => {
    const app = express()
    app.use(express.json())
    const metricsRouter = (await import('../routes/metrics')).default
    app.use('/metrics', metricsRouter)

    const res = await request(app).get('/metrics/projects')
    expect(res.status).toBe(401)
  })
})