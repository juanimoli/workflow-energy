import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

describe('Users routes - basic coverage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should reject unauthenticated access to GET /users', async () => {
    const app = express()
    app.use(express.json())
    const usersRouter = (await import('../routes/users')).default
    app.use('/users', usersRouter)

    const res = await request(app).get('/users')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to GET /users/:id', async () => {
    const app = express()
    app.use(express.json())
    const usersRouter = (await import('../routes/users')).default
    app.use('/users', usersRouter)

    const res = await request(app).get('/users/123')
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to PUT /users/:id', async () => {
    const app = express()
    app.use(express.json())
    const usersRouter = (await import('../routes/users')).default
    app.use('/users', usersRouter)

    const res = await request(app).put('/users/123').send({ firstName: 'Test' })
    expect(res.status).toBe(401)
  })

  it('should reject unauthenticated access to DELETE /users/:id', async () => {
    const app = express()
    app.use(express.json())
    const usersRouter = (await import('../routes/users')).default
    app.use('/users', usersRouter)

    const res = await request(app).delete('/users/123')
    expect(res.status).toBe(401)
  })
})