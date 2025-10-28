// server.ts
import 'dotenv/config';
import http from 'http';
import app from './app';
import { loadEnv } from './config/env';
import { startReminderJob } from './src/modules/appointments/reminder/reminderJob';
import { prisma } from './src/infra/prisma';

const env = loadEnv();
const PORT = Number(env.PORT ?? 4000);

const server = http.createServer(app);

let stopReminderJob: (() => void) | null = null;

const JOBS_ENABLED = process.env.JOBS_ENABLED !== 'false'; // par défaut on active
server.listen(PORT, () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
  if (JOBS_ENABLED) {
    stopReminderJob = startReminderJob();
  }
});

// === Robustesse & arrêt propre ===
async function shutdown(code = 0) {
  try {
    console.log('🛑 Shutting down…');
    if (stopReminderJob) {
      stopReminderJob();
      stopReminderJob = null;
    }
    await prisma.$disconnect().catch(() => {});
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(code);
    });
    // Si close ne revient pas (sockets pendantes), force après délai
    setTimeout(() => process.exit(code), 3000).unref();
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Debug exceptions/rejections -> arrêt propre
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown(1);
});

// Signaux
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  shutdown(0);
});
process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  shutdown(0);
});

// Listeners sur le BON serveur (celui qui écoute)
server.on('error', (err) => {
  console.error('HTTP server error:', err);
});
