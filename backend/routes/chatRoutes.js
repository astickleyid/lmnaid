const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/message', (req, res, next) => chatController.sendMessage(req, res, next));
router.get('/history/:channelId', (req, res, next) => chatController.getHistory(req, res, next));
router.put('/message/:messageId', (req, res, next) => chatController.editMessage(req, res, next));
router.delete('/message/:messageId', (req, res, next) => chatController.deleteMessage(req, res, next));
router.get('/search', (req, res, next) => chatController.searchMessages(req, res, next));

module.exports = router;
