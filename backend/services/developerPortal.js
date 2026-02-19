const crypto = require('crypto');

/**
 * Developer Portal Service
 * Manages developer applications, API keys, webhooks, and MCP server configurations
 */
class DeveloperPortalService {
  constructor(db) {
    this.db = db;
    this.initTables();
  }

  initTables() {
    this.db.exec(`
      -- Developer Applications
      CREATE TABLE IF NOT EXISTS dev_applications (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        app_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        client_id TEXT UNIQUE NOT NULL,
        client_secret TEXT NOT NULL,
        bot_token TEXT,
        interactions_endpoint TEXT,
        verification_token TEXT NOT NULL,
        is_public INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- API Keys for applications
      CREATE TABLE IF NOT EXISTS dev_api_keys (
        id TEXT PRIMARY KEY,
        app_id TEXT NOT NULL,
        name TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        scopes TEXT NOT NULL, -- JSON array
        last_used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked_at DATETIME,
        FOREIGN KEY (app_id) REFERENCES dev_applications(id) ON DELETE CASCADE
      );

      -- Webhooks
      CREATE TABLE IF NOT EXISTS dev_webhooks (
        id TEXT PRIMARY KEY,
        app_id TEXT NOT NULL,
        url TEXT NOT NULL,
        events TEXT NOT NULL, -- JSON array
        secret TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (app_id) REFERENCES dev_applications(id) ON DELETE CASCADE
      );

      -- MCP Servers
      CREATE TABLE IF NOT EXISTS dev_mcp_servers (
        id TEXT PRIMARY KEY,
        app_id TEXT NOT NULL,
        name TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        transport TEXT NOT NULL, -- 'sse' or 'stdio'
        status TEXT DEFAULT 'inactive', -- 'active', 'inactive', 'error'
        config TEXT, -- JSON configuration
        last_ping_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (app_id) REFERENCES dev_applications(id) ON DELETE CASCADE
      );

      -- API Request Logs (for analytics)
      CREATE TABLE IF NOT EXISTS dev_api_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id TEXT NOT NULL,
        api_key_id TEXT,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        response_time_ms INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (app_id) REFERENCES dev_applications(id) ON DELETE CASCADE,
        FOREIGN KEY (api_key_id) REFERENCES dev_api_keys(id) ON DELETE SET NULL
      );

      -- UI Layouts (JSON storage for custom dashboards)
      CREATE TABLE IF NOT EXISTS dev_ui_layouts (
        id TEXT PRIMARY KEY,
        app_id TEXT NOT NULL,
        layout TEXT NOT NULL, -- JSON
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (app_id) REFERENCES dev_applications(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_dev_apps_user ON dev_applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_dev_keys_app ON dev_api_keys(app_id);
      CREATE INDEX IF NOT EXISTS idx_dev_webhooks_app ON dev_webhooks(app_id);
      CREATE INDEX IF NOT EXISTS idx_dev_mcp_app ON dev_mcp_servers(app_id);
      CREATE INDEX IF NOT EXISTS idx_dev_logs_app ON dev_api_logs(app_id);
      CREATE INDEX IF NOT EXISTS idx_dev_logs_created ON dev_api_logs(created_at);
    `);
  }

  // --- Application Management ---

  createApplication(userId, data) {
    const id = `app_${crypto.randomBytes(8).toString('hex')}`;
    const appId = Date.now().toString();
    const clientId = `client_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = `sec_${crypto.randomBytes(32).toString('hex')}`;
    const publicKey = `pub_key_${crypto.randomBytes(16).toString('hex')}`;
    const verificationToken = `ver_${crypto.randomBytes(16).toString('hex')}`;
    const botToken = data.enableBot ? `bot_${crypto.randomBytes(32).toString('hex')}` : null;

    this.db.prepare(`
      INSERT INTO dev_applications (
        id, user_id, name, description, app_id, public_key, 
        client_id, client_secret, bot_token, interactions_endpoint,
        verification_token, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, userId, data.name, data.description || null, appId, publicKey,
      clientId, clientSecret, botToken, data.interactionsEndpoint || null,
      verificationToken, data.isPublic ? 1 : 0
    );

    return this.getApplication(id);
  }

