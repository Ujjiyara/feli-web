const jwt = require('jsonwebtoken');
const { User, Organizer, Admin } = require('../models');

/**
 * Generate JWT token
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Register a new participant
 */
const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, participantType, collegeName, contactNumber } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !participantType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const normalizedType = participantType.toUpperCase().replace('-', '_');

    // Validate IIIT email for IIIT participants
    if (normalizedType === 'IIIT') {
      if (!User.isIIITEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'IIIT participants must use an IIIT email address (e.g., @iiit.ac.in)'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      participantType: normalizedType,
      collegeName: normalizedType === 'NON_IIIT' ? collegeName : 'IIIT Hyderabad',
      contactNumber
    });

    // Generate token
    const token = generateToken(user._id, 'participant');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          participantType: user.participantType,
          onboardingCompleted: user.onboardingCompleted,
          role: 'participant'
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Login for all user types
 */
const login = async (req, res, next) => {
  try {
    const { email, password, role = 'participant' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    let user;
    let Model;

    // Select model based on role
    switch (role) {
      case 'participant':
        Model = User;
        break;
      case 'organizer':
        Model = Organizer;
        break;
      case 'admin':
        Model = Admin;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified'
        });
    }

    // Find user
    user = await Model.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if organizer is active
    if (role === 'organizer' && !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been disabled. Contact admin.'
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id, role);

    // Response based on role
    const userData = {
      id: user._id,
      email: user.email,
      role
    };

    if (role === 'participant') {
      userData.firstName = user.firstName;
      userData.lastName = user.lastName;
      userData.participantType = user.participantType;
      userData.onboardingCompleted = user.onboardingCompleted;
    } else if (role === 'organizer') {
      userData.name = user.name;
      userData.category = user.category;
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      role: req.userRole
    }
  });
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      });
    }

    // Get user with password
    let Model;
    switch (req.userRole) {
      case 'participant':
        Model = User;
        break;
      case 'organizer':
        Model = Organizer;
        break;
      case 'admin':
        Model = Admin;
        break;
    }

    const user = await Model.findById(req.user._id);
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout (client-side token removal)
 */
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  logout
};
