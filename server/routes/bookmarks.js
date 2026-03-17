const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  getBookmarks,
  extractLinkPreview,
  resolveCleanText,
  refreshAccessToken,
} = require('../services/twitter');
const { categorize, tagify } = require('../services/categorize');

const CARD_W = 260;
const CARD_H = 300;
const GAP_X = 30;
const GAP_Y = 30;
const COLS = 6;

let gridCounter = 0;

function gridPosition() {
  const col = gridCounter % COLS;
  const row = Math.floor(gridCounter / COLS);
  gridCounter++;
  const jitterX = (Math.random() - 0.5) * 10;
  const jitterY = (Math.random() - 0.5) * 10;
  return {
    x: col * (CARD_W + GAP_X) - (COLS * (CARD_W + GAP_X)) / 2 + jitterX,
    y: row * (CARD_H + GAP_Y) - 200 + jitterY,
    rotation: (Math.random() - 0.5) * 2,
  };
}

// Keep randomPosition as alias
const randomPosition = gridPosition;

async function ensureValidToken(user) {
  if (!user.refresh_token) return user.access_token;
  if (Date.now() < user.token_expires_at - 60000) return user.access_token;

  try {
    const tokens = await refreshAccessToken(
      user.refresh_token,
      process.env.TWITTER_CLIENT_ID,
      process.env.TWITTER_CLIENT_SECRET
    );
    const expiresAt = Date.now() + (tokens.expires_in || 7200) * 1000;
    db.prepare(
      'UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE id = ?'
    ).run(tokens.access_token, tokens.refresh_token || user.refresh_token, expiresAt, user.id);
    return tokens.access_token;
  } catch (err) {
    console.error('Token refresh failed:', err.message);
    return user.access_token;
  }
}

