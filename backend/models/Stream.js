class Stream {
  constructor(db) {
    this.db = db;
  }

  create({ userId, title, description, category, thumbnailUrl, isPrivate, allowedUsers, platform = 'twitch' }) {
    // Ensure platform column exists (safe migration)
    try {
      this.db.prepare(`ALTER TABLE streams ADD COLUMN platform TEXT DEFAULT 'twitch'`).run();
    } catch (e) {
      // Column already exists — ignore
    }

    const stmt = this.db.prepare(`
      INSERT INTO streams (
        user_id, title, description, category, thumbnail_url,
        is_private, allowed_users, status, stream_key, platform
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'idle', ?, ?)
    `);
    
    const streamKey = require('crypto').randomBytes(32).toString('hex');
    const validPlatforms = ['twitch', 'youtube', 'kick', 'facebook', 'nxcor'];
    const safePlatform = validPlatforms.includes(platform) ? platform : 'twitch';
    const result = stmt.run(
      userId, title, description, category, thumbnailUrl || null,
      isPrivate ? 1 : 0, allowedUsers ? JSON.stringify(allowedUsers) : null, streamKey, safePlatform
    );
    
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    const stream = this.db.prepare(`
      SELECT s.*, u.username, u.display_name, u.avatar
      FROM streams s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(id);
    
    if (stream && stream.allowed_users) {
      stream.allowed_users = JSON.parse(stream.allowed_users);
    }
    
    return stream;
  }

  findByStreamKey(streamKey) {
    const stream = this.db.prepare(`
      SELECT s.*, u.username, u.display_name, u.avatar
      FROM streams s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.stream_key = ?
    `).get(streamKey);
    
    if (stream && stream.allowed_users) {
      stream.allowed_users = JSON.parse(stream.allowed_users);
    }
    
    return stream;
  }

  findByUserId(userId) {
    const streams = this.db.prepare(`
      SELECT * FROM streams
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    
    return streams.map(s => {
      if (s.allowed_users) s.allowed_users = JSON.parse(s.allowed_users);
      return s;
    });
  }

  getLiveStreams(limit = 50, offset = 0, category = null) {
    let query = `
      SELECT s.*, u.username, u.display_name, u.avatar
      FROM streams s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.status = 'live' AND s.is_private = 0
    `;
    
    const params = [];
    
    if (category) {
      query += ' AND s.category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY s.current_viewers DESC, s.started_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return this.db.prepare(query).all(...params);
  }

  getFollowingStreams(userId, limit = 50) {
    return this.db.prepare(`
      SELECT s.*, u.username, u.display_name, u.avatar
      FROM streams s
      INNER JOIN users u ON s.user_id = u.id
      INNER JOIN followers f ON f.user_id = s.user_id
      WHERE f.follower_id = ? AND s.status = 'live'
      ORDER BY s.started_at DESC
      LIMIT ?
    `).all(userId, limit);
  }

  updateStatus(id, status) {
    const updates = { status };
    
    if (status === 'live') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'ended') {
      updates.ended_at = new Date().toISOString();
    }
    
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(id);
    
    this.db.prepare(`UPDATE streams SET ${fields} WHERE id = ?`).run(...values);
  }

  updateViewers(id, count) {
    this.db.prepare(`
      UPDATE streams 
      SET current_viewers = ?, peak_viewers = MAX(peak_viewers, ?)
      WHERE id = ?
    `).run(count, count, id);
  }

  incrementViews(id, count = 1) {
    this.db.prepare('UPDATE streams SET total_views = total_views + ? WHERE id = ?').run(count, id);
  }

  update(id, data) {
    const fields = [];
    const values = [];
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (key === 'allowed_users' && data[key]) {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(id);
    this.db.prepare(`UPDATE streams SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return true;
  }

  delete(id) {
    this.db.prepare('DELETE FROM streams WHERE id = ?').run(id);
  }

  getCategories() {
    return this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM streams
      WHERE status = 'live' AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();
  }

  search(query, limit = 20) {
    return this.db.prepare(`
      SELECT s.*, u.username, u.display_name, u.avatar
      FROM streams s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.status = 'live' 
        AND s.is_private = 0
        AND (s.title LIKE ? OR s.description LIKE ? OR u.username LIKE ?)
      ORDER BY s.current_viewers DESC
      LIMIT ?
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, limit);
  }

  getAnalytics(streamId) {
    const stream = this.findById(streamId);
    if (!stream) return null;

    const viewerHistory = this.db.prepare(`
      SELECT timestamp, viewer_count
      FROM stream_analytics
      WHERE stream_id = ?
      ORDER BY timestamp ASC
    `).all(streamId);

    const chatStats = this.db.prepare(`
      SELECT COUNT(*) as total_messages, COUNT(DISTINCT user_id) as unique_chatters
      FROM messages
      WHERE stream_id = ?
    `).get(streamId);

    return {
      stream,
      viewerHistory,
      chatStats: chatStats || { total_messages: 0, unique_chatters: 0 },
      peakViewers: stream.peak_viewers,
      totalViews: stream.total_views,
      duration: stream.ended_at 
        ? new Date(stream.ended_at) - new Date(stream.started_at)
        : Date.now() - new Date(stream.started_at)
    };
  }

  recordAnalytics(streamId, viewerCount) {
    this.db.prepare(`
      INSERT INTO stream_analytics (stream_id, viewer_count, timestamp)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(streamId, viewerCount);
  }
}

module.exports = Stream;
