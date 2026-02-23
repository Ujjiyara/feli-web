const express = require('express');
const router = express.Router();
const organizerController = require('../controllers/organizerController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require organizer auth
router.use(authenticate, authorize('organizer'));

// Dashboard
router.get('/dashboard', organizerController.getDashboard);

// Events
router.post('/events', organizerController.createEvent);
router.get('/events/:id', organizerController.getEventDetails);
router.put('/events/:id', organizerController.updateEvent);
router.post('/events/:id/publish', organizerController.publishEvent);
router.patch('/events/:id/status', organizerController.updateEventStatus);

// Participants
router.get('/events/:id/participants', organizerController.getParticipants);
router.get('/events/:id/export-csv', organizerController.exportParticipantsCSV);

// Profile
router.get('/profile', organizerController.getProfile);
router.put('/profile', organizerController.updateProfile);

// Attendance
router.post('/attendance/mark', organizerController.markAttendance);

// Password reset requests
router.post('/password-reset/request', organizerController.requestPasswordReset);
router.get('/password-reset/my-requests', organizerController.getMyResetRequests);

// Payment approval management
router.get('/payments/pending', organizerController.getPendingPayments);
router.patch('/payments/:id/approve', (req, res, next) => {
  req.body.status = 'APPROVED';
  organizerController.updatePaymentStatus(req, res, next);
});
router.patch('/payments/:id/reject', (req, res, next) => {
  req.body.status = 'REJECTED';
  organizerController.updatePaymentStatus(req, res, next);
});

module.exports = router;
