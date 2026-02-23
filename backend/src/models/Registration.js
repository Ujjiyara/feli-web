const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  qrCode: {
    type: String // Base64 encoded QR code image
  },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'REJECTED'],
    default: 'PENDING'
  },
  // Custom form responses
  formResponses: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Payment info
  paymentStatus: {
    type: String,
    enum: ['NOT_REQUIRED', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'NOT_REQUIRED'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  // For merchandise orders
  merchandiseOrder: {
    items: [{
      itemId: mongoose.Schema.Types.ObjectId,
      name: String,
      size: String,
      color: String,
      quantity: Number,
      price: Number
    }],
    totalAmount: {
      type: Number,
      default: 0
    },
    paymentProof: String, // URL to uploaded payment proof image
    paymentApprovalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    approvalNote: String
  },
  // Attendance tracking
  attendance: {
    checked: {
      type: Boolean,
      default: false
    },
    timestamp: Date,
    checkedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organizer'
    }
  },
  // For team events (Advanced feature)
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  isTeamLeader: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate registrations
registrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true });

// Index for querying by participant
registrationSchema.index({ participantId: 1, status: 1 });

// Index for querying by event
registrationSchema.index({ eventId: 1, status: 1 });

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
