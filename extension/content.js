const SERVER = 'http://127.0.0.1:3001';
const sent = new Set();

function extractTweet(article) {
  try {
    const timeLink = article.querySelector('a[href*="/status/"]');
    if (!timeLink) return null;
    const tweetId = timeLink.getAttribute('href').match(/\/status\/(\d+)/)?.[1];
    if (!tweetId) return null;

    const userNameEl = article.querySelector('[data-testid="User-Name"]');
    const links = userNameEl ? [...userNameEl.querySelectorAll('a')] : [];
    const authorName = links[0]?.innerText?.trim() || '';
    const authorUsername = (links[1]?.innerText?.trim() || links[0]?.innerText?.trim() || '').replace('@', '');
    const authorImage = article.querySelector('img[src*="profile_images"]')?.src || null;
    const text = article.querySelector('[data-testid="tweetText"]')?.innerText?.trim() || '';
    const tweetUrl = `https://x.com/${authorUsername}/status/${tweetId}`;

    return { tweetId, tweetUrl, authorName, authorUsername, authorImage, text };
  } catch { return null; }
}

async function sendTweet(data) {
  if (sent.has(data.tweetId)) return;
  sent.add(data.tweetId);
  try {
    const res = await fetch(`${SERVER}/bookmarks/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tweet_id: data.tweetId,
        tweet_url: data.tweetUrl,
        author_name: data.authorName,
        author_username: data.authorUsername,
        author_image: data.authorImage,
        text: data.text,
      }),
    });
    const json = await res.json();
    if (json.ok && !json.duplicate) {
      console.log(`[Bookmarks Canvas] + ${data.authorUsername}: ${data.text?.slice(0, 50)}`);
      showToast('Saved to canvas');
      // Auto-fetch media for this tweet via syndication API
      fetch(`${SERVER}/bookmarks/fetch-media-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_id: data.tweetId }),
      }).catch(() => {});
    }
  } catch (e) {
    sent.delete(data.tweetId);
    console.warn('[Bookmarks Canvas] Server unreachable:', e.message);
  }
}

// Detect unbookmark — delete from canvas
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-testid="bookmark"]');
  if (!btn) return;
  const article = btn.closest('article[data-testid="tweet"]');
  if (!article) return;
  const labelBefore = btn.getAttribute('aria-label') || '';
  const wasBookmarked = labelBefore.toLowerCase().includes('remove');
  if (wasBookmarked) {
    const timeLink = article.querySelector('a[href*="/status/"]');
    const tweetId = timeLink?.getAttribute('href')?.match(/\/status\/(\d+)/)?.[1];
    if (tweetId) setTimeout(() => deleteFromServer(tweetId), 800);
  } else {
    // Being bookmarked — capture after a short delay
    setTimeout(() => {
      const data = extractTweet(article);
      if (data) sendTweet(data);
    }, 1000);
  }
}, true);

async function deleteFromServer(tweetId) {
  try {
    const res = await fetch(`${SERVER}/bookmarks/by-tweet/${tweetId}?user_id=all`, { method: 'DELETE' });
    const json = await res.json();
    if (json.deleted > 0) showToast('Removed from canvas');
  } catch {}
}

// Scan all visible tweet articles (for bookmarks page)
const seen = new WeakSet();
function scanArticles() {
  if (!window.location.pathname.includes('/bookmarks')) return;
  document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
    if (seen.has(article)) return;
    seen.add(article);
    const data = extractTweet(article);
    if (data) sendTweet(data);
  });
}

// Watch for new tweets loaded as you scroll
new MutationObserver(scanArticles).observe(document.body, { childList: true, subtree: true });
scanArticles();

function showToast(msg) {
  const old = document.getElementById('bmc-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'bmc-toast';
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', bottom: '80px', right: '20px',
    background: '#000', color: '#fff', border: '1px solid #333',
    padding: '10px 18px', borderRadius: '20px',
    fontSize: '13px', fontWeight: '500', zIndex: '999999',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2000);
}

console.log('[Bookmarks Canvas] Active on', window.location.pathname);
