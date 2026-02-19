const express = require('express');
const router = express.Router();
const memoryController = require('../controllers/memoryController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/context', (req, res, next) => memoryController.getContext(req, res, next));
router.get('/', (req, res, next) => memoryController.listMemories(req, res, next));
router.post('/', (req, res, next) => memoryController.storeMemory(req, res, next));
router.delete('/:key', (req, res, next) => memoryController.deleteMemory(req, res, next));
router.get('/preferences', (req, res, next) => memoryController.getPreferences(req, res, next));
router.put('/preferences', (req, res, next) => memoryController.updatePreferences(req, res, next));

module.exports = router;
