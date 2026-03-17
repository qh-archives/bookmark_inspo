import { useState, useEffect, useCallback, useRef } from 'react';
import Grid from './components/Grid';
import LoginScreen from './components/LoginScreen';
import './App.css';

const API = '';

function parseUserFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('user_id')) {
    return {
      id: params.get('user_id'),
      username: params.get('username'),
      name: decodeURIComponent(params.get('name') || ''),
      profile_image_url: decodeURIComponent(params.get('avatar') || ''),
    };
  }
  return null;
}

export default function App() {
  const [user, setUser] = useState(() => {
    const fromUrl = parseUserFromUrl();
    if (fromUrl) {
      localStorage.setItem('tw_user', JSON.stringify(fromUrl));
      window.history.replaceState({}, '', '/');
      return fromUrl;
    }
    const saved = localStorage.getItem('tw_user');
    if (saved) return JSON.parse(saved);
    // Auto-login queenie_hsiao if no session exists
    const defaultUser = { id: '332267805', username: 'queenie_hsiao', name: 'queenie hsiao', profile_image_url: 'https://pbs.twimg.com/profile_images/2028682115139657728/EYB56XMC_normal.jpg' };
    localStorage.setItem('tw_user', JSON.stringify(defaultUser));
    return defaultUser;
  });

  const [bookmarks, setBookmarks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState('');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [fetchingMedia, setFetchingMedia] = useState(false);
  const [mediaMsg, setMediaMsg] = useState('');
  const [authError, setAuthError] = useState('');
  const searchTimeout = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth_error')) {
      setAuthError(decodeURIComponent(params.get('auth_error')));
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const fetchBookmarks = useCallback(async (searchVal = search, catVal = activeCategory, tagVal = activeTag) => {
    if (!user) return;
    const params = new URLSearchParams({ user_id: user.id, limit: 500 });
    if (catVal && catVal !== 'All') params.set('category', catVal);
    if (tagVal) params.set('search', tagVal);
    else if (searchVal) params.set('search', searchVal);
    const res = await fetch(`${API}/bookmarks?${params}`);
    const data = await res.json();
    setBookmarks(Array.isArray(data) ? data : []);
  }, [user, search, activeCategory, activeTag]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`${API}/bookmarks/categories?user_id=${user.id}`);
    const data = await res.json();
    setCategories(Array.isArray(data) ? data : []);
  }, [user]);

  const fetchTags = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`${API}/bookmarks/tags?user_id=${user.id}`);
    const data = await res.json();
    setTags(Array.isArray(data) ? data.slice(0, 20) : []);
  }, [user]);

  useEffect(() => {
    if (user) { fetchBookmarks('', 'All', ''); fetchCategories(); fetchTags(); }
  }, [user]);

  // Auto-refresh every 15 seconds to pick up new bookmarks from extension
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchBookmarks(search, activeCategory);
    }, 15000);
    return () => clearInterval(interval);
  }, [user, search, activeCategory]);

  const handleSearch = (val) => {
    setSearch(val);
    setActiveTag('');
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchBookmarks(val, activeCategory, ''), 300);
  };

  const handleTag = (tag) => {
    const next = activeTag === tag ? '' : tag;
    setActiveTag(next);
    setSearch('');
    fetchBookmarks('', activeCategory, next);
  };

  const handleCategory = (cat) => {
    setActiveCategory(cat);
    fetchBookmarks(search, cat);
  };

  const handleSync = async () => {
    if (!user || syncing) return;
    setSyncing(true); setSyncMsg('Syncing…');
    try {
      const res = await fetch(`${API}/bookmarks/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      setSyncMsg(data.added > 0 ? `+${data.added} new` : 'Up to date');
      fetchBookmarks('', 'All'); fetchCategories();
      setActiveCategory('All'); setSearch('');
    } catch { setSyncMsg('Failed'); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 3000); }
  };

  const handleFetchMedia = async () => {
    if (!user || fetchingMedia) return;
    setFetchingMedia(true); setMediaMsg('Fetching…');
    try {
      await fetch(`${API}/bookmarks/fetch-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      setMediaMsg('Done!');
      setTimeout(() => { fetchBookmarks(search, activeCategory); setMediaMsg(''); }, 3000);
    } catch { setMediaMsg('Failed'); setFetchingMedia(false); }
    finally { setFetchingMedia(false); }
  };

  const handleLogin = async () => {
    const res = await fetch(`${API}/auth/login`);
    const data = await res.json();
    if (data.error) { setAuthError(data.error); return; }
    window.location.href = data.url;
  };

  const handleLogout = () => {
    localStorage.removeItem('tw_user');
    setUser(null); setBookmarks([]); setCategories([]);
  };

  const deleteBookmark = async (id) => {
    await fetch(`${API}/bookmarks/${id}`, { method: 'DELETE' });
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  if (!user) return <LoginScreen onLogin={handleLogin} authError={authError} />;

  return (
    <div className="app">
      <div className="top-bar">
        <div className="user-pill" title={`@${user.username} — click to log out`} onClick={handleLogout}>
          {user.profile_image_url
            ? <img src={user.profile_image_url} alt="" className="user-avatar-img" />
            : <span style={{ fontSize: 13, color: '#888' }}>{user.name?.[0]}</span>}
        </div>
      </div>

      <div className="grid-scroll">
        <Grid bookmarks={bookmarks} onDelete={deleteBookmark} />
      </div>

      <div className="bottom-bar">
        {tags.length > 0 && (
          <div className="tag-chips">
            {tags.map(({ tag }) => (
              <button
                key={tag}
                className={`tag-chip${activeTag === tag ? ' active' : ''}`}
                onClick={() => handleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search bookmarks, tags, authors…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="search-input"
          />
          {(search || activeTag) && <button className="search-clear" onClick={() => { handleSearch(''); setActiveTag(''); fetchBookmarks('', activeCategory, ''); }}>✕</button>}
        </div>
      </div>
    </div>
  );
}
