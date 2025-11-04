import { describe, it, expect } from 'vitest'
import { query, validationResult } from 'express-validator'

describe('Projects validators', () => {
  it('invalid page (0) should produce validation error', async () => {
    const req = { query: { page: '0' }, body: {}, params: {} }
    await query('page').optional().isInt({ min: 1 }).run(req)
    const result = validationResult(req)
    expect(result.isEmpty()).toBe(false)
  })

  it('invalid limit (0) should produce validation error', async () => {
    const req = { query: { limit: '0' }, body: {}, params: {} }
    await query('limit').optional().isInt({ min: 1, max: 100 }).run(req)
    const result = validationResult(req)
    expect(result.isEmpty()).toBe(false)
  })
})
