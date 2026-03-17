const CATEGORIES = [
  { name: 'Design',        emoji: '🎨', keywords: ['design', 'ui', 'ux', 'figma', 'typography', 'color', 'font', 'wireframe', 'prototype', 'css', 'layout', 'visual', 'aesthetic', 'branding', 'logo', 'icon', 'illustration', 'graphic', 'dribbble', 'behance', 'interface', 'motion', 'animation', 'gradient', 'palette'] },
  { name: 'Tech',          emoji: '💻', keywords: ['programming', 'code', 'developer', 'software', 'javascript', 'python', 'react', 'node', 'api', 'github', 'open source', 'startup', 'saas', 'ai', 'machine learning', 'gpt', 'llm', 'database', 'backend', 'frontend', 'devops', 'cloud', 'docker', 'typescript', 'rust'] },
  { name: 'Music',         emoji: '🎵', keywords: ['music', 'song', 'album', 'artist', 'playlist', 'spotify', 'soundcloud', 'beat', 'track', 'melody', 'lyrics', 'concert', 'festival', 'rap', 'hip hop', 'indie', 'jazz', 'classical', 'pop', 'electronic', 'producer', 'dj', 'vinyl'] },
  { name: 'Writing',       emoji: '📝', keywords: ['writing', 'journal', 'journaling', 'essay', 'blog', 'book', 'novel', 'poem', 'poetry', 'author', 'read', 'reading', 'literature', 'story', 'narrative', 'write', 'words', 'prose', 'memoir', 'publish', 'writer', 'substack', 'newsletter'] },
  { name: 'Food',          emoji: '🍕', keywords: ['food', 'recipe', 'cooking', 'restaurant', 'eat', 'meal', 'chef', 'kitchen', 'bake', 'baking', 'dinner', 'lunch', 'breakfast', 'coffee', 'cafe', 'wine', 'cocktail', 'drink', 'foodie', 'cuisine'] },
  { name: 'Travel',        emoji: '✈️', keywords: ['travel', 'trip', 'destination', 'city', 'country', 'hotel', 'flight', 'explore', 'adventure', 'journey', 'vacation', 'holiday', 'tourist', 'wanderlust', 'backpack', 'road trip', 'landscape', 'nature', 'sunset', 'beach', 'mountain'] },
  { name: 'Fitness',       emoji: '💪', keywords: ['fitness', 'workout', 'gym', 'exercise', 'health', 'wellness', 'yoga', 'running', 'training', 'muscle', 'nutrition', 'diet', 'meditation', 'mindfulness', 'mental health', 'sleep', 'strength', 'cardio', 'athlete', 'sport'] },
  { name: 'Inspiration',   emoji: '✨', keywords: ['inspire', 'inspiration', 'motivate', 'motivation', 'mindset', 'quote', 'success', 'goal', 'dream', 'growth', 'positive', 'gratitude', 'wisdom', 'lesson', 'advice', 'productivity', 'habit', 'routine', 'discipline', 'focus'] },
  { name: 'Art',           emoji: '🖼️', keywords: ['art', 'artwork', 'painting', 'drawing', 'sketch', 'portrait', 'gallery', 'museum', 'artist', 'creative', 'canvas', 'sculpture', 'photography', 'photo', 'picture', 'digital art', '3d', 'render', 'generative', 'exhibition'] },
  { name: 'Business',      emoji: '💼', keywords: ['business', 'entrepreneur', 'startup', 'founder', 'ceo', 'marketing', 'growth', 'revenue', 'sales', 'customer', 'product', 'market', 'strategy', 'investment', 'venture', 'funding', 'vc', 'pitch', 'brand', 'monetize'] },
  { name: 'Learning',      emoji: '📚', keywords: ['learn', 'learning', 'education', 'course', 'tutorial', 'skill', 'knowledge', 'study', 'student', 'university', 'class', 'teach', 'resource', 'guide', 'howto', 'explain', 'understand', 'concept', 'theory', 'science', 'research'] },
  { name: 'Entertainment', emoji: '🎬', keywords: ['movie', 'film', 'show', 'series', 'netflix', 'game', 'gaming', 'anime', 'manga', 'comic', 'meme', 'funny', 'humor', 'laugh', 'comedy', 'tv', 'stream', 'watch', 'episode', 'season', 'character'] },
];

