import { describe, it, expect } from 'vitest'
import { query, validationResult } from 'express-validator'

describe('WorkOrders validators', () => {
  it('invalid status should produce validation error', async () => {
    const req = { query: { status: 'invalid_status' }, body: {}, params: {} }
    await query('status').optional().custom(value => !value || ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'].includes(value)).run(req)
    const result = validationResult(req)
    expect(result.isEmpty()).toBe(false)
  })

  it('invalid priority should produce validation error', async () => {
    const req = { query: { priority: 'super_high' }, body: {}, params: {} }
    await query('priority').optional().custom(value => !value || ['low', 'medium', 'high', 'critical'].includes(value)).run(req)
    const result = validationResult(req)
    expect(result.isEmpty()).toBe(false)
  })
})
