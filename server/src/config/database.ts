import { PrismaClient } from '@prisma/client';
import { env } from './env';

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  // Enforce append-only audit logs at the Prisma client level
  client.$use(async (params, next) => {
    if (params.model === 'AuditLog') {
      if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(params.action)) {
        throw new Error('Audit logs are append-only. Mutations are strictly prohibited.');
      }
    }
    return next(params);
  });

  return client;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const db = globalThis.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = db;
}
export default db;
