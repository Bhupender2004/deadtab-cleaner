/**
 * Users Route – POST /api/users
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const supabase = require('../db/supabaseClient');

/**
 * POST /api/users – Create a new user with a generated API key
 */
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid email address is required.',
      });
    }

    // Generate a random API key
    const apiKey = `dtc_${crypto.randomBytes(24).toString('hex')}`;

    // Insert user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.trim().toLowerCase(),
        api_key: apiKey,
      })
      .select()
      .single();

    if (error) {
      // Duplicate email check
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A user with this email already exists.',
        });
      }
      console.error('Create user error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create user.',
      });
    }

    // Create default settings for the user
    try {
      await supabase.from('settings').insert({
        user_id: user.id,
      });
    } catch (settingsError) {
      console.error('Create default settings error:', settingsError);
      // Non-fatal, user is already created
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        api_key: user.api_key,
        plan: user.plan,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('POST /api/users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Unexpected error creating user.',
    });
  }
});
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/users/me – Get current user details using API Key
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    plan: req.user.plan,
    created_at: req.user.created_at,
  });
});

module.exports = router;
