// Server entry: connect DB → migrate → seed admin → listen. SIGTERM checkpoint.
import { env } from './env.ts';
import { getDb, checkpointAndClose } from './db/connection.ts';
import { runMigrations } from './db/migrate.ts';
import { seedAdmin } from './auth/seed-admin.ts';
import { createApp } from './app.ts';

async function main(): Promise<void> {
  const db = getDb();
  runMigrations(db);
  await seedAdmin(db);

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] listening on :${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} → shutting down`);
    server.close(() => {
      checkpointAndClose();
      process.exit(0);
    });
    // Force exit nếu kẹt.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[boot] fatal:', err);
  process.exit(1);
});
