const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bookmarks.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    name TEXT,
    profile_image_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    tweet_id TEXT,
    text TEXT,
    author_id TEXT,
    author_name TEXT,
    author_username TEXT,
    author_image TEXT,
    media_url TEXT,
    media_type TEXT,
    preview_image TEXT,
    url TEXT,
    link_title TEXT,
    link_description TEXT,
    link_image TEXT,
    category TEXT DEFAULT 'Uncategorized',
    category_emoji TEXT DEFAULT '🔖',
    tags TEXT DEFAULT '[]',
    canvas_x REAL,
    canvas_y REAL,
    canvas_rotation REAL DEFAULT 0,
    bookmarked_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = db;
