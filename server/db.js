require('dotenv').config();
const path = require('path');
const fs = require('fs');

const isPg = !!process.env.DATABASE_URL;
let _pool, _sqlite;

if (isPg) {
  const { Pool } = require('pg');
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'bookmarks.db');
  _sqlite = new Database(dbPath);
}

// Convert SQLite ? placeholders to PostgreSQL $1, $2...
function toPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT, name TEXT, profile_image_url TEXT,
    access_token TEXT, refresh_token TEXT, token_expires_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY, user_id TEXT, tweet_id TEXT, text TEXT,
    author_id TEXT, author_name TEXT, author_username TEXT, author_image TEXT,
    media_url TEXT, media_type TEXT, preview_image TEXT,
    video_url TEXT, media_width INTEGER, media_height INTEGER,
    url TEXT, link_title TEXT, link_description TEXT, link_image TEXT,
    category TEXT DEFAULT 'Uncategorized', category_emoji TEXT DEFAULT '📌',
    tags TEXT DEFAULT '[]', canvas_x REAL, canvas_y REAL, canvas_rotation REAL DEFAULT 0,
    bookmarked_at INTEGER, created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`;

const PG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT, name TEXT, profile_image_url TEXT,
    access_token TEXT, refresh_token TEXT, token_expires_at BIGINT,
    created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
  );
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY, user_id TEXT, tweet_id TEXT, text TEXT,
    author_id TEXT, author_name TEXT, author_username TEXT, author_image TEXT,
    media_url TEXT, media_type TEXT, preview_image TEXT,
    video_url TEXT, media_width INTEGER, media_height INTEGER,
    url TEXT, link_title TEXT, link_description TEXT, link_image TEXT,
    category TEXT DEFAULT 'Uncategorized', category_emoji TEXT DEFAULT '📌',
    tags TEXT DEFAULT '[]', canvas_x REAL, canvas_y REAL, canvas_rotation REAL DEFAULT 0,
    bookmarked_at BIGINT, created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
  );
`;

async function init() {
  if (isPg) {
    await _pool.query(PG_SCHEMA);
    console.log('[db] PostgreSQL ready');
  } else {
    _sqlite.exec(SQLITE_SCHEMA);
    // Column migrations for older local DBs
    const cols = _sqlite.prepare('PRAGMA table_info(bookmarks)').all().map(c => c.name);
    if (!cols.includes('video_url'))    _sqlite.exec('ALTER TABLE bookmarks ADD COLUMN video_url TEXT');
    if (!cols.includes('media_width'))  _sqlite.exec('ALTER TABLE bookmarks ADD COLUMN media_width INTEGER');
    if (!cols.includes('media_height')) _sqlite.exec('ALTER TABLE bookmarks ADD COLUMN media_height INTEGER');
    // Seed from seed.json on fresh DB
    seedFromFile();
    console.log('[db] SQLite ready');
  }
}

function seedFromFile() {
  const seedPath = path.join(__dirname, 'seed.json');
  if (!fs.existsSync(seedPath)) return;
  const existing = _sqlite.prepare('SELECT COUNT(*) as c FROM bookmarks').get().c;
  if (existing > 0) return;
  try {
    const { users = [], bookmarks = [] } = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const iu = _sqlite.prepare(`INSERT OR IGNORE INTO users (id, username, name, profile_image_url) VALUES (@id, @username, @name, @profile_image_url)`);
    const ib = _sqlite.prepare(`INSERT OR IGNORE INTO bookmarks (
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
    )`);
    _sqlite.transaction(() => {
      users.forEach(u => iu.run(u));
      bookmarks.forEach(b => ib.run(b));
    })();
    console.log(`[db] Seeded ${bookmarks.length} bookmarks from seed.json`);
  } catch (e) {
    console.error('[db] Seed failed:', e.message);
  }
}

const db = {
  isPg,

  async query(sql, params = []) {
    if (isPg) return (await _pool.query(toPostgres(sql), params)).rows;
    return _sqlite.prepare(sql).all(...params);
  },

  async get(sql, params = []) {
    if (isPg) return (await _pool.query(toPostgres(sql), params)).rows[0];
    return _sqlite.prepare(sql).get(...params);
  },

  async run(sql, params = []) {
    if (isPg) {
      const r = await _pool.query(toPostgres(sql), params);
      return { changes: r.rowCount };
    }
    return _sqlite.prepare(sql).run(...params);
  },

  async exec(sql) {
    if (isPg) await _pool.query(sql);
    else _sqlite.exec(sql);
  },

  // Run a list of [sql, params] pairs in a transaction
  async transaction(ops) {
    if (isPg) {
      const client = await _pool.connect();
      try {
        await client.query('BEGIN');
        for (const [sql, params = []] of ops) await client.query(toPostgres(sql), params);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } else {
      _sqlite.transaction(() => {
        for (const [sql, params = []] of ops) _sqlite.prepare(sql).run(...params);
      })();
    }
  },

  // PostgreSQL-safe upsert for users
  async upsertUser(me, tokens, expiresAt) {
    await this.run(`
      INSERT INTO users (id, username, name, profile_image_url, access_token, refresh_token, token_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username, name = EXCLUDED.name,
        profile_image_url = EXCLUDED.profile_image_url,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at
    `, [me.id, me.username, me.name, me.profile_image_url, tokens.access_token, tokens.refresh_token, expiresAt]);
  },

  // Seed from seed.json (used by admin endpoint for PostgreSQL)
  async seedFromJson(data) {
    const { users = [], bookmarks = [] } = data;
    for (const u of users) {
      await this.run(`
        INSERT INTO users (id, username, name, profile_image_url)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `, [u.id, u.username, u.name, u.profile_image_url]);
    }
    for (const b of bookmarks) {
      await this.run(`
        INSERT INTO bookmarks (
          id, user_id, tweet_id, text, author_name, author_username, author_image,
          media_url, media_type, preview_image, video_url, media_width, media_height,
          url, link_title, link_description, link_image,
          category, category_emoji, tags, canvas_x, canvas_y, canvas_rotation,
          bookmarked_at, created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT (id) DO NOTHING
      `, [
        b.id, b.user_id, b.tweet_id, b.text, b.author_name, b.author_username, b.author_image,
        b.media_url, b.media_type, b.preview_image, b.video_url, b.media_width, b.media_height,
        b.url, b.link_title, b.link_description, b.link_image,
        b.category, b.category_emoji, b.tags, b.canvas_x, b.canvas_y, b.canvas_rotation,
        b.bookmarked_at, b.created_at,
      ]);
    }
    return { users: users.length, bookmarks: bookmarks.length };
  },

  init,
};

module.exports = db;
