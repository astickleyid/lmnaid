const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nxcor-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';
const REFRESH_EXPIRY = '30d';

// In-memory user store for development
const users = new Map();
const usersByEmail = new Map();

function getUserById(id) {
  return users.get(id);
}

function getUserByEmail(email) {
  return usersByEmail.get(email);
}

function createUser(userData) {
  const id = Date.now().toString();
  const user = {
    id,
    email: userData.email,
    username: userData.username,
    password: userData.password,
    avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
    bio: userData.bio || '',
    createdAt: new Date().toISOString(),
  };
  users.set(id, user);
  usersByEmail.set(userData.email, user);
  return user;
}

class AuthController {
  async register(req, res, next) {
    try {
      const { email, username, password } = req.body;
      
      if (!email || !username || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Check if user exists
      const existing = getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = createUser({
        email,
        username,
        password: hashedPassword,
      });
      
      // Generate tokens
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
      
      res.status(201).json({
        user: { id: user.id, email: user.email, username: user.username },
        token,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
  
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const user = getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRY });
      
      res.json({
        user: { id: user.id, email: user.email, username: user.username },
        token,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
  
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }
      
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid token type' });
      }
      
      const token = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
      
      res.json({ token });
    } catch (err) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
  
  async me(req, res, next) {
    try {
      const user = getUserById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        id: user.id, 
        email: user.email, 
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      });
    } catch (err) {
      next(err);
    }
  }
  
  async logout(req, res, next) {
    try {
      // In a production app, you'd invalidate the token here
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }
  
  async getSessions(req, res, next) {
    try {
      // Placeholder for session management
      res.json({ sessions: [] });
    } catch (err) {
      next(err);
    }
  }
  
  async revokeSession(req, res, next) {
    try {
      res.json({ message: 'Session revoked' });
    } catch (err) {
      next(err);
    }
  }
  
  async revokeAllSessions(req, res, next) {
    try {
      res.json({ message: 'All sessions revoked' });
    } catch (err) {
      next(err);
    }
  }
  
  async oauthRedirect(req, res, next) {
    try {
      // OAuth implementation placeholder
      res.status(501).json({ error: 'OAuth not implemented' });
    } catch (err) {
      next(err);
    }
  }
  
  async oauthCallback(req, res, next) {
    try {
      // OAuth callback placeholder
      res.status(501).json({ error: 'OAuth not implemented' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
