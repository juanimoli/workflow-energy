import { describe, it, expect } from 'vitest'
import express from 'express'
import request from 'supertest'
import { authorizeRoles } from '../middleware/auth'

const app = express()
app.get('/admin-only', (req, res, next) => { req.user = null; next(); }, authorizeRoles('admin'), (req, res) => res.status(200).end())
app.get('/forbidden', (req, res, next) => { req.user = { role: 'employee' }; next(); }, authorizeRoles('admin'), (req, res) => res.status(200).end())
app.get('/allowed', (req, res, next) => { req.user = { role: 'admin' }; next(); }, authorizeRoles('admin'), (req, res) => res.status(200).end())

describe('authorizeRoles middleware', () => {
  it('returns 401 when no user', async () => {
    const res = await request(app).get('/admin-only')
    expect(res.status).toBe(401)
  })

  it('returns 403 when user role is not allowed', async () => {
    const res = await request(app).get('/forbidden')
    expect(res.status).toBe(403)
  })

  it('allows when user role is allowed', async () => {
    const res = await request(app).get('/allowed')
    expect(res.status).toBe(200)
  })
})
