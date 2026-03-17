const axios = require('axios');
const crypto = require('crypto');

const TWITTER_API_BASE = 'https://api.twitter.com/2';

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function getAuthUrl(clientId, redirectUri, codeChallenge, state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'bookmark.read tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code, codeVerifier, clientId, clientSecret, redirectUri) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(
    'https://api.twitter.com/2/oauth2/token',
    new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
    }
  );
  return response.data;
}

async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await axios.post(
    'https://api.twitter.com/2/oauth2/token',
    new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
    }
  );
  return response.data;
}

async function getMe(accessToken) {
  const response = await axios.get(`${TWITTER_API_BASE}/users/me`, {
    params: {
      'user.fields': 'id,name,username,profile_image_url',
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data.data;
}

async function getBookmarks(accessToken, userId, paginationToken = null) {
  const params = {
    max_results: 100,
    'tweet.fields': 'id,text,created_at,attachments,entities,author_id',
    expansions: 'attachments.media_keys,author_id',
    'media.fields': 'url,preview_image_url,type,width,height',
    'user.fields': 'id,name,username,profile_image_url',
  };
  if (paginationToken) params.pagination_token = paginationToken;

  const response = await axios.get(`${TWITTER_API_BASE}/users/${userId}/bookmarks`, {
    params,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

function extractLinkPreview(tweet) {
  const entities = tweet.entities || {};
  const urls = entities.urls || [];
  for (const url of urls) {
    if (url.images && url.images.length > 0) {
      return {
        url: url.expanded_url || url.url,
        title: url.title || null,
        description: url.description || null,
        image: url.images[0]?.url || null,
      };
    }
    if (url.expanded_url && !url.expanded_url.includes('twitter.com') && !url.expanded_url.includes('t.co')) {
      return {
        url: url.expanded_url || url.url,
        title: url.title || null,
        description: url.description || null,
        image: null,
      };
    }
  }
  return null;
}

function resolveCleanText(tweet) {
  let text = tweet.text || '';
  const urls = (tweet.entities?.urls || []);
  for (const url of urls) {
    text = text.replace(url.url, url.display_url || '');
  }
  return text.trim();
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  getAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getMe,
  getBookmarks,
  extractLinkPreview,
  resolveCleanText,
};
