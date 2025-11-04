import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

describe('authorizeTeamAccess and authorizeWorkOrderAccess', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('authorizeTeamAccess allows admin', async () => {
  const db = await import('../config/database')
  db.setTestDB({})
  const { authorizeTeamAccess } = await import('../middleware/auth')

    const app = express()
    app.post('/team', (req, res, next) => { req.user = { role: 'admin', userId: 1 }; next() }, authorizeTeamAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).post('/team')
    expect(res.status).toBe(200)
  })

  it('authorizeTeamAccess allows team_leader for same team', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { team_id: 7 }, error: null }) })
        })
      })
    })
    const { authorizeTeamAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/team/:userId', (req, res, next) => { req.user = { role: 'team_leader', team_id: 7, userId: 10 }; next() }, authorizeTeamAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/team/5')
    expect(res.status).toBe(200)
  })

  it('authorizeTeamAccess returns 403 when team_leader accessing other team', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { team_id: 99 }, error: null }) })
        })
      })
    })
    const { authorizeTeamAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/team/:userId', (req, res, next) => { req.user = { role: 'team_leader', team_id: 7, userId: 10 }; next() }, authorizeTeamAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/team/5')
    expect(res.status).toBe(403)
  })

  it('authorizeTeamAccess allows employee accessing own data', async () => {
  const db = await import('../config/database')
  db.setTestDB({})
  const { authorizeTeamAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/team/:userId', (req, res, next) => { req.user = { role: 'employee', userId: 55 }; next() }, authorizeTeamAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/team/55')
    expect(res.status).toBe(200)
  })

  it('authorizeTeamAccess returns 404 when target user not found', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: null, error: null }) })
        })
      })
    })
    const { authorizeTeamAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/team/:userId', (req, res, next) => { req.user = { role: 'team_leader', team_id: 7, userId: 10 }; next() }, authorizeTeamAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/team/5')
    expect(res.status).toBe(404)
  })

  // authorizeWorkOrderAccess tests
  it('authorizeWorkOrderAccess nexts when no workOrderId', async () => {
  const db = await import('../config/database')
  db.setTestDB({})
  const { authorizeWorkOrderAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/wo', (req, res, next) => { req.user = { role: 'employee', userId: 1 }; next() }, authorizeWorkOrderAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/wo')
    expect(res.status).toBe(200)
  })

  it('authorizeWorkOrderAccess returns 404 when work order not found', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) })
      })
    })
    const { authorizeWorkOrderAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/wo/:id', (req, res, next) => { req.user = { role: 'employee', userId: 2 }; next() }, authorizeWorkOrderAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/wo/99')
    expect(res.status).toBe(404)
  })

  it('authorizeWorkOrderAccess allows admin', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 3, team_id: 5, assigned_to: null }, error: null }) }) })
      })
    })
    const { authorizeWorkOrderAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/wo/:id', (req, res, next) => { req.user = { role: 'admin', userId: 9 }; next() }, authorizeWorkOrderAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/wo/3')
    expect(res.status).toBe(200)
  })

  it('authorizeWorkOrderAccess allows team_leader for matching team', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 4, team_id: 11, assigned_to: null }, error: null }) }) })
      })
    })
    const { authorizeWorkOrderAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/wo/:id', (req, res, next) => { req.user = { role: 'team_leader', team_id: 11, userId: 7 }; next() }, authorizeWorkOrderAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/wo/4')
    expect(res.status).toBe(200)
  })

  it('authorizeWorkOrderAccess allows employee assigned to work order', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 6, team_id: 8, assigned_to: 77 }, error: null }) }) })
      })
    })
    const { authorizeWorkOrderAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/wo/:id', (req, res, next) => { req.user = { role: 'employee', userId: 77 }; next() }, authorizeWorkOrderAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/wo/6')
    expect(res.status).toBe(200)
  })

  it('authorizeWorkOrderAccess returns 403 when user has no access', async () => {
    const db = await import('../config/database')
    db.setTestDB({
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 8, team_id: 2, assigned_to: 44 }, error: null }) }) })
      })
    })
    const { authorizeWorkOrderAccess } = await import('../middleware/auth')
    const app = express()
    app.get('/wo/:id', (req, res, next) => { req.user = { role: 'employee', userId: 99, team_id: 3 }; next() }, authorizeWorkOrderAccess, (req, res) => res.json({ ok: true }))

    const res = await request(app).get('/wo/8')
    expect(res.status).toBe(403)
  })

})
