/**
 * Score Service – Calculates a 0-100 habit score from the last 30 days of data
 *
 * Weighted factors:
 *   - Tab turnover rate:      30%
 *   - Focus ratio:            25%
 *   - Research conversion:    25%
 *   - Session discipline:     20%
 */
const supabase = require('../db/supabaseClient');

/**
 * Calculate the user's habit score.
 * @param {string} userId
 * @returns {Object} { score, factors, weeklyHistory }
 */
async function calculateHabitScore(userId) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch archives from the last 30 days
    const { data: archives, error } = await supabase
      .from('archives')
      .select('*, notes(*)')
      .eq('user_id', userId)
      .gte('archived_at', thirtyDaysAgo.toISOString())
      .order('archived_at', { ascending: true });

    if (error) {
      console.error('Fetch archives for score error:', error);
      throw new Error('Failed to fetch archive data');
    }

    const archiveList = archives || [];

    // ── Factor 1: Tab Turnover Rate (30%) ──
    // Higher is better — means the user is actively cleaning up tabs
    // Score based on average tabs archived per day
    const daysActive = Math.max(1, calculateActiveDays(archiveList));
    const tabsPerDay = archiveList.length / daysActive;
    // Optimal: 2-8 tabs/day. Below 1 is low, above 15 is excessive
    const turnoverScore = clampScore(tabsPerDay <= 8
      ? (tabsPerDay / 8) * 100
      : Math.max(0, 100 - (tabsPerDay - 8) * 5)
    );

    // ── Factor 2: Focus Ratio (25%) ──
    // What percentage of archived tabs had meaningful engagement (focus > 30s, scroll > 20%)
    const focusedTabs = archiveList.filter(
      (a) => a.focus_seconds > 30 || a.scroll_depth > 20
    ).length;
    const focusRatio = archiveList.length > 0
      ? (focusedTabs / archiveList.length) * 100
      : 50; // Default to neutral if no data

    // ── Factor 3: Research Conversion (25%) ──
    // What percentage of archived tabs have AI-generated notes (meaning they were processed)
    const withNotes = archiveList.filter(
      (a) => a.notes && a.notes.length > 0
    ).length;
    const conversionRatio = archiveList.length > 0
      ? (withNotes / archiveList.length) * 100
      : 50;

    // ── Factor 4: Session Discipline (20%) ──
    // How evenly spread are the archives across the 30 days?
    // Penalize binge-archiving (all on one day) vs. steady cleanup
    const dailyCounts = getDailyCounts(archiveList, thirtyDaysAgo, now);
    const disciplineScore = calculateEvenness(dailyCounts);

    // ── Weighted total ──
    const totalScore = Math.round(
      turnoverScore * 0.30 +
      focusRatio * 0.25 +
      conversionRatio * 0.25 +
      disciplineScore * 0.20
    );

    // ── 8-week history ──
    const weeklyHistory = calculateWeeklyHistory(userId, archiveList, now);

    return {
      score: clampScore(totalScore),
      factors: {
        tabTurnover: { score: Math.round(turnoverScore), weight: 30, tabsPerDay: Math.round(tabsPerDay * 10) / 10 },
        focusRatio: { score: Math.round(focusRatio), weight: 25, focusedTabs, totalTabs: archiveList.length },
        researchConversion: { score: Math.round(conversionRatio), weight: 25, withNotes, totalTabs: archiveList.length },
        sessionDiscipline: { score: Math.round(disciplineScore), weight: 20 },
      },
      weeklyHistory,
      totalArchives: archiveList.length,
      periodDays: 30,
    };
  } catch (error) {
    console.error('calculateHabitScore error:', error);
    return {
      score: 50,
      factors: {
        tabTurnover: { score: 50, weight: 30 },
        focusRatio: { score: 50, weight: 25 },
        researchConversion: { score: 50, weight: 25 },
        sessionDiscipline: { score: 50, weight: 20 },
      },
      weeklyHistory: Array(8).fill({ week: 0, score: 50, archives: 0 }),
      totalArchives: 0,
      periodDays: 30,
    };
  }
}

/**
 * Count unique active days from archives
 */
function calculateActiveDays(archives) {
  const days = new Set();
  archives.forEach((a) => {
    const day = new Date(a.archived_at).toISOString().slice(0, 10);
    days.add(day);
  });
  return days.size;
}

/**
 * Get daily archive counts over the period
 */
function getDailyCounts(archives, startDate, endDate) {
  const counts = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Initialize all days to 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    counts[d.toISOString().slice(0, 10)] = 0;
  }

  archives.forEach((a) => {
    const day = new Date(a.archived_at).toISOString().slice(0, 10);
    if (counts[day] !== undefined) {
      counts[day]++;
    }
  });

  return Object.values(counts);
}

/**
 * Calculate evenness of distribution (inverse coefficient of variation)
 * More even distribution → higher score
 */
function calculateEvenness(counts) {
  if (counts.length === 0) return 50;

  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 50;

  const mean = total / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  // CV of 0 = perfectly even (score 100), CV of 3+ = very uneven (score ~0)
  return clampScore(Math.max(0, 100 - cv * 33));
}

/**
 * Generate 8-week history array
 */
function calculateWeeklyHistory(userId, archives, now) {
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

    const weekArchives = archives.filter((a) => {
      const date = new Date(a.archived_at);
      return date >= weekStart && date < weekEnd;
    });

    const weekFocused = weekArchives.filter(
      (a) => a.focus_seconds > 30 || a.scroll_depth > 20
    ).length;

    const focusRatio = weekArchives.length > 0
      ? (weekFocused / weekArchives.length) * 100
      : 50;

    weeks.push({
      week: 8 - i,
      weekStart: weekStart.toISOString().slice(0, 10),
      archives: weekArchives.length,
      score: Math.round(Math.min(100, focusRatio)),
    });
  }
  return weeks;
}

/**
 * Clamp a score to 0-100
 */
function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

module.exports = { calculateHabitScore };
