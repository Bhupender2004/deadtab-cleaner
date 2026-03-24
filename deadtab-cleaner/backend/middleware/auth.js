/**
 * Auth Middleware – Validates API key from Authorization header
 */
const supabase = require('../db/supabaseClient');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Use: Bearer <api_key>',
      });
    }

    const apiKey = authHeader.split(' ')[1];

    if (!apiKey || apiKey.trim() === '') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is empty.',
      });
    }

    // Look up user by api_key
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key.',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service unavailable.',
    });
  }
}

module.exports = authMiddleware;