  getApplication(appId) {
    const app = this.db.prepare('SELECT * FROM dev_applications WHERE id = ?').get(appId);
    if (!app) return null;

    // Get related data
    app.apiKeys = this.getApiKeys(appId);
    app.webhooks = this.getWebhooks(appId);
    app.mcpServers = this.getMCPServers(appId);
    app.uiLayout = this.getUILayout(appId);

    return app;
  }

  listApplications(userId) {
    return this.db.prepare('SELECT * FROM dev_applications WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  }

  updateApplication(appId, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.interactionsEndpoint !== undefined) {
      fields.push('interactions_endpoint = ?');
      values.push(updates.interactionsEndpoint);
    }
    if (updates.isPublic !== undefined) {
      fields.push('is_public = ?');
      values.push(updates.isPublic ? 1 : 0);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(appId);

    this.db.prepare(`UPDATE dev_applications SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return true;
  }

  deleteApplication(appId) {
    this.db.prepare('DELETE FROM dev_applications WHERE id = ?').run(appId);
  }

  regenerateClientSecret(appId) {
    const clientSecret = `sec_${crypto.randomBytes(32).toString('hex')}`;
    this.db.prepare('UPDATE dev_applications SET client_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(clientSecret, appId);
    return clientSecret;
  }

  regenerateBotToken(appId) {
    const botToken = `bot_${crypto.randomBytes(32).toString('hex')}`;
    this.db.prepare('UPDATE dev_applications SET bot_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(botToken, appId);
    return botToken;
  }

  // --- API Key Management ---

  createApiKey(appId, data) {
    const id = `key_${crypto.randomBytes(12).toString('hex')}`;
    const rawKey = `${data.isLive ? 'sk_live' : 'sk_test'}_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const scopes = JSON.stringify(data.scopes || ['*']);

    this.db.prepare(`
      INSERT INTO dev_api_keys (id, app_id, name, key_prefix, key_hash, scopes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, appId, data.name, keyPrefix, keyHash, scopes);

    // Return the raw key ONCE (never stored in plaintext)
    return {
      id,
      key: rawKey,
      prefix: keyPrefix,
      name: data.name,
      scopes: data.scopes
    };
  }

  getApiKeys(appId) {
    const keys = this.db.prepare(`
      SELECT id, name, key_prefix as prefix, scopes, last_used_at, created_at, revoked_at
      FROM dev_api_keys
      WHERE app_id = ? AND revoked_at IS NULL
      ORDER BY created_at DESC
    `).all(appId);

    return keys.map(key => ({
      ...key,
      scopes: JSON.parse(key.scopes),
      lastUsed: key.last_used_at ? this.formatRelativeTime(key.last_used_at) : 'Never'
    }));
  }

  verifyApiKey(rawKey) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key = this.db.prepare(`
      SELECT k.*, a.user_id, a.name as app_name
      FROM dev_api_keys k
      JOIN dev_applications a ON k.app_id = a.id
      WHERE k.key_hash = ? AND k.revoked_at IS NULL
    `).get(keyHash);

    if (key) {
      // Update last used timestamp
      this.db.prepare('UPDATE dev_api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(key.id);
    }

    return key;
  }

  revokeApiKey(keyId) {
    this.db.prepare('UPDATE dev_api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyId);
  }

  // --- Webhook Management ---

  createWebhook(appId, data) {
    const id = `wh_${crypto.randomBytes(12).toString('hex')}`;
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    const events = JSON.stringify(data.events || []);

    this.db.prepare(`
      INSERT INTO dev_webhooks (id, app_id, url, events, secret, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, appId, data.url, events, secret, 1);

    return {
      id,
      url: data.url,
      events: data.events,
      secret,
      active: true
    };
  }

  getWebhooks(appId) {
    const webhooks = this.db.prepare('SELECT * FROM dev_webhooks WHERE app_id = ? ORDER BY created_at DESC').all(appId);
    return webhooks.map(wh => ({
      ...wh,
      events: JSON.parse(wh.events),
      active: wh.active === 1
    }));
  }

  updateWebhook(webhookId, updates) {
    const fields = [];
    const values = [];

    if (updates.url !== undefined) {
      fields.push('url = ?');
      values.push(updates.url);
    }
    if (updates.events !== undefined) {
      fields.push('events = ?');
      values.push(JSON.stringify(updates.events));
    }
    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(webhookId);

    this.db.prepare(`UPDATE dev_webhooks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return true;
  }

  deleteWebhook(webhookId) {
    this.db.prepare('DELETE FROM dev_webhooks WHERE id = ?').run(webhookId);
  }

  // --- MCP Server Management ---

  createMCPServer(appId, data) {
    const id = `mcp_${crypto.randomBytes(12).toString('hex')}`;
    const config = data.config ? JSON.stringify(data.config) : null;

    this.db.prepare(`
      INSERT INTO dev_mcp_servers (id, app_id, name, endpoint, transport, config)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, appId, data.name, data.endpoint, data.transport, config);

    return { id, ...data };
  }

  getMCPServers(appId) {
    const servers = this.db.prepare('SELECT * FROM dev_mcp_servers WHERE app_id = ? ORDER BY created_at DESC').all(appId);
    return servers.map(srv => ({
      ...srv,
      config: srv.config ? JSON.parse(srv.config) : null
    }));
  }

  updateMCPServer(serverId, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.endpoint !== undefined) {
      fields.push('endpoint = ?');
      values.push(updates.endpoint);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(JSON.stringify(updates.config));
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(serverId);

    this.db.prepare(`UPDATE dev_mcp_servers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return true;
  }

  deleteMCPServer(serverId) {
    this.db.prepare('DELETE FROM dev_mcp_servers WHERE id = ?').run(serverId);
  }

  pingMCPServer(serverId) {
    this.db.prepare('UPDATE dev_mcp_servers SET last_ping_at = CURRENT_TIMESTAMP WHERE id = ?').run(serverId);
  }

  // --- UI Layout Management ---

  saveUILayout(appId, layout) {
    const id = `layout_${crypto.randomBytes(8).toString('hex')}`;
    const layoutJson = JSON.stringify(layout);

    this.db.prepare(`
      INSERT INTO dev_ui_layouts (id, app_id, layout)
      VALUES (?, ?, ?)
      ON CONFLICT(app_id) DO UPDATE SET
        layout = excluded.layout,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, appId, layoutJson);
  }

  getUILayout(appId) {
    const result = this.db.prepare('SELECT layout FROM dev_ui_layouts WHERE app_id = ?').get(appId);
    return result ? JSON.parse(result.layout) : null;
  }

  // --- API Logging ---

  logApiRequest(appId, apiKeyId, data) {
    this.db.prepare(`
      INSERT INTO dev_api_logs (app_id, api_key_id, method, path, status_code, response_time_ms, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      appId,
      apiKeyId || null,
      data.method,
      data.path,
      data.statusCode,
      data.responseTimeMs || null,
      data.ipAddress || null,
      data.userAgent || null
    );
  }

  getApiLogs(appId, limit = 100) {
    return this.db.prepare(`
      SELECT method, path, status_code, response_time_ms, created_at
      FROM dev_api_logs
      WHERE app_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(appId, limit);
  }

  getApiStats(appId, since) {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as success_count,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM dev_api_logs
      WHERE app_id = ? AND created_at > ?
    `).get(appId, since);

    return stats;
  }

  // --- Utility Functions ---

  formatRelativeTime(timestamp) {
    const now = Date.now();
    const date = new Date(timestamp).getTime();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

module.exports = DeveloperPortalService;
