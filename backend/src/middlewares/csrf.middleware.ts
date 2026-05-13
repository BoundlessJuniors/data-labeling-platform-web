/**
 * CSRF protection middleware and JSON-only request guard for /api/v1.
 */
import { Request, Response, NextFunction } from 'express';
import { getAllowedOrigins, verifyCsrfToken, isProduction } from '../config/security';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ---------------------------------------------------------------------------
// JSON-only guard (must run BEFORE body parsers)
// ---------------------------------------------------------------------------

/**
 * Reject unsafe requests whose Content-Type is present but not application/json.
 * Bodyless unsafe requests (no Content-Type header) are allowed.
 * Safe methods always pass.
 * Returns 415 Unsupported Media Type for disallowed content types.
 */
export function rejectNonJsonUnsafeRequests(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method.toUpperCase();
  if (!UNSAFE_METHODS.has(method)) return next();

  const contentType = req.headers['content-type'];
  // No Content-Type → bodyless request (e.g. POST /logout) → allow
  if (!contentType) return next();

  if (!contentType.toLowerCase().startsWith('application/json')) {
    res.status(415).json({
      success: false,
      error: { message: 'Unsupported Media Type: API only accepts application/json' },
    });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// Origin/Referer parser helper
// ---------------------------------------------------------------------------

function parseOriginFromReferer(referer: string): string | null {
  try {
    const url = new URL(referer);
    return url.origin;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CSRF protection middleware (runs AFTER cookieParser and rate limiter)
// ---------------------------------------------------------------------------

/**
 * CSRF protection for /api/v1 routes:
 *
 * Safe methods (GET, HEAD, OPTIONS) pass immediately.
 *
 * Unsafe methods (POST, PUT, PATCH, DELETE) must pass three checks:
 *   1. Origin/Referer must match an allowed origin.
 *      - In production: both absent → 403.
 *      - In development: both absent → allowed (supports curl/Postman).
 *   2. X-CSRF-Token header must be present.
 *   3. csrf_token cookie must be present and its signature must be valid,
 *      and it must match the header token.
 *
 * All failures return 403 with { success: false, error: { message: "CSRF validation failed" } }.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Safe methods pass immediately
  if (!UNSAFE_METHODS.has(method)) return next();

  // --- Desktop login and refresh CSRF bypass ---
  // The desktop login endpoint receives credentials but no cookies, and desktop clients
  // do not send Origin/Referer natively. We explicitly allow POST /api/v1/desktop/auth/login.
  // We also explicitly allow POST /api/v1/desktop/auth/refresh if it uses no cookies.
  // We strictly check the exact path to prevent bypassing CSRF globally.
  const path = req.originalUrl.split('?')[0];
  if (method === 'POST') {
    if (path === '/api/v1/desktop/auth/login') {
      return next();
    }
    if (path === '/api/v1/desktop/auth/refresh') {
      const hasTokenCookie = !!req.cookies?.token;
      const hasCsrfCookie = !!req.cookies?.csrf_token;
      if (!hasTokenCookie && !hasCsrfCookie) {
        return next();
      }
    }
  }

  // --- Bearer token CSRF bypass ---
  // If the request is authenticated with a Bearer token and contains NO cookies
  // that could be abused by an ambient cross-site request, we can safely bypass CSRF.
  // Explicit Authorization headers are not automatically sent by browsers cross-site.
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const hasTokenCookie = !!req.cookies?.token;
    const hasCsrfCookie = !!req.cookies?.csrf_token;
    
    // Narrow bypass: Only skip CSRF if no auth/csrf cookies are present.
    // If a cookie is present, we still enforce CSRF to prevent mixed-auth attacks.
    if (!hasTokenCookie && !hasCsrfCookie) {
      return next();
    }
  }

  const allowedOrigins = getAllowedOrigins();

  // --- 1. Origin/Referer validation ---
  const originHeader = req.headers['origin'];
  const refererHeader = req.headers['referer'];

  if (originHeader) {
    if (!allowedOrigins.includes(originHeader)) {
      res.status(403).json({ success: false, error: { message: 'CSRF validation failed' } });
      return;
    }
  } else if (refererHeader) {
    const refererOrigin = parseOriginFromReferer(refererHeader);
    if (!refererOrigin || !allowedOrigins.includes(refererOrigin)) {
      res.status(403).json({ success: false, error: { message: 'CSRF validation failed' } });
      return;
    }
  } else {
    // Neither Origin nor Referer
    if (isProduction()) {
      res.status(403).json({ success: false, error: { message: 'CSRF validation failed' } });
      return;
    }
    // Development: allow for curl/Postman workflows — fall through to token check
  }

  // --- 2 & 3. Signed CSRF token validation ---
  const headerToken = req.headers['x-csrf-token'] as string | undefined;
  const cookieValue = req.cookies?.csrf_token as string | undefined;

  if (!headerToken || !cookieValue) {
    res.status(403).json({ success: false, error: { message: 'CSRF validation failed' } });
    return;
  }

  if (!verifyCsrfToken(headerToken, cookieValue)) {
    res.status(403).json({ success: false, error: { message: 'CSRF validation failed' } });
    return;
  }

  next();
}
