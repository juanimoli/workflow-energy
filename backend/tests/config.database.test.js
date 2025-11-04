import { describe, it, expect } from 'vitest'

describe('config/database', () => {
  it('getDB throws if connectDB not called', async () => {
    // Ensure supabase not initialized; clear any test DB injected by global setup
    const db = await import('../config/database')
    db.setTestDB(undefined)
    expect(() => db.getDB()).toThrow(/Supabase not initialized/)
  })

  it('connectDB throws when SUPABASE_URL missing', async () => {
    const db = await import('../config/database')
    const originalUrl = process.env.SUPABASE_URL
    delete process.env.SUPABASE_URL
    try {
      await expect(db.connectDB()).rejects.toThrow(/Missing Supabase configuration/)
    } finally {
      if (originalUrl) process.env.SUPABASE_URL = originalUrl
    }
  })
})
