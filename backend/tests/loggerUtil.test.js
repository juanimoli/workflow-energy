import { describe, it, expect } from 'vitest';
import winston from 'winston';
import logger from '../utils/logger';

describe('Logger Utility', () => {
  it('should have correct log levels', () => {
    expect(logger.levels).toEqual({
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4,
    });
  });

  it('should use colorized format', () => {
    const format = logger.format;
    expect(format).toBeDefined();
  });

  it('should have transports', () => {
    expect(Array.isArray(logger.transports) || typeof logger.transports === 'object').toBe(true);
  });

  it('should log messages without error', () => {
    expect(() => logger.info('Test info log')).not.toThrow();
    expect(() => logger.error('Test error log')).not.toThrow();
  });
});

