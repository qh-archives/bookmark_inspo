const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db');

function syndicationToken(tweetId) {
  return Math.floor((Number(tweetId) / 1e15) * Math.PI).toString(6).replace(/6/g, '3');
}

async function fetchSyndicationData(tweetId) {
  const token = syndicationToken(tweetId);
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en&token=${token}`;
  const res = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://platform.twitter.com/' },
    timeout: 6000,
  });
  return res.data;
}

async function fetchOgImage(url) {
  if (!url || url.includes('twitter.com') || url.includes('x.com')) return null;
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      timeout: 5000, maxRedirects: 3,
    });
    const html = res.data;
    const match =
      html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    return match?.[1] || null;
  } catch { return null; }
}

function pickVideo(data) {
  if (!data.video) return {};
  const [w, h] = data.video.aspectRatio || [];
  const mp4s = (data.video.variants || [])
    .filter(v => v.type === 'video/mp4')
    .sort((a, b) => parseInt(a.src.match(/\/(\d+)x/)?.[1]||0) - parseInt(b.src.match(/\/(\d+)x/)?.[1]||0));
  return {
    mediaUrl: data.video.poster || null,
    videoUrl: (mp4s.length > 1 ? mp4s[1] : mp4s[0])?.src || null,
    mediaWidth: w || null,
    mediaHeight: h || null,
  };
}

router.post('/fetch-media-single', async (req, res) => {
  const { tweet_id } = req.body;
  if (!tweet_id) return res.status(400).json({ error: 'tweet_id required' });

  const bm = await db.get('SELECT id, url, author_username FROM bookmarks WHERE tweet_id=? LIMIT 1', [tweet_id]);
  if (!bm) return res.json({ ok: false });

  try {
    const data = await fetchSyndicationData(tweet_id);
    let { mediaUrl, videoUrl, mediaWidth, mediaHeight } = pickVideo(data);

    const photos = data.photos || data.mediaDetails || [];
    if (!mediaUrl && photos[0]) {
      mediaUrl = photos[0].media_url_https || null;
      if (photos[0].width) { mediaWidth = photos[0].width; mediaHeight = photos[0].height; }
    }

    const authorImage = data.user?.profile_image_url_https?.replace('_normal', '_bigger') || null;
    const linkUrl = bm.url && !bm.url.includes('twitter.com') && !bm.url.includes('x.com') ? bm.url : null;
    const linkImage = linkUrl ? await fetchOgImage(linkUrl) : null;
    if (!mediaUrl && linkImage) mediaUrl = linkImage;

    await db.run(`UPDATE bookmarks SET
      media_url=COALESCE(?,media_url), video_url=COALESCE(?,video_url),
      link_image=COALESCE(?,link_image), author_image=COALESCE(?,author_image),
      media_width=COALESCE(?,media_width), media_height=COALESCE(?,media_height)
      WHERE id=?`,
      [mediaUrl, videoUrl, linkImage, authorImage, mediaWidth, mediaHeight, bm.id]);

    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.post('/fetch-media', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  const bookmarks = await db.query('SELECT id, tweet_id, url FROM bookmarks WHERE user_id=?', [user_id]);
  res.json({ started: true, total: bookmarks.length });

  let updated = 0;
  for (const bm of bookmarks) {
    try {
      const data = await fetchSyndicationData(bm.tweet_id);
      let { mediaUrl, videoUrl, mediaWidth, mediaHeight } = pickVideo(data);

      const photos = data.photos || data.mediaDetails || [];
      if (!mediaUrl && photos[0]) {
        mediaUrl = photos[0].media_url_https || null;
        if (photos[0].width) { mediaWidth = photos[0].width; mediaHeight = photos[0].height; }
      }

      const authorImage = data.user?.profile_image_url_https?.replace('_normal', '_bigger') || null;
      const linkUrl = bm.url && !bm.url.includes('twitter.com') && !bm.url.includes('x.com') ? bm.url : null;
      const linkImage = linkUrl ? await fetchOgImage(linkUrl) : null;
      if (!mediaUrl && linkImage) mediaUrl = linkImage;

      if (mediaUrl || videoUrl || linkImage || authorImage) {
        await db.run(`UPDATE bookmarks SET
          media_url=COALESCE(?,media_url), video_url=COALESCE(?,video_url),
          link_image=COALESCE(?,link_image), author_image=COALESCE(?,author_image),
          media_width=COALESCE(?,media_width), media_height=COALESCE(?,media_height)
          WHERE id=?`,
          [mediaUrl, videoUrl, linkImage, authorImage, mediaWidth, mediaHeight, bm.id]);
        updated++;
      }
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.error(`[fetch-media] ${bm.tweet_id}:`, e.message);
    }
  }
  console.log(`[fetch-media] ${updated}/${bookmarks.length} updated`);
});

module.exports = router;
