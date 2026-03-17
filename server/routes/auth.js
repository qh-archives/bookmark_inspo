const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  generateCodeVerifier,
  generateCodeChallenge,
  getAuthUrl,
  exchangeCodeForToken,
  getMe,
} = require('../services/twitter');
const db = require('../db');

const pendingAuth = new Map();

router.get('/login', (req, res) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const redirectUri = process.env.TWITTER_REDIRECT_URI;
  if (!clientId) return res.status(500).json({ error: 'Twitter credentials not configured.' });

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  pendingAuth.set(state, { codeVerifier, createdAt: Date.now() });
  for (const [key, val] of pendingAuth.entries()) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) pendingAuth.delete(key);
  }

  res.json({ url: getAuthUrl(clientId, redirectUri, codeChallenge, state) });
});

router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.redirect(`http://127.0.0.1:5173?auth_error=${encodeURIComponent(error)}`);

  const pending = pendingAuth.get(state);
  if (!pending) return res.redirect('http://127.0.0.1:5173?auth_error=invalid_state');
  pendingAuth.delete(state);

  try {
    const tokens = await exchangeCodeForToken(
      code, pending.codeVerifier,
      process.env.TWITTER_CLIENT_ID,
      process.env.TWITTER_CLIENT_SECRET,
      process.env.TWITTER_REDIRECT_URI
    );
    const me = await getMe(tokens.access_token);
    const expiresAt = Date.now() + (tokens.expires_in || 7200) * 1000;
    await db.upsertUser(me, tokens, expiresAt);
    res.redirect(`http://127.0.0.1:5173?user_id=${me.id}&username=${me.username}&name=${encodeURIComponent(me.name)}&avatar=${encodeURIComponent(me.profile_image_url || '')}`);
  } catch (err) {
    console.error('Auth callback error:', err.message);
    res.redirect(`http://127.0.0.1:5173?auth_error=token_exchange_failed`);
  }
});

router.get('/me', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const user = await db.get('SELECT id, username, name, profile_image_url FROM users WHERE id = ?', [user_id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
