const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require admin auth
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Organizer management
router.get('/organizers', adminController.getAllOrganizers);
router.post('/organizers', adminController.createOrganizer);
router.patch('/organizers/:id/toggle-status', adminController.toggleOrganizerStatus);
router.delete('/organizers/:id', adminController.deleteOrganizer);
router.post('/organizers/:id/reset-password', adminController.resetOrganizerPassword);



// Password reset request management
router.get('/password-reset-requests', adminController.getPasswordResetRequests);
router.post('/password-reset-requests/:id', adminController.processPasswordResetRequest);

module.exports = router;
