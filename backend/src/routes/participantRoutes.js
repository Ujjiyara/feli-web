const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Protected routes (participant only)
router.get('/profile', authenticate, authorize('participant'), participantController.getProfile);
router.put('/profile', authenticate, authorize('participant'), participantController.updateProfile);
router.post('/onboarding', authenticate, authorize('participant'), participantController.completeOnboarding);
router.get('/my-events', authenticate, authorize('participant'), participantController.getMyEvents);
router.get('/recommended-events', authenticate, authorize('participant'), participantController.getRecommendedEvents);
router.get('/tickets/:id', authenticate, authorize('participant'), participantController.getTicket);

// Organizer listing (with optional auth for follow status)
router.get('/organizers', optionalAuth, participantController.getOrganizers);
router.get('/organizers/:id', optionalAuth, participantController.getOrganizerById);
router.post('/organizers/:id/follow', authenticate, authorize('participant'), participantController.toggleFollowOrganizer);

// Payment proof upload for merchandise
router.post('/payment-proof', authenticate, authorize('participant'), participantController.uploadPaymentProof);

module.exports = router;
