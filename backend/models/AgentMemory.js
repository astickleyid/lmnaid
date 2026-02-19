class AgentMemory {
  constructor(db) {
    this.db = db;
  }

  // Store or update a memory entry
  upsert({ userId, key, value, category = 'general', importance = 0.5, expiresAt = null }) {
    this.db.prepare(`
      INSERT INTO agent_memory (user_id, key, value, category, importance, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        importance = excluded.importance,
        expires_at = excluded.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, key, value, category, importance, expiresAt);
  }

  get(userId, key) {
    return this.db.prepare(`
      SELECT * FROM agent_memory
      WHERE user_id = ? AND key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).get(userId, key);
  }

  getByCategory(userId, category, limit = 50) {
    return this.db.prepare(`
      SELECT * FROM agent_memory
      WHERE user_id = ? AND category = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY importance DESC, updated_at DESC
      LIMIT ?
    `).all(userId, category, limit);
  }

  getAllForUser(userId, limit = 100) {
    return this.db.prepare(`
      SELECT * FROM agent_memory
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY importance DESC, updated_at DESC
      LIMIT ?
    `).all(userId, limit);
  }

  delete(userId, key) {
    this.db.prepare('DELETE FROM agent_memory WHERE user_id = ? AND key = ?').run(userId, key);
  }

  deleteCategory(userId, category) {
    this.db.prepare('DELETE FROM agent_memory WHERE user_id = ? AND category = ?').run(userId, category);
  }

  cleanup() {
    return this.db.prepare("DELETE FROM agent_memory WHERE expires_at IS NOT NULL AND expires_at < datetime('now')").run();
  }

  // Build context string for AI injection
  buildContext(userId, { maxItems = 20, categories = null } = {}) {
    let query = `
      SELECT key, value, category FROM agent_memory
      WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
    `;
    const params = [userId];

    if (categories && categories.length > 0) {
      query += ` AND category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    query += ' ORDER BY importance DESC, updated_at DESC LIMIT ?';
    params.push(maxItems);

    const memories = this.db.prepare(query).all(...params);

    if (memories.length === 0) return '';

    const grouped = {};
    for (const m of memories) {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(`- ${m.key}: ${m.value}`);
    }

    let context = '## User Context\n';
    for (const [cat, items] of Object.entries(grouped)) {
      context += `\n### ${cat}\n${items.join('\n')}\n`;
    }
    return context;
  }
}

class UserPreferences {
  constructor(db) {
    this.db = db;
  }

  get(userId) {
    let prefs = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    if (!prefs) {
      this.db.prepare('INSERT INTO user_preferences (user_id) VALUES (?)').run(userId);
      prefs = this.db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
    }
    if (prefs.preferences_json) {
      try { prefs.custom = JSON.parse(prefs.preferences_json); } catch { prefs.custom = {}; }
    }
    return prefs;
  }

  update(userId, data) {
    const allowedFields = ['theme', 'language', 'notifications_enabled', 'ai_personality', 'ai_context_window', 'compact_mode'];
    const fields = [];
    const values = [];

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (data.custom) {
      fields.push('preferences_json = ?');
      values.push(JSON.stringify(data.custom));
    }

    if (fields.length === 0) return false;

    // Ensure row exists
    this.db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(userId);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);
    this.db.prepare(`UPDATE user_preferences SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);
    return true;
  }
}

module.exports = { AgentMemory, UserPreferences };
