/**
 * Note Worker – BullMQ worker for AI note generation
 * Processes generateNote jobs with up to 3 concurrent workers.
 */
const { Worker } = require('bullmq');
const { generateNote } = require('../services/aiService');

let worker = null;

/**
 * Start the note generation worker.
 * @param {Object} redisConnection - IORedis connection options
 */
function startNoteWorker(redisConnection) {
  try {
    worker = new Worker(
      'noteGeneration',
      async (job) => {
        const { archiveId, url, title, domain, pageTextSnippet } = job.data;
        console.log(`[NoteWorker] Processing job ${job.id} for archive ${archiveId}`);

        try {
          const note = await generateNote({
            archiveId,
            url,
            title,
            domain,
            pageTextSnippet,
          });
          console.log(`[NoteWorker] Job ${job.id} completed – note ${note.id}`);
          return { noteId: note.id, archiveId };
        } catch (error) {
          console.error(`[NoteWorker] Job ${job.id} failed:`, error.message);
          // Never throw – log the failure and return gracefully
          return { error: error.message, archiveId };
        }
      },
      {
        connection: redisConnection,
        concurrency: 3,
        limiter: {
          max: 10,
          duration: 60000, // Max 10 jobs per minute
        },
      }
    );

    worker.on('completed', (job, result) => {
      console.log(`[NoteWorker] Job ${job.id} completed:`, result);
    });

    worker.on('failed', (job, error) => {
      console.error(`[NoteWorker] Job ${job?.id} failed:`, error?.message);
    });

    worker.on('error', (error) => {
      console.error('[NoteWorker] Worker error:', error);
    });

    console.log('[NoteWorker] Started with concurrency=3');
    return worker;
  } catch (error) {
    console.error('[NoteWorker] Failed to start:', error);
    return null;
  }
}

/**
 * Gracefully shut down the worker.
 */
async function stopNoteWorker() {
  if (worker) {
    try {
      await worker.close();
      console.log('[NoteWorker] Stopped');
    } catch (error) {
      console.error('[NoteWorker] Error stopping:', error);
    }
  }
}

module.exports = { startNoteWorker, stopNoteWorker };
