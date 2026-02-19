class Channel {
  constructor(db) {
    this.db = db;
  }

  create({ serverId, name, type, category, position }) {
    const stmt = this.db.prepare(`
      INSERT INTO channels (server_id, name, type, category, position)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(serverId, name, type || 'text', category || null, position || 0);
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
  }

  findByServerId(serverId) {
    return this.db.prepare(`
      SELECT * FROM channels
      WHERE server_id = ?
      ORDER BY position, created_at
    `).all(serverId);
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
    this.db.prepare(`UPDATE channels SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return true;
  }

  delete(id) {
    this.db.prepare('DELETE FROM channels WHERE id = ?').run(id);
  }

  reorder(serverId, channelIds) {
    const stmt = this.db.prepare('UPDATE channels SET position = ? WHERE id = ? AND server_id = ?');
    
    const transaction = this.db.transaction(() => {
      channelIds.forEach((id, index) => {
        stmt.run(index, id, serverId);
      });
    });
    
    transaction();
  }
}

class Message {
  constructor(db) {
    this.db = db;
  }

  create({ channelId, userId, content, streamId, replyToId }) {
    const stmt = this.db.prepare(`
      INSERT INTO messages (channel_id, user_id, content, stream_id, reply_to_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(channelId, userId, content, streamId || null, replyToId || null);
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    return this.db.prepare(`
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM messages m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(id);
  }

  findByChannelId(channelId, limit = 50, before = null) {
    let query = `
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM messages m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.channel_id = ?
    `;
    
    const params = [channelId];
    
    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);
    
    return this.db.prepare(query).all(...params).reverse();
  }

  findByStreamId(streamId, limit = 100, after = null) {
    let query = `
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM messages m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.stream_id = ?
    `;
    
    const params = [streamId];
    
    if (after) {
      query += ' AND m.id > ?';
      params.push(after);
    }
    
    query += ' ORDER BY m.created_at ASC LIMIT ?';
    params.push(limit);
    
    return this.db.prepare(query).all(...params);
  }

  update(id, content) {
    this.db.prepare(`
      UPDATE messages 
      SET content = ?, edited_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(content, id);
    return this.findById(id);
  }

  delete(id) {
    this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  }

  deleteByChannelId(channelId) {
    this.db.prepare('DELETE FROM messages WHERE channel_id = ?').run(channelId);
  }

  search(query, channelId = null, limit = 20) {
    let sql = `
      SELECT m.*, u.username, u.display_name, u.avatar
      FROM messages m
      INNER JOIN users u ON m.user_id = u.id
      WHERE m.content LIKE ?
    `;
    
    const params = [`%${query}%`];
    
    if (channelId) {
      sql += ' AND m.channel_id = ?';
      params.push(channelId);
    }
    
    sql += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);
    
    return this.db.prepare(sql).all(...params);
  }
}

module.exports = { Channel, Message };
