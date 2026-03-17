import { useRef } from 'react';

export default function SearchBar({ search, onSearch, categories, activeCategory, onCategory }) {
  const inputRef = useRef(null);

  const allCategories = [
    { category: 'All', category_emoji: '✦', count: null },
    ...categories,
  ];

  return (
    <div className="search-bar-container">
      <div className="category-pills">
        {allCategories.map(cat => (
          <button
            key={cat.category}
            className={`category-pill ${activeCategory === cat.category ? 'active' : ''}`}
            onClick={() => onCategory(cat.category)}
          >
            <span className="pill-emoji">{cat.category_emoji}</span>
            <span className="pill-label">{cat.category}</span>
            {cat.count !== null && (
              <span className="pill-count">{cat.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="search-box" onClick={() => inputRef.current?.focus()}>
        <span className="search-icon">⌕</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search your bookmarks..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <button className="search-clear" onClick={() => onSearch('')}>✕</button>
        )}
      </div>
    </div>
  );
}