// Specific design/interaction/platform tags
const TAGS = [
  // Interactions & animations
  { tag: 'scroll',         keywords: ['scroll', 'scrolling', 'scroll-driven', 'parallax', 'infinite scroll', 'scroll animation', 'locomotive'] },
  { tag: 'hover',          keywords: ['hover', 'hover effect', 'on hover', 'mouseover', 'mouse enter'] },
  { tag: 'drag',           keywords: ['drag', 'draggable', 'drag and drop', 'dnd', 'sortable'] },
  { tag: 'cursor',         keywords: ['cursor', 'custom cursor', 'mouse cursor', 'pointer'] },
  { tag: 'click',          keywords: ['click', 'on click', 'tap', 'press', 'ripple'] },
  { tag: 'swipe',          keywords: ['swipe', 'swipeable', 'gesture', 'touch gesture'] },
  { tag: 'transition',     keywords: ['transition', 'page transition', 'route transition', 'view transition'] },
  { tag: 'microinteraction', keywords: ['microinteraction', 'micro animation', 'micro-interaction', 'feedback animation', 'state change'] },

  // Visual styles
  { tag: '3D',             keywords: ['3d', 'three.js', 'threejs', 'webgl', 'spline', 'blender', 'r3f', 'react three fiber', 'three', 'glsl', 'shader', 'depth', 'perspective'] },
  { tag: 'glassmorphism',  keywords: ['glass', 'glassmorphism', 'frosted', 'blur', 'backdrop blur', 'backdrop-filter'] },
  { tag: 'gradient',       keywords: ['gradient', 'linear-gradient', 'radial-gradient', 'conic', 'color stop', 'mesh gradient'] },
  { tag: 'particle',       keywords: ['particle', 'particles', 'confetti', 'dots', 'sparkle', 'snow', 'bubble'] },
  { tag: 'dark mode',      keywords: ['dark mode', 'dark theme', 'dark ui', 'night mode', 'dark design'] },
  { tag: 'minimal',        keywords: ['minimal', 'minimalist', 'clean design', 'white space', 'simple ui', 'flat design'] },
  { tag: 'brutalist',      keywords: ['brutalist', 'brutalism', 'brutalist design', 'raw', 'bold typography'] },
  { tag: 'retro',          keywords: ['retro', 'vintage', 'y2k', 'nostalgia', '90s', '80s', 'old school', 'pixel art', 'pixelated'] },
  { tag: 'fluid',          keywords: ['fluid', 'liquid', 'blob', 'morph', 'organic shape', 'wave', 'noise', 'simplex'] },
  { tag: 'generative',     keywords: ['generative', 'procedural', 'algorithmic', 'p5.js', 'p5js', 'canvas api', 'creative coding'] },
  { tag: 'neon',           keywords: ['neon', 'glow', 'glowing', 'luminous', 'bright color', 'vibrant'] },
  { tag: 'typography',     keywords: ['typography', 'type', 'font', 'typeface', 'lettering', 'heading', 'variable font', 'kinetic type', 'text animation'] },

  // UI Patterns
  { tag: 'map',            keywords: ['map', 'mapbox', 'google maps', 'leaflet', 'geolocation', 'location', 'mapping', 'geo'] },
  { tag: 'carousel',       keywords: ['carousel', 'slider', 'slideshow', 'swiper', 'embla', 'splide'] },
  { tag: 'modal',          keywords: ['modal', 'dialog', 'popup', 'overlay', 'lightbox'] },
  { tag: 'navbar',         keywords: ['navbar', 'navigation', 'nav bar', 'header', 'menu bar', 'sticky nav', 'floating nav'] },
  { tag: 'sidebar',        keywords: ['sidebar', 'side panel', 'drawer', 'side nav', 'off canvas'] },
  { tag: 'dashboard',      keywords: ['dashboard', 'admin panel', 'analytics', 'data viz', 'metrics', 'kpi', 'chart', 'graph'] },
  { tag: 'form',           keywords: ['form', 'input', 'text field', 'checkbox', 'radio', 'select', 'dropdown', 'form design', 'sign up', 'login form'] },
  { tag: 'card',           keywords: ['card', 'card ui', 'card design', 'tile', 'product card', 'user card'] },
  { tag: 'table',          keywords: ['table', 'data table', 'grid layout', 'spreadsheet', 'list view'] },
  { tag: 'onboarding',     keywords: ['onboarding', 'welcome screen', 'getting started', 'walkthrough', 'tutorial ui', 'empty state'] },
  { tag: 'infinite scroll', keywords: ['infinite scroll', 'load more', 'pagination', 'lazy load', 'virtual scroll'] },
  { tag: 'search',         keywords: ['search bar', 'search ui', 'search ux', 'autocomplete', 'typeahead', 'command palette', 'cmdk'] },
  { tag: 'toast',          keywords: ['toast', 'notification', 'snackbar', 'alert', 'banner', 'badge'] },
  { tag: 'loading',        keywords: ['loading', 'skeleton', 'spinner', 'progress bar', 'shimmer', 'loader', 'placeholder'] },

  // Platform
  { tag: 'mobile',         keywords: ['mobile', 'ios', 'android', 'iphone', 'app design', 'mobile ui', 'native app', 'flutter', 'react native', 'swiftui', 'phone'] },
  { tag: 'desktop',        keywords: ['desktop app', 'electron', 'macos app', 'windows app', 'desktop ui', 'native desktop'] },
  { tag: 'web',            keywords: ['website', 'web design', 'web app', 'landing page', 'web ui', 'browser'] },
  { tag: 'landing page',   keywords: ['landing page', 'homepage', 'hero section', 'above the fold', 'marketing page', 'saas landing'] },
  { tag: 'responsive',     keywords: ['responsive', 'adaptive', 'breakpoint', 'mobile first', 'fluid layout'] },

  // Tools & frameworks
  { tag: 'figma',          keywords: ['figma', 'figma plugin', 'figma component', 'figma design', 'figma file'] },
  { tag: 'framer',         keywords: ['framer', 'framer motion', 'framer site', 'framer component'] },
  { tag: 'webflow',        keywords: ['webflow', 'webflow site', 'webflow animation', 'no-code'] },
  { tag: 'gsap',           keywords: ['gsap', 'greensock', 'tween', 'timeline gsap'] },
  { tag: 'lottie',         keywords: ['lottie', 'lottiefiles', 'after effects', 'rive', 'bodymovin'] },
  { tag: 'tailwind',       keywords: ['tailwind', 'tailwindcss', 'utility class', 'shadcn', 'radix'] },
  { tag: 'CSS',            keywords: ['css trick', 'css animation', 'css art', 'pure css', 'css only', 'keyframe', '@keyframes'] },
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
      if (combined.includes(keyword)) score += keyword.length > 5 ? 2 : 1;
    }
    if (score > bestScore) { bestScore = score; bestMatch = cat; }
  }

  if (bestMatch && bestScore >= 2) return { category: bestMatch.name, emoji: bestMatch.emoji };
  if (tweet.media_type === 'photo') return { category: 'Art', emoji: '🖼️' };
  if (tweet.media_type === 'video' || tweet.media_type === 'animated_gif') return { category: 'Entertainment', emoji: '🎬' };
  return { category: 'Inspiration', emoji: '✨' };
}

function tagify(tweet) {
  const text = (tweet.text || '').toLowerCase();
  const linkTitle = (tweet.link_title || '').toLowerCase();
  const authorUsername = (tweet.author_username || '').toLowerCase();
  const combined = `${text} ${linkTitle} ${authorUsername}`;
  const matched = [];

  for (const { tag, keywords } of TAGS) {
    for (const kw of keywords) {
      if (combined.includes(kw)) { matched.push(tag); break; }
    }
  }

  return [...new Set(matched)];
}

module.exports = { categorize, tagify, CATEGORIES, TAGS };
