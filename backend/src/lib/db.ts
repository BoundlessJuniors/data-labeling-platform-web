import { Prisma, PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
// Prevents multiple instances in development with hot reloading

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaLog: Prisma.LogLevel[] =
  process.env.PRISMA_QUERY_LOG === 'true'
    ? ['query', 'info', 'warn', 'error']
    : process.env.NODE_ENV === 'production'
      ? ['error']
      : ['warn', 'error'];

export const prisma = global.prisma || new PrismaClient({
  log: prismaLog,
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
