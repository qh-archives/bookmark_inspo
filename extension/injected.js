(function () {
  'use strict';
  const _fetch = window.fetch.bind(window);

  function parseTweet(obj) {
    try {
      const legacy = obj.legacy;
      if (!legacy) return null;
      const tweetId = legacy.id_str || obj.rest_id;
      if (!tweetId) return null;

      const userLegacy = obj.core?.user_results?.result?.legacy || {};
      const authorName = userLegacy.name || '';
      const authorUsername = userLegacy.screen_name || '';
      const authorImage = (userLegacy.profile_image_url_https || '').replace('_normal', '_bigger');
      const text = legacy.full_text || legacy.text || '';

      let mediaUrl = null, previewImage = null;
      const mediaItems = legacy.extended_entities?.media || legacy.entities?.media || [];
      for (const m of mediaItems) {
        if (m.type === 'photo') {
          mediaUrl = mediaUrl || (m.media_url_https + '?name=large');
        } else if (m.type === 'video' || m.type === 'animated_gif') {
          previewImage = previewImage || (m.media_url_https + '?name=large');
          if (!mediaUrl) mediaUrl = previewImage;
        }
      }

      let linkUrl = null, linkTitle = null, linkImage = null;
      const cardBindings = obj.card?.legacy?.binding_values;
      if (cardBindings) {
        const b = Array.isArray(cardBindings)
          ? Object.fromEntries(cardBindings.map(x => [x.key, x.value]))
          : cardBindings;
        linkTitle = b.title?.string_value || b.description?.string_value || null;
        linkUrl = b.card_url?.string_value || null;
        const thumb = b.thumbnail_image_original?.image_value?.url
          || b.thumbnail_image?.image_value?.url
          || b.player_image_original?.image_value?.url
          || b.photo_image_full_size_original?.image_value?.url
          || b.summary_photo_image_original?.image_value?.url
          || null;
        if (thumb) {
          linkImage = thumb;
          if (!mediaUrl) mediaUrl = thumb;
        }
      }

      if (!linkUrl) {
        const urls = legacy.entities?.urls || [];
        const u = urls.find(x => x.expanded_url && !x.expanded_url.includes('twitter.com') && !x.expanded_url.includes('x.com'));
        if (u) linkUrl = u.expanded_url;
      }

      return {
        tweetId,
        tweetUrl: `https://x.com/${authorUsername}/status/${tweetId}`,
        authorName,
        authorUsername,
        authorImage,
        text,
        mediaUrl,
        previewImage,
        linkUrl,
        linkTitle,
        linkImage,
      };
    } catch {
      return null;
    }
  }

  function extractAll(data, results = []) {
    if (!data || typeof data !== 'object') return results;
    if (data.tweet_results?.result) {
      const t = parseTweet(data.tweet_results.result);
      if (t) results.push(t);
    }
    for (const v of Object.values(data)) {
      if (v && typeof v === 'object') extractAll(v, results);
    }
    return results;
  }

  window.fetch = async function (...args) {
    const response = await _fetch(...args);
    const url = (typeof args[0] === 'string' ? args[0] : args[0]?.url) || '';

    const isRelevant =
      url.includes('Bookmarks') ||
      url.includes('bookmark') ||
      url.includes('HomeTimeline') ||
      url.includes('TweetDetail') ||
      url.includes('UserTweets');

    if (isRelevant) {
      try {
        const clone = response.clone();
        clone.json().then(data => {
          const tweets = extractAll(data);
          if (tweets.length > 0) {
            window.postMessage({ type: 'BMC_TWEETS', tweets }, '*');
            console.log('[Bookmarks Canvas injected] Found', tweets.length, 'tweets, media:', tweets.filter(t => t.mediaUrl).length);
          }
        }).catch(() => {});
      } catch {}
    }

    return response;
  };

  console.log('[Bookmarks Canvas] Fetch interceptor installed ✓');
})();
