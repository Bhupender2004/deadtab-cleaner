/**
 * Archive Service – Helper functions for archive operations
 */
const supabase = require('../db/supabaseClient');

/**
 * Get a single archive by ID.
 */
async function getArchiveById(archiveId) {
  try {
    const { data, error } = await supabase
      .from('archives')
      .select('*, notes(*)')
      .eq('id', archiveId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('getArchiveById error:', error);
    return null;
  }
}

/**
 * Get archives by user ID with pagination.
 */
async function getArchivesByUser(userId, { page = 1, limit = 20 } = {}) {
  try {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('archives')
      .select('*, notes(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('archived_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { archives: data || [], total: count || 0 };
  } catch (error) {
    console.error('getArchivesByUser error:', error);
    return { archives: [], total: 0 };
  }
}

/**
 * Get unique domains for a user.
 */
async function getUserDomains(userId) {
  try {
    const { data, error } = await supabase
      .from('archives')
      .select('domain')
      .eq('user_id', userId);

    if (error) throw error;

    const domains = [...new Set((data || []).map((a) => a.domain).filter(Boolean))];
    return domains.sort();
  } catch (error) {
    console.error('getUserDomains error:', error);
    return [];
  }
}

module.exports = { getArchiveById, getArchivesByUser, getUserDomains };
