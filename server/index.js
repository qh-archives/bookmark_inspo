require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
app.use(express.json());

app.use('/auth', require('./routes/auth'));
app.use('/bookmarks', require('./routes/bookmarks'));
app.use('/bookmarks', require('./routes/fetchmedia'));

// Video proxy
app.get('/proxy/video', async (req, res) => {
  const url = req.query.url;
  if (!url || !url.includes('twimg.com')) return res.status(400).send('Invalid URL');
  try {
    const axios = require('axios');
    const headers = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://x.com/' };
    if (req.headers.range) headers['Range'] = req.headers.range;
    const upstream = await axios.get(url, { responseType: 'stream', headers, timeout: 30000 });
    res.set('Content-Type', upstream.headers['content-type'] || 'video/mp4');
    res.set('Accept-Ranges', 'bytes');
    if (upstream.headers['content-length']) res.set('Content-Length', upstream.headers['content-length']);
    if (upstream.headers['content-range']) res.set('Content-Range', upstream.headers['content-range']);
    res.status(upstream.status);
    upstream.data.pipe(res);
  } catch (e) { res.status(500).send('Proxy error: ' + e.message); }
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
  } catch { res.status(500).send('Proxy error'); }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// One-time seed endpoint — inserts user + bookmarks from seed.json
app.post('/admin/seed', async (req, res) => {
  const seedPath = path.join(__dirname, 'seed.json');
  if (!fs.existsSync(seedPath)) return res.status(404).json({ error: 'No seed.json found' });
  try {
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const result = await db.seedFromJson(data);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve React frontend
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3001;

// Init DB then start server
db.init().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
