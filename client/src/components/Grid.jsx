import BookmarkCard from './BookmarkCard';

export default function Grid({ bookmarks, onDelete }) {
  if (bookmarks.length === 0) {
    return (
      <div className="grid-empty">
        <p>No bookmarks yet.</p>
        <p>Go to <a href="https://x.com/i/bookmarks" target="_blank" rel="noopener noreferrer">x.com/i/bookmarks</a> and scroll to import.</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {bookmarks.map(bookmark => (
        <BookmarkCard
          key={bookmark.id}
          bookmark={bookmark}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
