import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Gelen isteğin IP adresindeki port numaralarını ve köşeli parantez yapısını
 * temizleyerek express-rate-limit v7+'in ERR_ERL_KEY_GEN_IPV6 hatasını önler.
 */
function getCleanIp(req: Request): string {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  
  if (ip === 'unknown') return ip;

  // Localhost IPv6 fix
  if (ip === '::1' || ip === '[::1]') return '::1';

  // IPv4 mapped to IPv6 (e.g., ::ffff:127.0.0.1) -> Return just the IPv4 part
  if (ip.includes('::ffff:')) {
    const ipv4 = ip.split('::ffff:')[1];
    if (ipv4) return ipv4.split(':')[0]; // Strip port if exists
  }

  // Pure IPv4 (e.g., 127.0.0.1:8080)
  if (ip.includes('.')) {
    return ip.split(':')[0];
  }

  // Pure IPv6 (strip brackets)
  return ip.replace(/[\[\]]/g, '');
}

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
  keyGenerator: getCleanIp,
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
  keyGenerator: getCleanIp,
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
  keyGenerator: getCleanIp,
});
