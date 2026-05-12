import helmet from 'helmet';
import cors from 'cors';
import { Express } from 'express';
import { getAllowedOrigins } from '../config/security';

// Configure security middleware
export const setupSecurity = (app: Express): void => {
  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration
  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        // No Origin header — same-origin or non-browser client (curl, mobile).
        // CORS does not apply; CSRF middleware enforces origin checks for unsafe methods.
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
      exposedHeaders: [
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'Content-Disposition',
      ],
      maxAge: 86400, // 24 hours
    }),
  );
};
