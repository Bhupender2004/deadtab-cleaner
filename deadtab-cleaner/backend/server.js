/**
 * DeadTab Cleaner – Express Server Entry Point (Restart trigger)
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Queue } = require('bullmq');

const { apiLimiter } = require('./middleware/rateLimiter');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const tabRoutes = require('./routes/tabs');
const notesRoutes = require('./routes/notes');
const settingsRoutes = require('./routes/settings');
const { startNoteWorker, stopNoteWorker } = require('./jobs/noteWorker');

const app = express();
const PORT = process.env.PORT || 3000;

/* ─── Middleware ─── */
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(apiLimiter);

/* ─── Routes ─── */
app.use('/', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api', tabRoutes);
app.use('/api', notesRoutes);
app.use('/api/settings', settingsRoutes);

/* ─── 404 Handler ─── */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

/* ─── Error Handler ─── */
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
});

/* ─── BullMQ Queue + Worker ─── */
let noteQueue = null;

function initializeQueue() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Parse Redis URL for connection options
    let redisConnection;
    try {
      const url = new URL(redisUrl);
      redisConnection = {
        host: url.hostname || 'localhost',
        port: parseInt(url.port, 10) || 6379,
        password: url.password || undefined,
        maxRetriesPerRequest: null,
      };
    } catch (_) {
      redisConnection = {
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: null,
      };
    }

    // Create BullMQ queue
    noteQueue = new Queue('noteGeneration', { connection: redisConnection });
    console.log('BullMQ note queue initialized');

    // Pass queue reference to tabs router
    tabRoutes.setNoteQueue(noteQueue);

    // Start the worker
    startNoteWorker(redisConnection);
  } catch (error) {
    console.warn('BullMQ initialization failed (Redis may not be running):', error.message);
    console.warn('Server will continue without job queue — AI notes will not be generated.');
  }
}

/* ─── Start Server ─── */
const server = app.listen(PORT, () => {
  console.log(`\n🧹 DeadTab Cleaner API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Initialize queue after server starts
  initializeQueue();
});

/* ─── Graceful Shutdown ─── */
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await stopNoteWorker();
      if (noteQueue) await noteQueue.close();
    } catch (error) {
      console.error('Shutdown error:', error);
    }
    console.log('Server stopped.');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
