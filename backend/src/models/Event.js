const mongoose = require('mongoose');

const customFormFieldSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true
  },
  fieldType: {
    type: String,
    enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number', 'email', 'date'],
    required: true
  },
  options: [String], // For dropdown, radio, checkbox
  required: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
});

const merchandiseItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  size: String,
  color: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseLimit: {
    type: Number,
    default: 1,
    min: 1
  },
  imageUrl: String
});

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Event description is required']
  },
  type: {
    type: String,
    enum: ['NORMAL', 'MERCHANDISE'],
    required: true
  },
  eligibility: {
    type: String,
    enum: ['ALL', 'IIIT_ONLY', 'NON_IIIT_ONLY'],
    default: 'ALL'
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  registrationLimit: {
    type: Number,
    default: 0 // 0 means unlimited
  },
  registrationFee: {
    type: Number,
    default: 0
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ONGOING', 'CLOSED', 'COMPLETED'],
    default: 'DRAFT'
  },
  // For Normal events - custom form fields
  customFormFields: [customFormFieldSchema],
  formLocked: {
    type: Boolean,
    default: false
  },
  // For Merchandise events
  merchandiseItems: [merchandiseItemSchema],
  // Analytics
  registrationCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  // Cover image
  coverImage: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if registration is open
eventSchema.virtual('isRegistrationOpen').get(function() {
  const now = new Date();
  const isBeforeDeadline = now < this.registrationDeadline;
  const isNotFull = this.registrationLimit === 0 || this.registrationCount < this.registrationLimit;
  const isPublished = this.status === 'PUBLISHED' || this.status === 'ONGOING';
  
  return isBeforeDeadline && isNotFull && isPublished;
});

// Index for search
eventSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Index for filtering
eventSchema.index({ status: 1, organizerId: 1, type: 1, startDate: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
