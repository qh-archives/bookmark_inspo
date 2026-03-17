const express = require('express');
const router = express.Router();
const db = require('../db');
const { getBookmarks, extractLinkPreview, resolveCleanText, refreshAccessToken } = require('../services/twitter');
const { categorize, tagify } = require('../services/categorize');

// Only allow writes if ADMIN_KEY matches (or no key is set, for local dev)
function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_KEY;
  if (!key) return next();
  const provided = req.headers['x-admin-key'] || req.query.admin_key || req.body?.admin_key;
  if (provided !== key) return res.status(403).json({ error: 'Unauthorized' });
  next();
}

const CARD_W = 260, CARD_H = 300, GAP_X = 30, GAP_Y = 30, COLS = 6;
let gridCounter = 0;

function gridPosition() {
  const col = gridCounter % COLS;
  const row = Math.floor(gridCounter / COLS);
  gridCounter++;
  return {
    x: col * (CARD_W + GAP_X) - (COLS * (CARD_W + GAP_X)) / 2 + (Math.random() - 0.5) * 10,
    y: row * (CARD_H + GAP_Y) - 200 + (Math.random() - 0.5) * 10,
    rotation: (Math.random() - 0.5) * 2,
  };
}
const randomPosition = gridPosition;

async function ensureValidToken(user) {
  if (!user.refresh_token) return user.access_token;
  if (Date.now() < user.token_expires_at - 60000) return user.access_token;
  try {
    const tokens = await refreshAccessToken(user.refresh_token, process.env.TWITTER_CLIENT_ID, process.env.TWITTER_CLIENT_SECRET);
    const expiresAt = Date.now() + (tokens.expires_in || 7200) * 1000;
    await db.run('UPDATE users SET access_token=?, refresh_token=?, token_expires_at=? WHERE id=?',
      [tokens.access_token, tokens.refresh_token || user.refresh_token, expiresAt, user.id]);
    return tokens.access_token;
  } catch (err) {
    console.error('Token refresh failed:', err.message);
    return user.access_token;
  }
}

