import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import authRoutes from '../routes/auth'
import bcrypt from 'bcryptjs'

// Helper to build an Express app with just the auth routes mounted like in server.js
function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRoutes)
  return app
}

// We'll inject a controllable fake supabase client before each test
let tokensStore = []
let usersStore = []

function makeSupabase() {
  return {
    from(table) {
      if (table === 'users') {
        return {
          select() {
            // Simulate chain: .eq('email', v).eq('is_active', true)
            return {
              eq(field1, value1) {
                const firstFiltered = field1 === 'email'
                  ? usersStore.filter(u => u.email === value1)
                  : usersStore
                return {
                  eq(field2, value2) {
                    const data = field2 === 'is_active'
                      ? firstFiltered.filter(u => u.is_active === value2)
                      : firstFiltered
                    return Promise.resolve({ data, error: null })
                  }
                }
              }
            }
          },
          update() {
            return {
              eq(field, value) {
                if (field === 'id') {
                  // simulate update success
                  return Promise.resolve({ error: null })
                }
                return Promise.resolve({ error: null })
              }
            }
          }
        }
      }
      if (table === 'password_reset_tokens') {
        return {
          insert(record) {
            tokensStore.push({ id: tokensStore.length + 1, ...record })
            return Promise.resolve({ error: null })
          },
          select() {
            return {
              gt() { // expires_at filter
                return {
                  is() { // used_at is null
                    return Promise.resolve({ data: tokensStore, error: null })
                  }
                }
              }
            }
          },
          update(updates) {
            return {
              eq(field, value) {
                if (field === 'id') {
                  tokensStore = tokensStore.map(t => t.id === value ? { ...t, ...updates } : t)
                  return Promise.resolve({ error: null })
                }
                return Promise.resolve({ error: null })
              }
            }
          },
          delete() {
            return {
              eq(field, value) {
                if (field === 'user_id') {
                  tokensStore = tokensStore.filter(t => t.user_id !== value)
                }
                return Promise.resolve({ error: null })
              }
            }
          }
        }
      }
      if (table === 'user_sessions') {
        return {
          delete() { return { eq() { return Promise.resolve({ error: null }) } } }
        }
      }
      return { select: () => ({}) }
    }
  }
}

// Inject test DB into database config module used by auth routes
import * as dbModule from '../config/database'

function resetStores() {
  tokensStore = []
  usersStore = [{ id: 'u1', email: 'user@example.com', first_name: 'Test', is_active: true }]
  dbModule.setTestDB(makeSupabase())
}

beforeEach(() => {
  resetStores()
})

describe('Password Reset Routes', () => {
  it('POST /forgot-password responds with generic message even for existing user', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/correo existe/i)
    expect(tokensStore.length).toBe(1) // token inserted
  })

  it('POST /reset-password rejects missing fields', async () => {
    const app = buildApp()
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Datos inválidos')
  })

  it('POST /reset-password succeeds with valid token and password', async () => {
    // Arrange: create token via forgot-password first
    const app = buildApp()
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'user@example.com' })
    expect(forgotRes.status).toBe(200)
    const rawTokenRecord = tokensStore[0]

    // Need a raw token that matches stored hash: regenerate one and replace
    const rawToken = 'reset-token-plain'
    const tokenHash = await bcrypt.hash(rawToken, 10)
    tokensStore[0].token_hash = tokenHash
    tokensStore[0].expires_at = new Date(Date.now() + 3600000).toISOString()

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'NuevaPass123!' })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Contraseña actualizada exitosamente')
    // Tokens should have been purged after success
    expect(tokensStore.length).toBe(0)
  })

  it('POST /reset-password fails with invalid token', async () => {
    const app = buildApp()
    // Create a valid token but supply wrong raw token
    await request(app).post('/api/auth/forgot-password').send({ email: 'user@example.com' })
    tokensStore[0].expires_at = new Date(Date.now() + 3600000).toISOString()

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'wrong-token', newPassword: 'NuevaPass123!' })

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('Token inválido o expirado')
  })
})
