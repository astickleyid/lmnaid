const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function initDatabase(dbPath = null) {
  if (!dbPath) {
    const userDataPath = process.env.USER_DATA_PATH || path.join(__dirname, '../../data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    dbPath = path.join(userDataPath, 'nxcor.db');
  }
  
  db = new Database(dbPath);
  
  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 10000');
  db.pragma('temp_store = MEMORY');
  db.pragma('foreign_keys = ON');
  
  createTables();
  createIndexes();
  
  console.log('✅ Database initialized at:', dbPath);
  return db;
}

function createTables() {
  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT,
      display_name TEXT,
      avatar TEXT,
      banner TEXT,
      bio TEXT,
      status TEXT DEFAULT 'offline',
      stream_key TEXT UNIQUE,
      verified INTEGER DEFAULT 0,
      partner INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      two_factor_enabled INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- OAuth Accounts (linked providers per user)
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at DATETIME,
      profile_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, provider_user_id)
    );

    -- Sessions Table (JWT + refresh token tracking)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      is_active INTEGER DEFAULT 1,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Servers Table
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      banner TEXT,
      description TEXT,
      owner_id INTEGER NOT NULL,
      type TEXT DEFAULT 'custom',
      ai_enabled INTEGER DEFAULT 0,
      community_enabled INTEGER DEFAULT 0,
      kanban_enabled INTEGER DEFAULT 0,
      streaming_enabled INTEGER DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      invite_code TEXT UNIQUE,
      max_members INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Server Members
    CREATE TABLE IF NOT EXISTS server_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      nickname TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(server_id, user_id)
    );

    -- Channels Table
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      category TEXT,
      topic TEXT,
      position INTEGER DEFAULT 0,
      is_private INTEGER DEFAULT 0,
      slowmode INTEGER DEFAULT 0,
      nsfw INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    );

    -- Messages Table (chat history)
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER,
      stream_id INTEGER,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      reply_to_id INTEGER,
      edited_at DATETIME,
      pinned INTEGER DEFAULT 0,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
    );

    -- Agent Memory (per-user AI context)
    CREATE TABLE IF NOT EXISTS agent_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      importance REAL DEFAULT 0.5,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, key)
    );

    -- User Preferences
    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      theme TEXT DEFAULT 'dark',
      language TEXT DEFAULT 'en',
      notifications_enabled INTEGER DEFAULT 1,
      ai_personality TEXT DEFAULT 'default',
      ai_context_window INTEGER DEFAULT 20,
      compact_mode INTEGER DEFAULT 0,
      preferences_json TEXT DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Agent Metadata (global agent config)
    CREATE TABLE IF NOT EXISTS agent_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      model TEXT DEFAULT 'gemini-2.0-flash',
      system_prompt TEXT,
      capabilities TEXT DEFAULT '[]',
      config_json TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Streams Table
    CREATE TABLE IF NOT EXISTS streams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT,
      description TEXT,
      category TEXT,
      thumbnail_url TEXT,
      stream_key TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'idle',
      is_private INTEGER DEFAULT 0,
      allowed_users TEXT,
      current_viewers INTEGER DEFAULT 0,
      peak_viewers INTEGER DEFAULT 0,
      total_views INTEGER DEFAULT 0,
      started_at DATETIME,
      ended_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Stream Analytics
    CREATE TABLE IF NOT EXISTS stream_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id INTEGER NOT NULL,
      viewer_count INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
    );

    -- Followers Table
    CREATE TABLE IF NOT EXISTS followers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      follower_id INTEGER NOT NULL,
      notifications_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, follower_id)
    );

    -- Subscriptions Table
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subscriber_id INTEGER NOT NULL,
      tier INTEGER DEFAULT 1,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'active',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ends_at DATETIME,
      auto_renew INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subscriber_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Bans Table
    CREATE TABLE IF NOT EXISTS bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      banned_by INTEGER NOT NULL,
      server_id INTEGER,
      channel_id INTEGER,
      reason TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Reports Table
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      reported_user_id INTEGER,
      reported_message_id INTEGER,
      reported_stream_id INTEGER,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      resolved_by INTEGER,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Emotes Table
    CREATE TABLE IF NOT EXISTS emotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      image_url TEXT NOT NULL,
      creator_id INTEGER NOT NULL,
      server_id INTEGER,
      global INTEGER DEFAULT 0,
      animated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Clips Table
    CREATE TABLE IF NOT EXISTS clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id INTEGER NOT NULL,
      creator_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration INTEGER NOT NULL,
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      view_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- VODs Table
    CREATE TABLE IF NOT EXISTS vods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration INTEGER NOT NULL,
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      view_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
    );
  `);
}

function createIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_stream ON messages(stream_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_channels_server ON channels(server_id, position);
    CREATE INDEX IF NOT EXISTS idx_streams_user ON streams(user_id);
    CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_server_members ON server_members(server_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_followers ON followers(user_id, follower_id);
    CREATE INDEX IF NOT EXISTS idx_stream_analytics ON stream_analytics(stream_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bans_user ON bans(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(subscriber_id, status);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token);
    CREATE INDEX IF NOT EXISTS idx_oauth_user ON oauth_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id);
    CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_memory(user_id, category);
    CREATE INDEX IF NOT EXISTS idx_agent_memory_key ON agent_memory(user_id, key);
    CREATE INDEX IF NOT EXISTS idx_agent_metadata ON agent_metadata(agent_id);
  `);
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
    db = null;
    console.log('✅ Database closed');
  }
}

function transaction(fn) {
  return db.transaction(fn);
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  transaction
};
