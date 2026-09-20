import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

declare global {
  // Reuse the client during Next.js development hot reloads.
  // eslint-disable-next-line no-var
  var __homeInventorySql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  globalThis.__homeInventorySql ??
  postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__homeInventorySql = sql;
}
