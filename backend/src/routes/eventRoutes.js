const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth for registration status)
router.get('/', optionalAuth, eventController.getAllEvents);
router.get('/trending', eventController.getTrendingEvents);
router.get('/:id', optionalAuth, eventController.getEventById);

// Protected routes (participant only)
router.post('/:id/register', authenticate, authorize('participant'), eventController.registerForEvent);
router.post('/:id/purchase', authenticate, authorize('participant'), eventController.purchaseMerchandise);
router.post('/registrations/:id/cancel', authenticate, authorize('participant'), eventController.cancelRegistration);

module.exports = router;
