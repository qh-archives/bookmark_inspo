require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🔖 Twitter Bookmarks server running at http://localhost:${PORT}`);
  console.log(`   Configure Twitter API credentials in server/.env\n`);
});
