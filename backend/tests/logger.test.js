import { describe, it, expect } from 'vitest';
import logger from '../utils/logger';

describe('Logger Utility', () => {
  it('should have info, warn, and error methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});

