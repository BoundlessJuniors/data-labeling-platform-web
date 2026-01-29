import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Default rate limiter - 100 requests per minute
export const defaultRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// Strict rate limiter for auth routes - 10 requests per minute
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// API rate limiter - more lenient for authenticated users
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 200 requests per window
  message: {
    success: false,
    error: {
      message: 'API rate limit exceeded, please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req: Request, res: Response) => {
    // Skip rate limiting for successful responses from admins
    return false;
  },
});
