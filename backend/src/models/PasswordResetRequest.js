const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  adminNote: {
    type: String
  },
  newPassword: {
    type: String // Stored temporarily after approval, cleared after organizer logs in
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  processedAt: {
    type: Date
  }
}, { timestamps: true });

const PasswordResetRequest = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);

module.exports = PasswordResetRequest;
