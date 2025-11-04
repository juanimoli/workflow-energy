import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authenticateToken } from '../middleware/auth';

const app = express();
app.use(authenticateToken);
app.get('/protected', (req, res) => {
  res.status(200).json({ message: 'Access granted' });
});

describe('Auth Middleware', () => {
  it('should block access without token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).not.toBe(200);
  });
});
