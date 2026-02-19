const crypto = require('crypto');

class User {
  constructor(db) {
    this.db = db;
  }

  create({ username, email, password, displayName, avatar }) {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, avatar, email_verified)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    
    const result = stmt.run(username, email, password, displayName || username, avatar || null);
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  findByUsername(username) {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  }

  findByEmail(email) {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  update(id, data) {
    const fields = [];
    const values = [];
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    this.db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return true;
  }

  updateStatus(id, status) {
    this.db.prepare('UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  }

  updateStreamKey(id, streamKey) {
    this.db.prepare('UPDATE users SET stream_key = ? WHERE id = ?').run(streamKey, id);
  }

  generateStreamKey(userId) {
    const key = crypto.randomBytes(32).toString('hex');
    this.updateStreamKey(userId, key);
    return key;
  }

  getFollowers(userId, limit = 50, offset = 0) {
    return this.db.prepare(`
      SELECT u.* FROM users u
      INNER JOIN followers f ON f.follower_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);
  }

  getFollowing(userId, limit = 50, offset = 0) {
    return this.db.prepare(`
      SELECT u.* FROM users u
      INNER JOIN followers f ON f.user_id = u.id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);
  }

  follow(followerId, userId) {
    try {
      this.db.prepare('INSERT INTO followers (follower_id, user_id) VALUES (?, ?)').run(followerId, userId);
      return true;
    } catch (error) {
      return false;
    }
  }

  unfollow(followerId, userId) {
    this.db.prepare('DELETE FROM followers WHERE follower_id = ? AND user_id = ?').run(followerId, userId);
  }

  isFollowing(followerId, userId) {
    const result = this.db.prepare('SELECT 1 FROM followers WHERE follower_id = ? AND user_id = ?').get(followerId, userId);
    return !!result;
  }

  getStats(userId) {
    const user = this.findById(userId);
    if (!user) return null;

    const followers = this.db.prepare('SELECT COUNT(*) as count FROM followers WHERE user_id = ?').get(userId);
    const following = this.db.prepare('SELECT COUNT(*) as count FROM followers WHERE follower_id = ?').get(userId);
    const totalViews = this.db.prepare('SELECT SUM(total_views) as count FROM streams WHERE user_id = ?').get(userId);
    const totalStreams = this.db.prepare('SELECT COUNT(*) as count FROM streams WHERE user_id = ?').get(userId);

    return {
      followers: followers.count,
      following: following.count,
      totalViews: totalViews.count || 0,
      totalStreams: totalStreams.count
    };
  }

  search(query, limit = 20) {
    return this.db.prepare(`
      SELECT id, username, display_name, avatar, status, verified
      FROM users
      WHERE username LIKE ? OR display_name LIKE ?
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, limit);
  }

  delete(id) {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}

module.exports = User;
