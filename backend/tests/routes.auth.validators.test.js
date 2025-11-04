import { describe, it, expect } from 'vitest'
import { body, validationResult } from 'express-validator'

describe('auth route validators', () => {
  it('register validator rejects invalid email', async () => {
    const req = { body: { email: 'not-an-email', password: 'pass', username: 'u', firstName: 'A', lastName: 'B' } }
    await body('email').isEmail().run(req)
    const result = validationResult(req)
    expect(result.isEmpty()).toBe(false)
  })

  it('login validator rejects missing password', async () => {
    const req = { body: { email: 'a@b.com' } }
    await body('password').notEmpty().run(req)
    const result = validationResult(req)
    expect(result.isEmpty()).toBe(false)
  })
})
