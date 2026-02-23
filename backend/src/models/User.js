const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  participantType: {
    type: String,
    enum: ['IIIT', 'NON_IIIT'],
    required: true
  },
  collegeName: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  interests: [{
    type: String
  }],
  followedOrganizers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer'
  }],
  role: {
    type: String,
    default: 'participant',
    enum: ['participant']
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Validate IIIT email
userSchema.statics.isIIITEmail = function(email) {
  // Match emails like @iiit.ac.in, @students.iiit.ac.in, @research.iiit.ac.in
  return /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]*\.)?iiit\.ac\.in$/.test(email);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
