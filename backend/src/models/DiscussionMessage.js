const mongoose = require('mongoose');

const discussionMessageSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userModel: {
    type: String,
    enum: ['User', 'Organizer'],
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['participant', 'organizer'],
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiscussionMessage',
    default: null
  },
  reactions: [{
    emoji: String,
    userId: mongoose.Schema.Types.ObjectId,
    userName: String
  }]
}, { timestamps: true });

// Index for efficient querying
discussionMessageSchema.index({ eventId: 1, createdAt: -1 });

const DiscussionMessage = mongoose.model('DiscussionMessage', discussionMessageSchema);

module.exports = DiscussionMessage;
