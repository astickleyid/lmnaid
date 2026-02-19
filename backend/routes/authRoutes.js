const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));

// OAuth
router.get('/oauth/:provider', (req, res, next) => authController.oauthRedirect(req, res, next));
router.post('/oauth/:provider/callback', (req, res, next) => authController.oauthCallback(req, res, next));

// Protected
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.get('/sessions', authenticate, (req, res, next) => authController.getSessions(req, res, next));
router.delete('/sessions/:sessionId', authenticate, (req, res, next) => authController.revokeSession(req, res, next));
router.delete('/sessions', authenticate, (req, res, next) => authController.revokeAllSessions(req, res, next));

module.exports = router;
