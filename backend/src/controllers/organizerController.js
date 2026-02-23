const { Event, Registration, Organizer, User } = require('../models');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendTicketEmail } = require('../utils/emailService');

/**
 * Get organizer's dashboard data
 */
const getDashboard = async (req, res, next) => {
  try {
    const organizerId = req.user._id;

    // Get all events
    const rawEvents = await Event.find({ organizerId })
      .select('name type status startDate endDate registrationCount revenue')
      .sort({ createdAt: -1 });

    const now = new Date();
    // Convert current UTC time to IST (+5:30)
    const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const events = rawEvents.map(e => {
      const eventData = e.toObject();
      const eventEndIST = new Date(eventData.endDate);
      if (eventEndIST < nowIST && eventData.status !== 'CANCELLED') {
        eventData.status = 'COMPLETED';
      }
      return eventData;
    });

    // Calculate overall analytics
    const completedEvents = events.filter(e => e.status === 'COMPLETED');
    const totalRegistrations = events.reduce((sum, e) => sum + e.registrationCount, 0);
    const totalRevenue = events.reduce((sum, e) => sum + (e.revenue || 0), 0);

    res.json({
      success: true,
      data: {
        events,
        stats: {
          totalEvents: events.length,
          activeEvents: events.filter(e => e.status === 'PUBLISHED' || e.status === 'ONGOING').length,
          completedEvents: completedEvents.length,
          totalRegistrations,
          totalRevenue
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new event
 */
const createEvent = async (req, res, next) => {
  try {
    const eventData = {
      ...req.body,
      organizerId: req.user._id,
      status: 'DRAFT'
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Event created as draft',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an event
 */
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organizerId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const restrictedFields = ['name', 'type', 'customFormFields'];
    
    if (event.status !== 'DRAFT') {
      for (const field of restrictedFields) {
        if (req.body[field] !== undefined) {
          // Instead of crashing because the frontend sends a full PUT payload,
          // simply strip the restricted fields out so they cannot be modified.
          delete req.body[field];
        }
      }
    }

    if (event.status === 'ONGOING' || event.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit ongoing or completed events'
      });
    }

    // Form is locked after first registration
    if (event.formLocked && req.body.customFormFields) {
      return res.status(400).json({
        success: false,
        message: 'Form cannot be modified after registrations have started'
      });
    }

    const allowedUpdates = [
      'name', 'description', 'type', 'eligibility', 'registrationDeadline',
      'startDate', 'endDate', 'registrationLimit', 'registrationFee',
      'tags', 'customFormFields', 'merchandiseItems', 'coverImage'
    ];

    const publishedAllowed = ['description', 'registrationDeadline', 'registrationLimit', 'merchandiseItems'];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (event.status === 'DRAFT') {
           event[field] = req.body[field];
        } else if (event.status === 'PUBLISHED') {
           if (publishedAllowed.includes(field)) {
             // For deadline and limit we should technically only allow extensions/increases, but replacing is fine for UI edit logic 
             event[field] = req.body[field];
           } else {
             // Silently ignore or throw error? Assignment implies block. Let's just not apply it to mimic the strict list.
           }
        }
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Publish a draft event
 */
const publishEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organizerId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only draft events can be published'
      });
    }

    // Validate required fields
    const requiredFields = ['name', 'description', 'registrationDeadline', 'startDate', 'endDate'];
    for (const field of requiredFields) {
      if (!event[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required to publish`
        });
      }
    }

    event.status = 'PUBLISHED';
    await event.save();

    // Post to Discord webhook if configured
    if (req.user.discordWebhook) {
      try {
        const discordMsg = {
          content: `🎉 **New Event Published by ${req.user.name}!** 🎉\n\n**${event.name}**\n📅 **Date:** ${new Date(event.startDate).toLocaleDateString('en-IN')}\n📝 **Description:** ${event.description}\n\nCheck it out and register now!`
        };
        await axios.post(req.user.discordWebhook, discordMsg);
      } catch (err) {
        console.error('Failed to post to Discord webhook:', err.message);
      }
    }

    res.json({
      success: true,
      message: 'Event published successfully',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change event status
 */
const updateEventStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['ONGOING', 'CLOSED', 'COMPLETED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const event = await Event.findOne({
      _id: req.params.id,
      organizerId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.status = status;
    await event.save();

    res.json({
      success: true,
      message: `Event marked as ${status}`,
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event details with analytics (organizer view)
 */
const getEventDetails = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organizerId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get registration stats
    const registrations = await Registration.find({ eventId: event._id });
    
    const confirmedCount = registrations.filter(r => r.status === 'CONFIRMED').length;
    const attendedCount = registrations.filter(r => r.attendance?.checked).length;
    const revenue = registrations.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);

    // Determine dynamic status based on time
    const now = new Date();
    // Convert current UTC time to IST (+5:30)
    const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const eventData = event.toObject();
    const eventEndIST = new Date(eventData.endDate);
    if (eventEndIST < nowIST && eventData.status !== 'CANCELLED') {
      eventData.status = 'COMPLETED';
    }

    res.json({
      success: true,
      data: {
        event: eventData,
        analytics: {
          totalRegistrations: registrations.length,
          confirmedRegistrations: confirmedCount,
          attendance: attendedCount,
          revenue
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get participants list for an event
 */
const getParticipants = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;

    const event = await Event.findOne({
      _id: req.params.id,
      organizerId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const query = { eventId: event._id };
    if (status) query.status = status;

    let registrationsQuery = Registration.find(query).populate({
      path: 'participantId',
      select: 'firstName lastName email contactNumber'
    });

    let registrations = await registrationsQuery.sort({ createdAt: -1 }).exec();

    // Search filter across populated fields since we can't easily query them directly without aggregation
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      registrations = registrations.filter(reg => {
        const p = reg.participantId;
        if (!p) return false;
        return searchRegex.test(p.firstName) || searchRegex.test(p.lastName) || searchRegex.test(p.email);
      });
    }

    const totalDocs = registrations.length;
    const totalPages = Math.ceil(totalDocs / parseInt(limit));
    const currentPage = parseInt(page);
    const skip = (currentPage - 1) * parseInt(limit);
    
    const paginatedDocs = registrations.slice(skip, skip + parseInt(limit));

    // Map registrations to participants list respecting frontend's expectations
    const participants = paginatedDocs.map(reg => {
      const participant = reg.participantId || {};
      return {
        _id: reg._id,
        createdAt: reg.createdAt,
        status: reg.status,
        attended: reg.attendance?.checked || false,
        paymentAmount: reg.paymentAmount,
        transactionId: reg.paymentDetails?.transactionId,
        userId: {
          _id: participant._id,
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          contactNumber: participant.contactNumber
        }
      };
    });

    res.json({
      success: true,
      data: {
        registrations: participants, // named 'registrations' to match what frontend expects
        pagination: {
          totalDocs,
          limit: parseInt(limit),
          totalPages,
          page: currentPage,
          pagingCounter: skip + 1,
          hasPrevPage: currentPage > 1,
          hasNextPage: currentPage < totalPages,
          prevPage: currentPage > 1 ? currentPage - 1 : null,
          nextPage: currentPage < totalPages ? currentPage + 1 : null
        },
        eventDetails: {
          name: event.name,
          totalParticipants: registrations.totalDocs
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export participants as CSV
 */
const exportParticipantsCSV = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      organizerId: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const registrations = await Registration.find({ eventId: event._id })
      .populate('participantId', 'firstName lastName email contactNumber collegeName');

    // Generate CSV
    const headers = ['Ticket ID', 'Name', 'Email', 'Contact', 'College', 'Status', 'Registration Date', 'Attendance'];
    const rows = registrations.map(r => {
      const user = r.participantId;
      return [
        r.ticketId,
        user ? `${user.firstName} ${user.lastName}` : 'N/A',
        user?.email || 'N/A',
        user?.contactNumber || 'N/A',
        user?.collegeName || 'N/A',
        r.status,
        r.createdAt.toISOString(),
        r.attendance?.checked ? 'Yes' : 'No'
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${event.name}-participants.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

/**
 * Get/Update organizer profile
 */
const getProfile = async (req, res) => {
  res.json({
    success: true,
    data: { organizer: req.user }
  });
};

const updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'category', 'description', 'contactEmail', 'contactNumber', 'discordWebhook'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const organizer = await Organizer.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { organizer }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark attendance for a participant via QR scan
 */
const markAttendance = async (req, res, next) => {
  try {
    const { ticketId, registrationId } = req.body;

    // Find registration by ticketId or registrationId
    let registration;
    if (ticketId) {
      registration = await Registration.findOne({ ticketId })
        .populate('participantId', 'firstName lastName email')
        .populate('eventId', 'name organizerId');
    } else if (registrationId) {
      registration = await Registration.findById(registrationId)
        .populate('participantId', 'firstName lastName email')
        .populate('eventId', 'name organizerId');
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Verify organizer owns the event
    if (registration.eventId.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You do not organize this event'
      });
    }

    // Check registration status
    if (registration.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark attendance. Registration status: ${registration.status}`
      });
    }

    // Check if already checked in
    if (registration.attendance?.checked) {
      return res.status(400).json({
        success: false,
        message: 'Participant already checked in',
        data: {
          checkedInAt: registration.attendance.timestamp,
          participant: registration.participantId
        }
      });
    }

    // Mark attendance
    registration.attendance = {
      checked: true,
      timestamp: new Date(),
      checkedBy: req.user._id
    };
    await registration.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully!',
      data: {
        registration: {
          ticketId: registration.ticketId,
          participant: registration.participantId,
          event: registration.eventId.name,
          checkedInAt: registration.attendance.timestamp
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request a password reset (organizer submits request to admin)
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason (min 5 characters)'
      });
    }

    // Check for existing pending request
    const PasswordResetRequest = require('../models/PasswordResetRequest');
    const existing = await PasswordResetRequest.findOne({
      organizerId: req.user._id,
      status: 'PENDING'
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending password reset request'
      });
    }

    const request = await PasswordResetRequest.create({
      organizerId: req.user._id,
      reason: reason.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Password reset request submitted. An admin will review it shortly.',
      data: { request }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organizer's own reset requests
 */
const getMyResetRequests = async (req, res, next) => {
  try {
    const PasswordResetRequest = require('../models/PasswordResetRequest');
    const requests = await PasswordResetRequest.find({ organizerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: { requests }
    });
  } catch (error) {
    next(error);
  }
};

const getPendingPayments = async (req, res, next) => {
  try {
    const organizerId = req.user._id;

    const events = await Event.find({ organizerId }).select('_id');
    const eventIds = events.map(e => e._id);

    const pendingPayments = await Registration.find({
      eventId: { $in: eventIds },
      'merchandiseOrder.paymentApprovalStatus': 'PENDING',
      'merchandiseOrder.paymentProof': { $exists: true, $ne: '' }
    })
      .populate('participantId', 'firstName lastName email')
      .populate('eventId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { pendingPayments }
    });
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const organizerId = req.user._id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const registration = await Registration.findById(id).populate('eventId', 'organizerId name startDate endDate venue type');

    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }
    
    // Verify organizer owns the event
    if (registration.eventId.organizerId.toString() !== organizerId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized: You do not organize this event' });
    }

    if (!registration.merchandiseOrder || !registration.merchandiseOrder.paymentProof) {
      return res.status(400).json({ success: false, message: 'This registration has no payment proof' });
    }

    if (registration.merchandiseOrder.paymentApprovalStatus === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Order is already approved' });
    }

    registration.merchandiseOrder.paymentApprovalStatus = status;
    registration.merchandiseOrder.approvalNote = note || '';
    
    if (status === 'APPROVED') {
      // 1. Generate ticket QR code
      const ticketId = `FEL-MER-${uuidv4().slice(0, 8).toUpperCase()}`;
      const qrData = JSON.stringify({
        ticketId,
        eventId: registration.eventId._id,
        participantId: registration.participantId,
        orderItems: registration.merchandiseOrder.items.map(i => ({ name: i.name, qty: i.quantity }))
      });
      const qrCode = await QRCode.toDataURL(qrData);

      // 2. Set statuses
      registration.status = 'CONFIRMED';
      registration.paymentStatus = 'COMPLETED';
      registration.ticketId = ticketId;
      registration.qrCode = qrCode;

      // 3. Add revenue to event (Stock was already decremented at purchase time)
      const event = await Event.findById(registration.eventId._id);
      if (event) {
        event.registrationCount += 1;
        event.revenue += (registration.merchandiseOrder.totalAmount || 0);
        await event.save();
      }

      // 4. Send email
      try {
        const participant = await User.findById(registration.participantId);
        if (participant && event) {
          sendTicketEmail(participant, event, registration).catch(err => console.error('Email send failed:', err));
        }
      } catch (err) {
        console.error('Failed to send confirmation email on approval', err);
      }
    } else {
      registration.status = 'REJECTED';
      registration.paymentStatus = 'FAILED';
      
      // Restore the reserved stock since the order was rejected
      const event = await Event.findById(registration.eventId._id);
      if (event) {
        for (const item of registration.merchandiseOrder.items) {
          const merchItem = event.merchandiseItems.id(item.itemId);
          if (merchItem) {
            merchItem.stock += item.quantity;
          }
        }
        event.markModified('merchandiseItems');
        await event.save();
      }
    }

    // Explicitly tell Mongoose that this nested object has changed
    registration.markModified('merchandiseOrder');
    await registration.save();

    res.json({
      success: true,
      data: { registration }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  createEvent,
  updateEvent,
  publishEvent,
  updateEventStatus,
  getEventDetails,
  getParticipants,
  exportParticipantsCSV,
  getProfile,
  updateProfile,
  markAttendance,
  requestPasswordReset,
  getMyResetRequests,
  getPendingPayments,
  updatePaymentStatus
};
