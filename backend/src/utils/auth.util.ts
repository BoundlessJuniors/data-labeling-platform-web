export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
export const DESKTOP_JWT_EXPIRES_IN = process.env.DESKTOP_JWT_EXPIRES_IN || JWT_EXPIRES_IN || '24h';

export const parseExpirationToMs = (expiresIn: string): number => {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 24 * 60 * 60 * 1000; // default 24h

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
};
