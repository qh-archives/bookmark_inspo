const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

// Token algorithm used by Twitter's own embed widget (no auth needed)
function syndicationToken(tweetId) {
  return Math.floor((Number(tweetId) / 1e15) * Math.PI)
    .toString(6)
    .replace(/6/g, '3');
}

async function fetchSyndicationData(tweetId) {
  const token = syndicationToken(tweetId);
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`;
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://platform.twitter.com/',
    },
    timeout: 6000,
  });
  return res.data;
}

async function fetchOgImage(url) {
  if (!url || url.includes('twitter.com') || url.includes('x.com')) return null;
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      timeout: 5000,
      maxRedirects: 3,
    });
    const html = res.data;
    const match =
      html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

router.post('/fetch-media-single', async (req, res) => {
  const { tweet_id } = req.body;
  if (!tweet_id) return res.status(400).json({ error: 'tweet_id required' });

  const bm = db.prepare('SELECT id, url, author_username FROM bookmarks WHERE tweet_id = ? LIMIT 1').get(tweet_id);
  if (!bm) return res.json({ ok: false });

  try {
    const data = await fetchSyndicationData(tweet_id);
    let mediaUrl = null, videoUrl = null, mediaWidth = null, mediaHeight = null, authorImage = null;

    if (data.video) {
      mediaUrl = data.video.poster || null;
      const [w, h] = data.video.aspectRatio || [];
      if (w && h) { mediaWidth = w; mediaHeight = h; }
      const mp4s = (data.video.variants || []).filter(v => v.type === 'video/mp4')
        .sort((a, b) => parseInt(a.src.match(/\/(\d+)x/)?.[1]||0) - parseInt(b.src.match(/\/(\d+)x/)?.[1]||0));
      videoUrl = (mp4s.length > 1 ? mp4s[1] : mp4s[0])?.src || null;
    }
    const photos = data.photos || [];
    if (!mediaUrl && photos[0]) {
      mediaUrl = photos[0].media_url_https || null;
      if (photos[0].width) { mediaWidth = photos[0].width; mediaHeight = photos[0].height; }
    }
    if (data.user?.profile_image_url_https)
      authorImage = data.user.profile_image_url_https.replace('_normal', '_bigger');

    let linkImage = null;
    const linkUrl = bm.url && !bm.url.includes('twitter.com') && !bm.url.includes('x.com') ? bm.url : null;
    if (linkUrl) { linkImage = await fetchOgImage(linkUrl); if (!mediaUrl) mediaUrl = linkImage; }

    db.prepare(`UPDATE bookmarks SET media_url=COALESCE(?,media_url), video_url=COALESCE(?,video_url),
      link_image=COALESCE(?,link_image), author_image=COALESCE(?,author_image),
      media_width=COALESCE(?,media_width), media_height=COALESCE(?,media_height) WHERE id=?`)
      .run(mediaUrl, videoUrl, linkImage, authorImage, mediaWidth, mediaHeight, bm.id);

    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/fetch-media', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const bookmarks = db.prepare(`
    SELECT id, tweet_id, url, author_username
    FROM bookmarks WHERE user_id = ?
  `).all(user_id);

  res.json({ started: true, total: bookmarks.length, message: `Fetching media for ${bookmarks.length} bookmarks…` });

  let updated = 0;
  for (const bm of bookmarks) {
    try {
      let mediaUrl = null;
      let linkImage = null;
      let authorImage = null;

      // Try Twitter syndication API (the real Twitter embed API — free, no auth)
      const data = await fetchSyndicationData(bm.tweet_id);

      let videoUrl = null;
      let mediaWidth = null, mediaHeight = null;

      if (data.video) {
        mediaUrl = data.video.poster || null;
        const [w, h] = data.video.aspectRatio || [];
        if (w && h) { mediaWidth = w; mediaHeight = h; }
        // Pick medium quality mp4 for fast loading
        const mp4s = (data.video.variants || [])
          .filter(v => v.type === 'video/mp4')
          .sort((a, b) => {
            const res = s => parseInt(s.src.match(/\/(\d+)x\d+\//)?.[1] || '0');
            return res(a) - res(b); // ascending — pick smaller/medium
          });
        // Pick second from bottom if available (not lowest, not highest)
        const pick = mp4s.length > 1 ? mp4s[1] : mp4s[0];
        videoUrl = pick?.src || null;
      }

      const photos = data.photos || data.mediaDetails || [];
      if (!mediaUrl && photos.length > 0) {
        const p = photos[0];
        mediaUrl = p.media_url_https || p.url || null;
        if (p.width) mediaWidth = p.width;
        if (p.height) mediaHeight = p.height;
      }

      if (data.user?.profile_image_url_https) {
        authorImage = data.user.profile_image_url_https.replace('_normal', '_bigger');
      }

      const linkUrl = bm.url && !bm.url.includes('twitter.com') && !bm.url.includes('x.com') ? bm.url : null;
      if (linkUrl) {
        linkImage = await fetchOgImage(linkUrl);
        if (!mediaUrl) mediaUrl = linkImage;
      }

      if (mediaUrl || linkImage || authorImage || videoUrl) {
        db.prepare(`
          UPDATE bookmarks SET
            media_url = COALESCE(?, media_url),
            video_url = COALESCE(?, video_url),
            link_image = COALESCE(?, link_image),
            author_image = COALESCE(?, author_image),
            media_width = COALESCE(?, media_width),
            media_height = COALESCE(?, media_height)
          WHERE id = ?
        `).run(mediaUrl, videoUrl, linkImage, authorImage, mediaWidth, mediaHeight, bm.id);
        updated++;
        console.log(`[fetch-media] ✓ ${bm.tweet_id} | ${mediaWidth}x${mediaHeight} | vid:${!!videoUrl}`);
      }

      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.error(`[fetch-media] ✗ ${bm.tweet_id}:`, e.response?.status || e.message);
    }
  }

  console.log(`[fetch-media] Done — ${updated}/${bookmarks.length} updated`);
});

module.exports = router;
