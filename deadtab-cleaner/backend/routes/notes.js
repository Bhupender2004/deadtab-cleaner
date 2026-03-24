/**
 * Notes Route – GET /api/score
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { calculateHabitScore } = require('../services/scoreService');

/**
 * GET /api/score – Calculate and return the user's habit score
 */
router.get('/score', authMiddleware, async (req, res) => {
  try {
    const result = await calculateHabitScore(req.user.id);

    res.json({
      userId: req.user.id,
      ...result,
    });
  } catch (error) {
    console.error('GET /api/score error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to calculate habit score.',
    });
  }
});

module.exports = router;
