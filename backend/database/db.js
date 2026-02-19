const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDatabase() {
  let dbPath;
  
  // Check if running in Electron
  try {
    const { app } = require('electron');
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'lmnaid.db');
  } catch (err) {
    // Not in Electron, use local path
    dbPath = path.join(__dirname, '../../lmnaid.db');
  }
  
  db = new Database(dbPath);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      avatar TEXT,
      status TEXT DEFAULT 'offline',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      owner_id INTEGER NOT NULL,
      type TEXT DEFAULT 'custom',
      ai_enabled INTEGER DEFAULT 0,
      community_enabled INTEGER DEFAULT 0,
      kanban_enabled INTEGER DEFAULT 0,
      streaming_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      category TEXT,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      channel_id INTEGER,
      user_id INTEGER NOT NULL,
      title TEXT,
      stream_key TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'offline',
      viewer_count INTEGER DEFAULT 0,
      started_at DATETIME,
      ended_at DATETIME,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (friend_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_channels_server ON channels(server_id);
    CREATE INDEX IF NOT EXISTS idx_streams_server ON streams(server_id);
    CREATE INDEX IF NOT EXISTS idx_streams_user ON streams(user_id);
  `);

  console.log('✅ Database initialized at:', dbPath);
  return db;
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    console.log('✅ Database closed');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
