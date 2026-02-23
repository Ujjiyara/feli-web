const { Organizer, Admin, Registration, Event } = require('../models');
const crypto = require('crypto');

/**
 * Generate random password
 */
const generatePassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

/**
 * Get all organizers
 */
const getAllOrganizers = async (req, res, next) => {
  try {
    const organizers = await Organizer.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { organizers }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new organizer (auto-generate credentials)
 */
const createOrganizer = async (req, res, next) => {
  try {
    const { name, category, description, contactEmail, contactNumber } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required'
      });
    }

    // Generate email and password
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@clubs.felicity.iiit.ac.in`;
    const password = generatePassword();

    // Check if email already exists
    const existing = await Organizer.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An organizer with this email already exists'
      });
    }

    const organizer = await Organizer.create({
      name,
      email,
      password,
      category,
      description,
      contactEmail: contactEmail || email,
      contactNumber
    });

    res.status(201).json({
      success: true,
      message: 'Organizer created successfully',
      data: {
        organizer: {
          id: organizer._id,
          name: organizer.name,
          email: organizer.email,
          category: organizer.category
        },
        credentials: {
          email,
          password // Send to admin to share with organizer
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disable/Enable organizer account
 */
const toggleOrganizerStatus = async (req, res, next) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    organizer.isActive = !organizer.isActive;
    await organizer.save();

    res.json({
      success: true,
      message: `Organizer ${organizer.isActive ? 'enabled' : 'disabled'} successfully`,
      data: { organizer: { id: organizer._id, isActive: organizer.isActive } }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete organizer (permanent)
 */
const deleteOrganizer = async (req, res, next) => {
  try {
    const organizer = await Organizer.findByIdAndDelete(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    res.json({
      success: true,
      message: 'Organizer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset organizer password (by admin)
 */
const resetOrganizerPassword = async (req, res, next) => {
  try {
    const { newPassword: customPassword } = req.body;
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    const newPassword = customPassword || generatePassword();
    organizer.password = newPassword;
    await organizer.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        credentials: {
          email: organizer.email,
          password: newPassword
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin dashboard stats
 */
const getDashboard = async (req, res, next) => {
  try {
    const organizerCount = await Organizer.countDocuments();
    const activeOrganizerCount = await Organizer.countDocuments({ isActive: true });
    
    // Fetch Event stats
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ status: { $in: ['PUBLISHED', 'ONGOING'] } });
    
    // Fetch Participant stats
    const User = require('../models/User'); // Required for participant count
    const totalParticipants = await User.countDocuments({ role: 'participant' });

    res.json({
      success: true,
      data: {
        stats: {
          totalOrganizers: organizerCount,
          activeOrganizers: activeOrganizerCount,
          disabledOrganizers: organizerCount - activeOrganizerCount,
          totalEvents,
          activeEvents,
          totalParticipants
        }
      }
    });
  } catch (error) {
    next(error);
  }
};



/**
 * Get all pending password reset requests
 */
const getPasswordResetRequests = async (req, res, next) => {
  try {
    const PasswordResetRequest = require('../models/PasswordResetRequest');
    const requests = await PasswordResetRequest.find({})
      .populate('organizerId', 'name email category')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process a password reset request (approve/reject)
 */
const processPasswordResetRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, adminNote, newPassword: customPassword } = req.body; // action: 'approve' or 'reject'

    const PasswordResetRequest = require('../models/PasswordResetRequest');
    const request = await PasswordResetRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }

    if (action === 'approve') {
      // Use custom password or generate a new one
      const newPassword = customPassword || generatePassword();
      const organizer = await Organizer.findById(request.organizerId);
      
      if (!organizer) {
        return res.status(404).json({
          success: false,
          message: 'Organizer not found'
        });
      }

      organizer.password = newPassword;
      await organizer.save();

      request.status = 'APPROVED';
      request.newPassword = newPassword;
      request.adminNote = adminNote || '';
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save();

      res.json({
        success: true,
        message: 'Password reset approved',
        data: {
          credentials: {
            email: organizer.email,
            password: newPassword
          }
        }
      });
    } else if (action === 'reject') {
      request.status = 'REJECTED';
      request.adminNote = adminNote || 'Request rejected by admin';
      request.processedBy = req.user._id;
      request.processedAt = new Date();
      await request.save();

      res.json({
        success: true,
        message: 'Password reset request rejected'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOrganizers,
  createOrganizer,
  toggleOrganizerStatus,
  deleteOrganizer,
  resetOrganizerPassword,
  getDashboard,

  getPasswordResetRequests,
  processPasswordResetRequest
};