router.post('/sync', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const user = await db.get('SELECT * FROM users WHERE id = ?', [user_id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    const accessToken = await ensureValidToken(user);
    let nextToken = null, added = 0, pages = 0;
    do {
      const data = await getBookmarks(accessToken, user_id, nextToken);
      const tweets = data.data || [];
      const mediaMap = {}, userMap = {};
      for (const m of data.includes?.media || []) mediaMap[m.media_key] = m;
      for (const u of data.includes?.users || []) userMap[u.id] = u;

      for (const tweet of tweets) {
        const exists = await db.get('SELECT id FROM bookmarks WHERE tweet_id=? AND user_id=?', [tweet.id, user_id]);
        if (exists) continue;
        const author = userMap[tweet.author_id] || {};
        const media = (tweet.attachments?.media_keys || []).map(k => mediaMap[k]).filter(Boolean);
        const pm = media[0] || null;
        const lp = extractLinkPreview(tweet);
        const cleanText = resolveCleanText(tweet);
        const { category, emoji } = categorize({ text: cleanText, media_type: pm?.type, link_title: lp?.title, link_description: lp?.description });
        const tags = tagify({ text: cleanText, link_title: lp?.title, author_username: author.username });
        const pos = randomPosition();
        await db.run(`INSERT INTO bookmarks (
          id,user_id,tweet_id,text,author_id,author_name,author_username,author_image,
          media_url,media_type,preview_image,url,link_title,link_description,link_image,
          category,category_emoji,tags,canvas_x,canvas_y,canvas_rotation,bookmarked_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [`${user_id}_${tweet.id}`, user_id, tweet.id, cleanText,
          tweet.author_id, author.name||'Unknown', author.username||'unknown', author.profile_image_url||null,
          pm?.url||pm?.preview_image_url||null, pm?.type||null, pm?.preview_image_url||null,
          lp?.url||null, lp?.title||null, lp?.description||null, lp?.image||null,
          category, emoji, JSON.stringify(tags),
          pos.x, pos.y, pos.rotation,
          tweet.created_at ? new Date(tweet.created_at).getTime() : Date.now()]);
        added++;
      }
      nextToken = data.meta?.next_token || null;
      pages++;
    } while (nextToken && pages < 10);
    res.json({ added, message: `Synced ${added} new bookmarks` });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

router.get('/', async (req, res) => {
  const { user_id, search, category, limit = 500 } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  let query = 'SELECT * FROM bookmarks WHERE user_id = ?';
  const params = [user_id];

  if (category && category !== 'All') { query += ' AND category = ?'; params.push(category); }
  if (search) {
    query += ' AND (text LIKE ? OR author_name LIKE ? OR author_username LIKE ? OR link_title LIKE ? OR category LIKE ? OR tags LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like, like, like);
  }

  query += ' ORDER BY bookmarked_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(await db.query(query, params));
});

router.patch('/:id/position', requireAdmin, async (req, res) => {
  const { x, y, rotation } = req.body;
  await db.run('UPDATE bookmarks SET canvas_x=?,canvas_y=?,canvas_rotation=? WHERE id=?', [x, y, rotation, req.params.id]);
  res.json({ ok: true });
});

router.delete('/by-tweet/:tweet_id', requireAdmin, async (req, res) => {
  const { tweet_id } = req.params;
  const { user_id } = req.query;
  const result = user_id && user_id !== 'all'
    ? await db.run('DELETE FROM bookmarks WHERE tweet_id=? AND user_id=?', [tweet_id, user_id])
    : await db.run('DELETE FROM bookmarks WHERE tweet_id=?', [tweet_id]);
  res.json({ ok: true, deleted: result.changes });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await db.run('DELETE FROM bookmarks WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

router.patch('/:id/category', requireAdmin, async (req, res) => {
  const { category, emoji } = req.body;
  await db.run('UPDATE bookmarks SET category=?,category_emoji=? WHERE id=?', [category, emoji, req.params.id]);
  res.json({ ok: true });
});

router.post('/relayout', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const bookmarks = await db.query('SELECT id FROM bookmarks WHERE user_id=? ORDER BY bookmarked_at DESC', [user_id]);
  gridCounter = 0;
  const ops = bookmarks.map(bm => {
    const pos = gridPosition();
    return ['UPDATE bookmarks SET canvas_x=?,canvas_y=?,canvas_rotation=? WHERE id=?', [pos.x, pos.y, pos.rotation, bm.id]];
  });
  await db.transaction(ops);
  res.json({ ok: true, count: bookmarks.length });
});

router.get('/count', async (req, res) => {
  const row = await db.get('SELECT COUNT(*) as count FROM bookmarks');
  res.json({ count: parseInt(row?.count || 0) });
});

router.post('/import', async (req, res) => {
  const { tweet_id, tweet_url, author_name, author_username, author_image,
    text, media_url, preview_image, link_url, link_title, link_image, force_update } = req.body;
  if (!tweet_id) return res.status(400).json({ error: 'tweet_id required' });

  const user = await db.get('SELECT id FROM users ORDER BY created_at DESC LIMIT 1');
  if (!user) return res.status(400).json({ error: 'No user logged in.' });

  const id = `${user.id}_${tweet_id}`;
  const exists = await db.get('SELECT id, media_url, link_image FROM bookmarks WHERE id=?', [id]);

  if (exists) {
    const hasNewMedia = (media_url || link_image) && !exists.media_url && !exists.link_image;
    if (hasNewMedia || force_update) {
      await db.run(`UPDATE bookmarks SET
        media_url=COALESCE(?,media_url), preview_image=COALESCE(?,preview_image),
        link_image=COALESCE(?,link_image), link_title=COALESCE(?,link_title),
        author_image=COALESCE(?,author_image) WHERE id=?`,
        [media_url||null, preview_image||null, link_image||null, link_title||null, author_image||null, id]);
    }
    return res.json({ ok: true, duplicate: true });
  }

  const { category, emoji } = categorize({ text, link_title });
  const tags = tagify({ text, link_title, author_username });
  const pos = randomPosition();

  await db.run(`INSERT INTO bookmarks (
    id,user_id,tweet_id,text,author_name,author_username,author_image,
    media_url,preview_image,url,link_title,link_image,
    category,category_emoji,tags,canvas_x,canvas_y,canvas_rotation,bookmarked_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  [id, user.id, tweet_id, text||'',
    author_name||'', author_username||'', author_image||null,
    media_url||null, preview_image||null,
    link_url||tweet_url||null, link_title||null, link_image||null,
    category, emoji, JSON.stringify(tags),
    pos.x, pos.y, pos.rotation, Date.now()]);

  res.json({ ok: true });
});

router.get('/categories', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  res.json(await db.query(
    'SELECT category, category_emoji, COUNT(*) as count FROM bookmarks WHERE user_id=? GROUP BY category ORDER BY count DESC',
    [user_id]
  ));
});

router.get('/tags', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const rows = await db.query("SELECT tags FROM bookmarks WHERE user_id=? AND tags IS NOT NULL AND tags != '[]'", [user_id]);
  const tagCount = {};
  for (const row of rows) {
    try { for (const t of JSON.parse(row.tags)) tagCount[t] = (tagCount[t] || 0) + 1; } catch {}
  }
  res.json(Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count })));
});

router.post('/retag', async (req, res) => {
  const { user_id } = req.query;
  const rows = user_id
    ? await db.query('SELECT id, text, link_title, author_username FROM bookmarks WHERE user_id=?', [user_id])
    : await db.query('SELECT id, text, link_title, author_username FROM bookmarks');
  const ops = rows.map(row => {
    const tags = tagify({ text: row.text, link_title: row.link_title, author_username: row.author_username });
    return ['UPDATE bookmarks SET tags=? WHERE id=?', [JSON.stringify(tags), row.id]];
  });
  await db.transaction(ops);
  res.json({ ok: true, retagged: rows.length });
});

module.exports = router;
