require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all origins (extension, localhost, etc.)
  credentials: true,
}));
app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/bookmarks', require('./routes/fetchmedia'));

// Video proxy — streams Twitter videos through localhost to avoid any CORS/hotlink issues
app.get('/proxy/video', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('twimg.com')) return res.status(400).send('Invalid URL');
  try {
    const axios = require('axios');
    const range = req.headers.range;
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'https://x.com/',
    };
    if (range) headers['Range'] = range;
    const upstream = await axios.get(url, {
      responseType: 'stream',
      headers,
      timeout: 30000,
    });
    res.set('Content-Type', upstream.headers['content-type'] || 'video/mp4');
    res.set('Accept-Ranges', 'bytes');
    if (upstream.headers['content-length']) res.set('Content-Length', upstream.headers['content-length']);
    if (upstream.headers['content-range']) res.set('Content-Range', upstream.headers['content-range']);
    res.status(upstream.status);
    upstream.data.pipe(res);
  } catch (e) {
    res.status(500).send('Proxy error: ' + e.message);
  }
});

// Image proxy
app.get('/proxy/image', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('twimg.com')) return res.status(400).send('Invalid URL');
  try {
    const axios = require('axios');
    const upstream = await axios.get(url, {
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://x.com/' },
      timeout: 10000,
    });
    res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    upstream.data.pipe(res);
  } catch (e) {
    res.status(500).send('Proxy error');
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// One-time seed endpoint — inserts user + bookmarks from seed.json
app.post('/admin/seed', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const db = require('./db');
  const seedPath = path.join(__dirname, 'seed.json');
  if (!fs.existsSync(seedPath)) return res.status(404).json({ error: 'No seed.json found' });
  try {
    const { users = [], bookmarks = [] } = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, username, name, profile_image_url) VALUES (@id, @username, @name, @profile_image_url)`);
    const insertBm = db.prepare(`INSERT OR IGNORE INTO bookmarks (
      id, user_id, tweet_id, text, author_name, author_username, author_image,
      media_url, media_type, preview_image, video_url, media_width, media_height,
      url, link_title, link_description, link_image, category, category_emoji,
      tags, canvas_x, canvas_y, canvas_rotation, bookmarked_at, created_at
    ) VALUES (
      @id, @user_id, @tweet_id, @text, @author_name, @author_username, @author_image,
      @media_url, @media_type, @preview_image, @video_url, @media_width, @media_height,
      @url, @link_title, @link_description, @link_image, @category, @category_emoji,
      @tags, @canvas_x, @canvas_y, @canvas_rotation, @bookmarked_at, @created_at
    )`);
    db.transaction(() => {
      users.forEach(u => insertUser.run(u));
      bookmarks.forEach(b => insertBm.run(b));
    })();
    res.json({ ok: true, users: users.length, bookmarks: bookmarks.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve React frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n Twitter Bookmarks running at http://localhost:${PORT}`);
});
