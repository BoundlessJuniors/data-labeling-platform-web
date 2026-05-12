/**
 * Central security configuration module.
 *
 * All environment-sensitive values are read lazily (at call time),
 * not at module-load time, so tests and startup validation work correctly.
 */
import crypto from 'node:crypto';
import type { CookieOptions } from 'express';
import { JWT_EXPIRES_IN, parseExpirationToMs } from '../utils/auth.util';

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

/** Lazily check whether the app is running in production. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Default/example values that must never be used in production. */
const EXAMPLE_JWT_SECRETS = [
  'your-super-secret-jwt-key-change-in-production',
  'your-secret-key-change-in-production',
];

/** Lazily read JWT_SECRET from process.env. */
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'your-secret-key-change-in-production';
}

/** Lazily read CSRF_SECRET, falling back to JWT_SECRET. */
export function getCsrfSecret(): string {
  return process.env.CSRF_SECRET || getJwtSecret();
}

// ---------------------------------------------------------------------------
// CORS origin list
// ---------------------------------------------------------------------------

/**
 * Return the raw, trimmed, non-empty entries from ALLOWED_ORIGINS.
 * Used by validateSecurityConfig() so validation sees the original value
 * (including any illegal path, query string, or hash) before normalization.
 */
function parseRawOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

/**
 * Return normalized allowed origins for runtime CORS/CSRF matching:
 *   - Splits, trims, and filters ALLOWED_ORIGINS.
 *   - Normalizes each entry via new URL(o).origin (strips trailing slash,
 *     path, query string, and hash).
 *   - Deduplicates with a Set.
 *   - Falls back to localhost origins in development.
 */
