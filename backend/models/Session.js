const crypto = require('crypto');

class Session {
  constructor(db) {
    this.db = db;
  }

  create({ userId, ipAddress, userAgent, expiresInDays = 30 }) {
    const id = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    this.db.prepare(`
      INSERT INTO sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, refreshToken, ipAddress || null, userAgent || null, expiresAt);

    return { id, refreshToken, expiresAt };
  }

  findByRefreshToken(refreshToken) {
    return this.db.prepare(`
      SELECT * FROM sessions WHERE refresh_token = ? AND is_active = 1 AND expires_at > datetime('now')
    `).get(refreshToken);
  }

  findByUserId(userId) {
    return this.db.prepare(`
      SELECT id, ip_address, user_agent, is_active, expires_at, created_at, last_used_at
      FROM sessions WHERE user_id = ? ORDER BY last_used_at DESC
    `).all(userId);
  }

  touch(id) {
    this.db.prepare('UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  }

  revoke(id) {
    this.db.prepare('UPDATE sessions SET is_active = 0 WHERE id = ?').run(id);
  }

  revokeAllForUser(userId) {
    this.db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?').run(userId);
  }

  cleanup() {
    return this.db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now') OR is_active = 0").run();
  }
}

module.exports = Session;
