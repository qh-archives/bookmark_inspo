const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'bookmarks.db');
const db = new Database(dbPath);

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
    video_url TEXT,
    media_width INTEGER,
    media_height INTEGER,
    url TEXT,
    link_title TEXT,
    link_description TEXT,
    link_image TEXT,
    category TEXT DEFAULT 'Uncategorized',
    category_emoji TEXT DEFAULT '📌',
    tags TEXT DEFAULT '[]',
    canvas_x REAL,
    canvas_y REAL,
    canvas_rotation REAL DEFAULT 0,
    bookmarked_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Add columns if upgrading an older DB
const existingCols = db.prepare("PRAGMA table_info(bookmarks)").all().map(c => c.name);
if (!existingCols.includes('video_url'))    db.exec('ALTER TABLE bookmarks ADD COLUMN video_url TEXT');
if (!existingCols.includes('media_width'))  db.exec('ALTER TABLE bookmarks ADD COLUMN media_width INTEGER');
if (!existingCols.includes('media_height')) db.exec('ALTER TABLE bookmarks ADD COLUMN media_height INTEGER');

// Seed from seed.json on first deploy (only if DB is empty)
const seedPath = path.join(__dirname, 'seed.json');
if (fs.existsSync(seedPath)) {
  const existing = db.prepare('SELECT COUNT(*) as c FROM bookmarks').get().c;
  if (existing === 0) {
    try {
      const { users = [], bookmarks = [] } = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (id, username, name, profile_image_url, created_at)
        VALUES (@id, @username, @name, @profile_image_url, @created_at)
      `);
      const insertBm = db.prepare(`
        INSERT OR IGNORE INTO bookmarks (
          id, user_id, tweet_id, text, author_name, author_username, author_image,
          media_url, media_type, preview_image, video_url, media_width, media_height,
          url, link_title, link_description, link_image,
          category, category_emoji, tags, canvas_x, canvas_y, canvas_rotation,
          bookmarked_at, created_at
        ) VALUES (
          @id, @user_id, @tweet_id, @text, @author_name, @author_username, @author_image,
          @media_url, @media_type, @preview_image, @video_url, @media_width, @media_height,
          @url, @link_title, @link_description, @link_image,
          @category, @category_emoji, @tags, @canvas_x, @canvas_y, @canvas_rotation,
          @bookmarked_at, @created_at
        )
      `);
      const seedAll = db.transaction(() => {
        users.forEach(u => insertUser.run(u));
        bookmarks.forEach(b => insertBm.run(b));
      });
      seedAll();
      console.log(`Seeded ${bookmarks.length} bookmarks from seed.json`);
    } catch (e) {
      console.error('Seed failed:', e.message);
    }
  }
}

module.exports = db;