export function getAllowedOrigins(): string[] {
  const raw = parseRawOrigins();
  if (raw.length > 0) {
    const normalized = [
      ...new Set(
        raw.map((o) => {
          try {
            return new URL(o).origin;
          } catch {
            // Not a valid URL; validateSecurityConfig will catch it at startup.
            return o;
          }
        }),
      ),
    ];
    return normalized;
  }
  if (!isProduction()) {
    return ['http://localhost:3000', 'http://localhost:5173'];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function getSameSite(): 'lax' | 'strict' | 'none' {
  const val = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  if (val === 'strict' || val === 'none' || val === 'lax') return val;
  // Fall back to lax for unrecognised values; validateSecurityConfig warns/errors.
  return 'lax';
}

/** Cookie options used when setting the JWT auth token cookie. */
export function getAuthCookieOptions(): CookieOptions {
  const sameSite = getSameSite();
  const secure = isProduction() || sameSite === 'none';
  return {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: parseExpirationToMs(JWT_EXPIRES_IN),
    path: '/',
  };
}

/** Cookie options used when clearing the JWT auth token cookie. */
export function getAuthCookieClearOptions(): CookieOptions {
  const sameSite = getSameSite();
  const secure = isProduction() || sameSite === 'none';
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}

/** Cookie options used when setting the CSRF token cookie. */
export function getCsrfCookieOptions(): CookieOptions {
  const sameSite = getSameSite();
  const secure = isProduction() || sameSite === 'none';
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}

/** Cookie options used when clearing the CSRF token cookie. */
export function getCsrfCookieClearOptions(): CookieOptions {
  return getCsrfCookieOptions();
}

// ---------------------------------------------------------------------------
// CSRF signing
// ---------------------------------------------------------------------------

/** Generate a cryptographically secure random CSRF token (hex string). */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sign a CSRF token with HMAC-SHA256.
 * Returns the cookie value in the format `token.signature`.
 */
export function signCsrfToken(token: string): string {
  const secret = getCsrfSecret();
  const sig = crypto.createHmac('sha256', secret).update(token).digest('hex');
  return `${token}.${sig}`;
}

/**
 * Verify that the X-CSRF-Token header value matches the signed csrf_token cookie.
 *
 * Cookie format: `<token>.<signature>`.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 */
export function verifyCsrfToken(headerToken: string, cookieValue: string): boolean {
  const dotIdx = cookieValue.lastIndexOf('.');
  if (dotIdx === -1) return false;

  const storedToken = cookieValue.substring(0, dotIdx);
  const storedSig = cookieValue.substring(dotIdx + 1);

  // Header token must match the plain token portion of the cookie
  if (headerToken !== storedToken) return false;

  // Re-sign the stored token and compare signatures
  const secret = getCsrfSecret();
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(storedToken)
    .digest('hex');

  try {
    const a = Buffer.from(storedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Startup validation (fail-fast in production; warn in development)
// ---------------------------------------------------------------------------

/**
 * Validate critical security environment variables.
 *
 * Production:  calls process.exit(1) on any failure.
 * Development: prints warnings for dangerous settings (e.g. COOKIE_SAMESITE=none)
 *              but does not exit so localhost development is not broken.
 *
 * Must be called once, immediately after dotenv.config().
 */
export function validateSecurityConfig(): void {
  const prod = isProduction();
  const errors: string[] = [];
  const warnings: string[] = [];

  // --- JWT_SECRET (production-only) ---
  if (prod) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      errors.push('JWT_SECRET is required in production');
    } else if (EXAMPLE_JWT_SECRETS.some((s) => s === jwtSecret)) {
      errors.push('JWT_SECRET must not use the default/example value in production');
    } else if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production');
    }
  }

  // --- COOKIE_SAMESITE (all environments) ---
  const rawSameSite = process.env.COOKIE_SAMESITE;
  if (rawSameSite !== undefined) {
    const sameSiteVal = rawSameSite.toLowerCase();
    if (!['lax', 'strict', 'none'].includes(sameSiteVal)) {
      const msg = `COOKIE_SAMESITE="${rawSameSite}" is not a valid value. Use lax, strict, or none`;
      if (prod) errors.push(msg);
      else warnings.push(msg);
    } else if (sameSiteVal === 'none') {
      const msg =
        'COOKIE_SAMESITE=none requires Secure cookies (HTTPS). ' +
        'This will not work over plain HTTP (e.g. localhost). ' +
        'Use lax unless you have a cross-site deployment with HTTPS.';
      if (prod) {
        // Allowed in production (HTTPS is expected) — emit a notice only.
        console.warn(`⚠️  Security notice: ${msg}`);
      } else {
        warnings.push(msg);
      }
    }
  }

  // --- ALLOWED_ORIGINS (production-only) ---
  if (prod) {
    const rawOrigins = parseRawOrigins();
    if (rawOrigins.length === 0) {
      errors.push('ALLOWED_ORIGINS is required in production');
    } else {
      for (const rawOrigin of rawOrigins) {
        // Reject wildcard
        if (rawOrigin === '*') {
          errors.push('ALLOWED_ORIGINS must not contain wildcard (*) in production');
          continue;
        }
        // Reject localhost / loopback
        if (rawOrigin.includes('localhost') || rawOrigin.includes('127.0.0.1')) {
          errors.push(
            `ALLOWED_ORIGINS must not contain localhost or 127.0.0.1 in production: "${rawOrigin}"`,
          );
          continue;
        }
        // Validate URL syntax using the raw (pre-normalization) string
        let parsed: URL;
        try {
          parsed = new URL(rawOrigin);
        } catch {
          errors.push(`ALLOWED_ORIGINS contains an invalid URL: "${rawOrigin}"`);
          continue;
        }
        // Require https in production
        if (parsed.protocol !== 'https:') {
          errors.push(`ALLOWED_ORIGINS must use https:// in production: "${rawOrigin}"`);
        }
        // Reject paths other than "/" (trailing slash is accepted, normalized away)
        if (parsed.pathname !== '/') {
          errors.push(
            `ALLOWED_ORIGINS must be a bare origin with no path in production: "${rawOrigin}"`,
          );
        }
        // Reject query strings
        if (parsed.search) {
          errors.push(
            `ALLOWED_ORIGINS must not contain a query string in production: "${rawOrigin}"`,
          );
        }
        // Reject hashes
        if (parsed.hash) {
          errors.push(
            `ALLOWED_ORIGINS must not contain a hash in production: "${rawOrigin}"`,
          );
        }
      }
    }
  }

  // --- Optional CSRF_SECRET (all environments) ---
  const csrfSecret = process.env.CSRF_SECRET;
  if (csrfSecret !== undefined && csrfSecret.length < 32) {
    const msg = 'CSRF_SECRET must be at least 32 characters if provided';
    if (prod) errors.push(msg);
    else warnings.push(msg);
  }

  // Emit warnings in development
  if (warnings.length > 0) {
    console.warn('⚠️  Security configuration warnings:');
    warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  // Exit in production if any hard error was found
  if (errors.length > 0) {
    console.error('❌ Security configuration errors — refusing to start:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}