router.post('/sync', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    const accessToken = await ensureValidToken(user);
    let nextToken = null;
    let added = 0;
    let pages = 0;

    do {
      const data = await getBookmarks(accessToken, user_id, nextToken);
      const tweets = data.data || [];
      const includes = data.includes || {};
      const mediaMap = {};
      const userMap = {};

      for (const m of includes.media || []) {
        mediaMap[m.media_key] = m;
      }
      for (const u of includes.users || []) {
        userMap[u.id] = u;
      }

      for (const tweet of tweets) {
        const exists = db.prepare('SELECT id FROM bookmarks WHERE tweet_id = ? AND user_id = ?').get(tweet.id, user_id);
        if (exists) continue;

        const author = userMap[tweet.author_id] || {};
        const mediaKeys = tweet.attachments?.media_keys || [];
        const media = mediaKeys.map(k => mediaMap[k]).filter(Boolean);
        const primaryMedia = media[0] || null;

        const linkPreview = extractLinkPreview(tweet);
        const cleanText = resolveCleanText(tweet);

        const tweetData = {
          text: cleanText,
          media_type: primaryMedia?.type || null,
          link_title: linkPreview?.title || null,
          link_description: linkPreview?.description || null,
        };
        const { category, emoji } = categorize(tweetData);
        const pos = randomPosition();

        const mediaUrl = primaryMedia?.url || primaryMedia?.preview_image_url || null;
        const previewImg = primaryMedia?.preview_image_url || null;

        db.prepare(`
          INSERT INTO bookmarks (
            id, user_id, tweet_id, text,
            author_id, author_name, author_username, author_image,
            media_url, media_type, preview_image,
            url, link_title, link_description, link_image,
            category, category_emoji,
            canvas_x, canvas_y, canvas_rotation,
            bookmarked_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `${user_id}_${tweet.id}`,
          user_id,
          tweet.id,
          cleanText,
          tweet.author_id,
          author.name || 'Unknown',
          author.username || 'unknown',
          author.profile_image_url || null,
          mediaUrl,
          primaryMedia?.type || null,
          previewImg,
          linkPreview?.url || null,
          linkPreview?.title || null,
          linkPreview?.description || null,
          linkPreview?.image || null,
          category,
          emoji,
          pos.x,
          pos.y,
          pos.rotation,
          tweet.created_at ? new Date(tweet.created_at).getTime() : Date.now()
        );
        added++;
      }

      nextToken = data.meta?.next_token || null;
      pages++;
    } while (nextToken && pages < 10);

    res.json({ added, message: `Synced ${added} new bookmarks` });
  } catch (err) {
    console.error('Sync error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

router.get('/', (req, res) => {
  const { user_id, search, category, limit = 500 } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  let query = 'SELECT * FROM bookmarks WHERE user_id = ?';
  const params = [user_id];

  if (category && category !== 'All') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (text LIKE ? OR author_name LIKE ? OR author_username LIKE ? OR link_title LIKE ? OR category LIKE ? OR tags LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }

  query += ' ORDER BY bookmarked_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const bookmarks = db.prepare(query).all(...params);
  res.json(bookmarks);
});

router.patch('/:id/position', (req, res) => {
  const { id } = req.params;
  const { x, y, rotation } = req.body;
  db.prepare('UPDATE bookmarks SET canvas_x = ?, canvas_y = ?, canvas_rotation = ? WHERE id = ?').run(x, y, rotation, id);
  res.json({ ok: true });
});

router.delete('/by-tweet/:tweet_id', (req, res) => {
  const { tweet_id } = req.params;
  const { user_id } = req.query;
  const result = user_id && user_id !== 'all'
    ? db.prepare('DELETE FROM bookmarks WHERE tweet_id = ? AND user_id = ?').run(tweet_id, user_id)
    : db.prepare('DELETE FROM bookmarks WHERE tweet_id = ?').run(tweet_id);
  res.json({ ok: true, deleted: result.changes });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM bookmarks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.patch('/:id/category', (req, res) => {
  const { id } = req.params;
  const { category, emoji } = req.body;
  db.prepare('UPDATE bookmarks SET category = ?, category_emoji = ? WHERE id = ?').run(category, emoji, id);
  res.json({ ok: true });
});

router.post('/relayout', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const bookmarks = db.prepare('SELECT id FROM bookmarks WHERE user_id = ? ORDER BY bookmarked_at DESC').all(user_id);
  gridCounter = 0;

  const update = db.prepare('UPDATE bookmarks SET canvas_x = ?, canvas_y = ?, canvas_rotation = ? WHERE id = ?');
  const relayout = db.transaction(() => {
    for (const bm of bookmarks) {
      const pos = gridPosition();
      update.run(pos.x, pos.y, pos.rotation, bm.id);
    }
  });
  relayout();

  res.json({ ok: true, count: bookmarks.length });
});

router.get('/count', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM bookmarks').get();
  res.json({ count: row.count });
});

router.post('/import', (req, res) => {
  const { tweet_id, tweet_url, author_name, author_username, author_image,
    text, media_url, preview_image, link_url, link_title, link_image, force_update } = req.body;

  if (!tweet_id) return res.status(400).json({ error: 'tweet_id required' });

  const user = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get();
  if (!user) return res.status(400).json({ error: 'No user logged in. Open the canvas app and connect Twitter first.' });

  const id = `${user.id}_${tweet_id}`;
  const exists = db.prepare('SELECT id, media_url, link_image FROM bookmarks WHERE id = ?').get(id);

  if (exists) {
    // Update media if we now have it and didn't before
    const hasNewMedia = (media_url || link_image) && !exists.media_url && !exists.link_image;
    if (hasNewMedia || force_update) {
      db.prepare(`
        UPDATE bookmarks SET
          media_url = COALESCE(?, media_url),
          preview_image = COALESCE(?, preview_image),
          link_image = COALESCE(?, link_image),
          link_title = COALESCE(?, link_title),
          author_image = COALESCE(?, author_image)
        WHERE id = ?
      `).run(media_url || null, preview_image || null, link_image || null, link_title || null, author_image || null, id);
    }
    return res.json({ ok: true, duplicate: true });
  }

  const { category, emoji } = categorize({ text, link_title });
  const tags = tagify({ text, link_title, author_username });
  const pos = randomPosition();

  db.prepare(`
    INSERT INTO bookmarks (
      id, user_id, tweet_id, text,
      author_name, author_username, author_image,
      media_url, preview_image,
      url, link_title, link_image,
      category, category_emoji, tags,
      canvas_x, canvas_y, canvas_rotation,
      bookmarked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, user.id, tweet_id, text || '',
    author_name || '', author_username || '', author_image || null,
    media_url || null, preview_image || null,
    link_url || tweet_url || null, link_title || null, link_image || null,
    category, emoji, JSON.stringify(tags),
    pos.x, pos.y, pos.rotation,
    Date.now()
  );

  res.json({ ok: true });
});

router.get('/categories', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const cats = db.prepare('SELECT category, category_emoji, COUNT(*) as count FROM bookmarks WHERE user_id = ? GROUP BY category ORDER BY count DESC').all(user_id);
  res.json(cats);
});

// Get all unique tags across bookmarks
router.get('/tags', (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const rows = db.prepare('SELECT tags FROM bookmarks WHERE user_id = ? AND tags IS NOT NULL AND tags != ?').all(user_id, '[]');
  const tagCount = {};
  for (const row of rows) {
    try {
      const tags = JSON.parse(row.tags);
      for (const t of tags) tagCount[t] = (tagCount[t] || 0) + 1;
    } catch {}
  }
  const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  res.json(sorted);
});

// Re-tag all existing bookmarks
router.post('/retag', (req, res) => {
  const { user_id } = req.query;
  const rows = user_id
    ? db.prepare('SELECT id, text, link_title, author_username FROM bookmarks WHERE user_id = ?').all(user_id)
    : db.prepare('SELECT id, text, link_title, author_username FROM bookmarks').all();
  const update = db.prepare('UPDATE bookmarks SET tags = ? WHERE id = ?');
  db.transaction(() => {
    for (const row of rows) {
      const tags = tagify({ text: row.text, link_title: row.link_title, author_username: row.author_username });
      update.run(JSON.stringify(tags), row.id);
    }
  })();
  res.json({ ok: true, retagged: rows.length });
});

module.exports = router;
