import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('Projects Routes - Basic Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should load the projects router without errors', async () => {
    const app = express();
    app.use(express.json());
    
    // Just try to import the router
    const projectsRouter = await import('../routes/projects');
    expect(projectsRouter).toBeDefined();
    expect(projectsRouter.default).toBeDefined();
  });

  it('should return 401 for unauthenticated requests', async () => {
    const app = express();
    app.use(express.json());
    
    const projectsRouter = await import('../routes/projects');
    app.use('/projects', projectsRouter.default);
    
    const response = await request(app)
      .get('/projects')
      .expect(401);
      
    expect(response.status).toBe(401);
  });
});