class Server {
  constructor(db) {
    this.db = db;
  }

  create({ name, icon, ownerId, type, aiEnabled, communityEnabled, kanbanEnabled, streamingEnabled }) {
    const stmt = this.db.prepare(`
      INSERT INTO servers (
        name, icon, owner_id, type, 
        ai_enabled, community_enabled, kanban_enabled, streaming_enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name, icon || null, ownerId, type || 'custom',
      aiEnabled ? 1 : 0, communityEnabled ? 1 : 0, 
      kanbanEnabled ? 1 : 0, streamingEnabled ? 1 : 0
    );
    
    return this.findById(result.lastInsertRowid);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM servers WHERE id = ?').get(id);
  }

  findByOwnerId(ownerId) {
    return this.db.prepare('SELECT * FROM servers WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId);
  }

  findByUserId(userId) {
    return this.db.prepare(`
      SELECT s.* FROM servers s
      LEFT JOIN server_members sm ON sm.server_id = s.id
      WHERE s.owner_id = ? OR sm.user_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `).all(userId, userId);
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
    this.db.prepare(`UPDATE servers SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return true;
  }

  delete(id) {
    this.db.prepare('DELETE FROM servers WHERE id = ?').run(id);
  }

  // Members
  addMember(serverId, userId, role = 'member') {
    try {
      this.db.prepare('INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, ?)').run(serverId, userId, role);
      return true;
    } catch (error) {
      return false;
    }
  }

  removeMember(serverId, userId) {
    this.db.prepare('DELETE FROM server_members WHERE server_id = ? AND user_id = ?').run(serverId, userId);
  }

  getMembers(serverId, limit = 100, offset = 0) {
    return this.db.prepare(`
      SELECT u.*, sm.role, sm.joined_at
      FROM users u
      INNER JOIN server_members sm ON sm.user_id = u.id
      WHERE sm.server_id = ?
      ORDER BY sm.joined_at ASC
      LIMIT ? OFFSET ?
    `).all(serverId, limit, offset);
  }

  getMemberRole(serverId, userId) {
    const result = this.db.prepare('SELECT role FROM server_members WHERE server_id = ? AND user_id = ?').get(serverId, userId);
    return result ? result.role : null;
  }

  updateMemberRole(serverId, userId, role) {
    this.db.prepare('UPDATE server_members SET role = ? WHERE server_id = ? AND user_id = ?').run(role, serverId, userId);
  }

  isMember(serverId, userId) {
    const server = this.findById(serverId);
    if (server && server.owner_id === userId) return true;
    
    const result = this.db.prepare('SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?').get(serverId, userId);
    return !!result;
  }

  getMemberCount(serverId) {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM server_members WHERE server_id = ?').get(serverId);
    return result.count + 1; // +1 for owner
  }
}

module.exports = Server;
