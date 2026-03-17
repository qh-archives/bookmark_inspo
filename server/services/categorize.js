const CATEGORIES = [
  {
    name: 'Design',
    emoji: '🎨',
    keywords: ['design', 'ui', 'ux', 'figma', 'typography', 'color', 'font', 'wireframe', 'prototype', 'css', 'layout', 'visual', 'aesthetic', 'branding', 'logo', 'icon', 'illustration', 'graphic', 'dribbble', 'behance', 'interface', 'motion', 'animation', 'gradient', 'palette'],
  },
  {
    name: 'Tech',
    emoji: '💻',
    keywords: ['programming', 'code', 'developer', 'software', 'javascript', 'python', 'react', 'node', 'api', 'github', 'open source', 'startup', 'saas', 'ai', 'machine learning', 'gpt', 'llm', 'database', 'backend', 'frontend', 'devops', 'cloud', 'docker', 'kubernetes', 'framework', 'library', 'typescript', 'rust', 'go'],
  },
  {
    name: 'Music',
    emoji: '🎵',
    keywords: ['music', 'song', 'album', 'artist', 'playlist', 'spotify', 'soundcloud', 'beat', 'track', 'melody', 'lyrics', 'concert', 'festival', 'rap', 'hip hop', 'indie', 'jazz', 'classical', 'pop', 'electronic', 'producer', 'dj', 'vinyl', 'podcast', 'audio'],
  },
  {
    name: 'Writing',
    emoji: '📝',
    keywords: ['writing', 'journal', 'journaling', 'essay', 'blog', 'book', 'novel', 'poem', 'poetry', 'author', 'read', 'reading', 'literature', 'story', 'narrative', 'write', 'words', 'prose', 'memoir', 'publish', 'writer', 'substack', 'newsletter'],
  },
  {
    name: 'Food',
    emoji: '🍕',
    keywords: ['food', 'recipe', 'cooking', 'restaurant', 'eat', 'meal', 'chef', 'kitchen', 'bake', 'baking', 'dinner', 'lunch', 'breakfast', 'coffee', 'cafe', 'wine', 'cocktail', 'drink', 'foodie', 'cuisine', 'ingredient', 'flavor', 'taste', 'delicious'],
  },
  {
    name: 'Travel',
    emoji: '✈️',
    keywords: ['travel', 'trip', 'destination', 'city', 'country', 'hotel', 'flight', 'explore', 'adventure', 'journey', 'vacation', 'holiday', 'tourist', 'wanderlust', 'backpack', 'road trip', 'photography', 'landscape', 'nature', 'sunset', 'beach', 'mountain'],
  },
  {
    name: 'Fitness',
    emoji: '💪',
    keywords: ['fitness', 'workout', 'gym', 'exercise', 'health', 'wellness', 'yoga', 'running', 'training', 'muscle', 'nutrition', 'diet', 'meditation', 'mindfulness', 'mental health', 'sleep', 'weight', 'strength', 'cardio', 'athlete', 'sport'],
  },
  {
    name: 'Inspiration',
    emoji: '✨',
    keywords: ['inspire', 'inspiration', 'motivate', 'motivation', 'mindset', 'quote', 'success', 'goal', 'dream', 'growth', 'positive', 'gratitude', 'life', 'wisdom', 'lesson', 'advice', 'tip', 'hack', 'productivity', 'habit', 'routine', 'discipline', 'focus'],
  },
  {
    name: 'Art',
    emoji: '🖼️',
    keywords: ['art', 'artwork', 'painting', 'drawing', 'sketch', 'portrait', 'gallery', 'museum', 'artist', 'creative', 'canvas', 'sculpture', 'photography', 'photo', 'picture', 'digital art', '3d', 'render', 'generative', 'nft', 'exhibition'],
  },
  {
    name: 'Business',
    emoji: '💼',
    keywords: ['business', 'entrepreneur', 'startup', 'founder', 'ceo', 'marketing', 'growth', 'revenue', 'sales', 'customer', 'product', 'market', 'strategy', 'investment', 'venture', 'funding', 'vc', 'pitch', 'brand', 'monetize', 'profit', 'scale'],
  },
  {
    name: 'Learning',
    emoji: '📚',
    keywords: ['learn', 'learning', 'education', 'course', 'tutorial', 'skill', 'knowledge', 'study', 'student', 'university', 'class', 'teach', 'resource', 'guide', 'howto', 'explain', 'understand', 'concept', 'theory', 'science', 'research'],
  },
  {
    name: 'Entertainment',
    emoji: '🎬',
    keywords: ['movie', 'film', 'show', 'series', 'netflix', 'game', 'gaming', 'anime', 'manga', 'comic', 'meme', 'funny', 'humor', 'laugh', 'comedy', 'tv', 'stream', 'watch', 'episode', 'season', 'character', 'plot'],
  },
];

function categorize(tweet) {
  const text = (tweet.text || '').toLowerCase();
  const linkTitle = (tweet.link_title || '').toLowerCase();
  const linkDesc = (tweet.link_description || '').toLowerCase();
  const combined = `${text} ${linkTitle} ${linkDesc}`;

  let bestMatch = null;
  let bestScore = 0;

  for (const cat of CATEGORIES) {
    let score = 0;
    for (const keyword of cat.keywords) {
      if (combined.includes(keyword)) {
        score += keyword.length > 5 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  if (bestMatch && bestScore >= 2) {
    return { category: bestMatch.name, emoji: bestMatch.emoji };
  }

  if (tweet.media_type === 'photo') {
    return { category: 'Art', emoji: '🖼️' };
  }
  if (tweet.media_type === 'video' || tweet.media_type === 'animated_gif') {
    return { category: 'Entertainment', emoji: '🎬' };
  }

  return { category: 'Inspiration', emoji: '✨' };
}

module.exports = { categorize, CATEGORIES };
