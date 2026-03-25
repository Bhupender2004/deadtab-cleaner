/**
 * Tabs/Archives Routes – CRUD + BullMQ job enqueue
 */
const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const authMiddleware = require('../middleware/auth');
const { archiveLimiter } = require('../middleware/rateLimiter');

// Lazy-loaded queue reference (set from server.js)
let noteQueue = null;

function setNoteQueue(queue) {
  noteQueue = queue;
}

/**
 * POST /api/archive – Save an archived tab and enqueue AI note generation
 */
router.post('/archive', authMiddleware, archiveLimiter, async (req, res) => {
  try {
    const { url, title, scrollDepth, bodyPreview, metaDescription, focusSeconds } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URL is required.',
      });
    }

    // Extract domain from URL
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch (_) {
      domain = url;
    }

    // Insert archive record
    const { data: archive, error } = await supabase
      .from('archives')
      .insert({
        user_id: req.user.id,
        url,
        title: title || 'Untitled',
        domain,
        focus_seconds: focusSeconds || 0,
        scroll_depth: scrollDepth || 0,
        page_text_snippet: (bodyPreview || metaDescription || '').slice(0, 500),
        status: 'auto',
      })
      .select()
      .single();

    if (error) {
      console.error('Insert archive error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to save archive.',
      });
    }

    // Enqueue AI note generation job
    if (noteQueue) {
      try {
        await noteQueue.add('generateNote', {
          archiveId: archive.id,
          url: archive.url,
          title: archive.title,
          domain: archive.domain,
          pageTextSnippet: archive.page_text_snippet,
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        });
        console.log(`Enqueued AI note job for archive ${archive.id}`);
      } catch (queueError) {
        console.error('Failed to enqueue note job:', queueError);
        // Non-fatal – archive is already saved
      }
    } else {
      console.warn('Note queue not available — skipping AI note generation');
    }

    res.status(201).json({
      message: 'Tab archived successfully',
      archive,
    });
  } catch (error) {
    console.error('POST /api/archive error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unexpected error archiving tab.',
    });
  }
});

/**
 * GET /api/archives – Paginated list with search, tag, and domain filters
 */
router.get('/archives', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      tag,
      domain,
      sort = 'archived_at',
      order = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build query – join with notes
    let query = supabase
      .from('archives')
      .select('*, notes(*)', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limitNum - 1);

    // Search filter (title or URL)
    if (search) {
      query = query.or(`title.ilike.%${search}%,url.ilike.%${search}%`);
    }

    // Domain filter
    if (domain) {
      query = query.eq('domain', domain);
    }

    const { data: archives, error, count } = await query;

    if (error) {
      console.error('Fetch archives error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch archives.',
      });
    }

    // Filter by tag (post-query, since tags are in the notes table)
    let filtered = archives;
    if (tag) {
      filtered = archives.filter((a) =>
        a.notes && a.notes.some((n) =>
          n.topic_tags && n.topic_tags.includes(tag.toLowerCase())
        )
      );
    }

    // Map to camelCase
    const mappedArchives = filtered.map(a => ({
      id: a.id,
      userId: a.user_id,
      url: a.url,
      title: a.title,
      domain: a.domain,
      focusSeconds: a.focus_seconds,
      scrollDepth: a.scroll_depth,
      pageTextSnippet: a.page_text_snippet,
      archivedAt: a.archived_at,
      status: a.status,
      notes: (a.notes || []).map(n => ({
        id: n.id,
        summary: n.summary,
        intentTag: n.intent_tag,
        topicTags: n.topic_tags,
        readTimeSeconds: n.read_time_seconds,
        aiModel: n.ai_model,
        generatedAt: n.generated_at
      }))
    }));

    res.json({
      archives: mappedArchives,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('GET /api/archives error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unexpected error fetching archives.',
    });
  }
});

/**
 * GET /api/archives/:id – Single archive with notes
 */
router.get('/archives/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: archive, error } = await supabase
      .from('archives')
      .select('*, notes(*)')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !archive) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Archive not found.',
      });
    }

    const mappedArchive = {
      id: archive.id,
      userId: archive.user_id,
      url: archive.url,
      title: archive.title,
      domain: archive.domain,
      focusSeconds: archive.focus_seconds,
      scrollDepth: archive.scroll_depth,
      pageTextSnippet: archive.page_text_snippet,
      archivedAt: archive.archived_at,
      status: archive.status,
      notes: (archive.notes || []).map(n => ({
        id: n.id,
        summary: n.summary,
        intentTag: n.intent_tag,
        topicTags: n.topic_tags,
        readTimeSeconds: n.read_time_seconds,
        aiModel: n.ai_model,
        generatedAt: n.generated_at
      }))
    };

    res.json({ archive: mappedArchive });
  } catch (error) {
    console.error('GET /api/archives/:id error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unexpected error fetching archive.',
    });
  }
});

/**
 * DELETE /api/archives/:id – Delete an archive (cascades to notes)
 */
router.delete('/archives/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('archives')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Delete archive error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete archive.',
      });
    }

    res.json({ message: 'Archive deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/archives/:id error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unexpected error deleting archive.',
    });
  }
});

/**
 * DELETE /api/archives – Delete ALL archives for the current user
 */
router.delete('/archives', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('archives')
      .delete()
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Delete all archives error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete all archives.',
      });
    }

    res.json({ message: 'All archives deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/archives error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unexpected error deleting all archives.',
    });
  }
});

module.exports = router;
module.exports.setNoteQueue = setNoteQueue;
