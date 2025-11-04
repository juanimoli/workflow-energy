import express from 'express'; // Ensure express is properly imported
import request from 'supertest';
import authRoutes from '../routes/auth'; // Ensure the correct path to authRoutes
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => next()),
}));

const app = express();
app.use(express.json()); // This will now work as expected
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test
  });

  it('should return 400 if email is invalid during registration', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'invalid-email', password: 'password123' });

    expect(response.status).toBe(400);
  });
});