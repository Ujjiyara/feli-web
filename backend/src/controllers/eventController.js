const { Event, Registration } = require('../models');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendTicketEmail } = require('../utils/emailService');

/**
 * Get all events with search, filter, pagination
 */
const getAllEvents = async (req, res, next) => {
  try {
    const { 
      search, 
      type, 
      eligibility, 
      startDate, 
      endDate,
      dateFrom,
      dateTo,
      organizerId,
      followedOnly,
      status = 'PUBLISHED',
      page = 1, 
      limit = 100 
    } = req.query;

    const query = {};
    
    // Default to published events for public view
    query.status = { $in: ['PUBLISHED', 'ONGOING'] };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (type) query.type = type;
    if (eligibility) query.eligibility = eligibility;
    if (organizerId) query.organizerId = organizerId;

    // Date range filter (support both naming conventions)
    const fromDate = dateFrom || startDate;
    const toDate = dateTo || endDate;
    if (fromDate || toDate) {
      query.startDate = {};
      if (fromDate) query.startDate.$gte = new Date(fromDate);
      if (toDate) query.startDate.$lte = new Date(toDate);
    }

    // Followed clubs only filter
    if (followedOnly === 'true' && req.user) {
      try {
        const user = await User.findById(req.user._id).select('followedOrganizers');
        if (user && user.followedOrganizers?.length > 0) {
          query.organizerId = { $in: user.followedOrganizers };
        } else {
          // No followed organizers, return empty
          return res.json({ success: true, data: { events: [], pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 } } });
        }
      } catch (e) {
        // Ignore and show all events
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find(query)
      .populate('organizerId', 'name category')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(query);

    const now = new Date();
    // Convert current UTC time to IST (+5:30)
    const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const processedEvents = events.map(e => {
      const eventData = e.toObject();
      // Ensure we treat the stored UTC endDate as if it was meant to be the IST limit
      const eventEndIST = new Date(eventData.endDate);
      if (eventEndIST < nowIST && eventData.status !== 'CANCELLED') {
        eventData.status = 'COMPLETED';
      }
      return eventData;
    });

    res.json({
      success: true,
      data: {
        events: processedEvents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending events (top 5 in last 24h by registrations)
 */
const getTrendingEvents = async (req, res, next) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Get events with registrations in the last 24h
    const trendingRegistrations = await Registration.aggregate([
      {
        $match: {
          createdAt: { $gte: oneDayAgo },
          status: 'CONFIRMED'
        }
      },
      {
        $group: {
          _id: '$eventId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    let eventIds = trendingRegistrations.map(r => r._id);
    
    // 2. If we have less than 5 trending events, pad with the most popular overall events
    if (eventIds.length < 5) {
      const fallbackEvents = await Event.find({
        _id: { $nin: eventIds },
        status: { $in: ['PUBLISHED', 'ONGOING'] }
      })
      .sort({ registrationCount: -1, viewCount: -1 })
      .limit(5 - eventIds.length)
      .select('_id');
      
      eventIds = [...eventIds, ...fallbackEvents.map(e => e._id)];
    }
    
    // 3. Fetch the full event documents
    const events = await Event.find({
      _id: { $in: eventIds },
      status: { $in: ['PUBLISHED', 'ONGOING'] }
    }).populate('organizerId', 'name');

    // Sort by our computed trending order and process status
    const now = new Date();
    // Convert current UTC time to IST (+5:30)
    const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const sortedEvents = eventIds.map(id => {
      const e = events.find(ev => ev._id.toString() === id.toString());
      if (!e) return null;
      
      const eventData = e.toObject();
      const eventEndIST = new Date(eventData.endDate);
      if (eventEndIST < nowIST && eventData.status !== 'CANCELLED') {
        eventData.status = 'COMPLETED';
      }
      return eventData;
    }).filter(Boolean);

    res.json({
      success: true,
      data: { events: sortedEvents }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single event details
 */
const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name category description contactEmail');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment view count
    event.viewCount += 1;
    await event.save();

    // Check if user is registered (if authenticated)
    let registration = null;
    if (req.user && req.userRole === 'participant') {
      registration = await Registration.findOne({
        eventId: event._id,
        participantId: req.user._id
      }).select('ticketId status');
    }

    // Determine dynamic status based on time (IST adjustment)
    const now = new Date();
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
        isRegistered: !!registration,
        registration
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register for an event (Normal type)
 */
const registerForEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Validation checks
    if (event.status !== 'PUBLISHED' && event.status !== 'ONGOING') {
      return res.status(400).json({
        success: false,
        message: 'Event is not open for registration'
      });
    }

    if (new Date() > event.registrationDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    if (event.registrationLimit > 0 && event.registrationCount >= event.registrationLimit) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Check eligibility
    if (event.eligibility === 'IIIT_ONLY' && req.user.participantType !== 'IIIT') {
      return res.status(403).json({
        success: false,
        message: 'This event is only for IIIT students'
      });
    }

    if (event.eligibility === 'NON_IIIT_ONLY' && req.user.participantType !== 'NON_IIIT') {
      return res.status(403).json({
        success: false,
        message: 'This event is only for non-IIIT participants'
      });
    }

    // Check for existing registration
    const existingReg = await Registration.findOne({
      eventId: event._id,
      participantId: req.user._id
    });

    if (existingReg) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    // Generate ticket ID and QR code
    const ticketId = `FEL-${event.type.slice(0, 3)}-${uuidv4().slice(0, 8).toUpperCase()}`;
    
    const qrData = JSON.stringify({
      ticketId,
      eventId: event._id,
      participantId: req.user._id,
      eventName: event.name
    });
    
    const qrCode = await QRCode.toDataURL(qrData);

    // Create registration
    const registration = await Registration.create({
      eventId: event._id,
      participantId: req.user._id,
      ticketId,
      qrCode,
      status: 'CONFIRMED',
      formResponses: req.body.formResponses || {},
      paymentStatus: event.registrationFee > 0 ? 'PENDING' : 'NOT_REQUIRED',
      paymentAmount: event.registrationFee
    });

    // Update event registration count
    event.registrationCount += 1;
    if (!event.formLocked && event.registrationCount > 0) {
      event.formLocked = true;
    }
    await event.save();

    // Send confirmation email (non-blocking)
    try {
      const participant = await User.findById(req.user._id);
      if (participant) {
        sendTicketEmail(participant, event, registration).catch(err => console.error('Email send failed:', err));
      }
    } catch (emailErr) {
      console.error('Email lookup failed:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        registration: {
          id: registration._id,
          ticketId: registration.ticketId,
          qrCode: registration.qrCode,
          status: registration.status,
          formResponses: registration.formResponses
        }
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }
    next(error);
  }
};

/**
 * Purchase merchandise
 */
const purchaseMerchandise = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event || event.type !== 'MERCHANDISE') {
      return res.status(404).json({
        success: false,
        message: 'Merchandise event not found'
      });
    }

    const { items } = req.body; // Array of { itemId, quantity }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select items to purchase'
      });
    }

    // Validate items and calculate total
    let totalAmount = event.registrationFee || 0; // Include base event registration fee
    const orderItems = [];

    for (const item of items) {
      const merchItem = event.merchandiseItems.id(item.itemId);
      
      if (!merchItem) {
        return res.status(400).json({
          success: false,
          message: `Item not found: ${item.itemId}`
        });
      }

      if (merchItem.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${merchItem.name}`
        });
      }

      if (item.quantity > merchItem.purchaseLimit) {
        return res.status(400).json({
          success: false,
          message: `Cannot purchase more than ${merchItem.purchaseLimit} of ${merchItem.name}`
        });
      }

      orderItems.push({
        itemId: merchItem._id,
        name: merchItem.name,
        size: merchItem.size,
        color: merchItem.color,
        quantity: item.quantity,
        price: merchItem.price
      });

      totalAmount += merchItem.price * item.quantity;
    }

    // Decrement stock immediately (reservation)
    for (const item of items) {
      const merchItem = event.merchandiseItems.id(item.itemId);
      merchItem.stock -= item.quantity;
    }
    event.markModified('merchandiseItems');
    await event.save();

    // Create registration with order in PENDING state
    // QR code, ticketId, and email will be generated upon Organizer payment approval
    const registration = await Registration.create({
      eventId: event._id,
      participantId: req.user._id,
      ticketId: 'PENDING_APPROVAL',
      qrCode: '',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentAmount: totalAmount,
      merchandiseOrder: {
        items: orderItems,
        totalAmount,
        paymentApprovalStatus: 'PENDING'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order placed. Awaiting organizer payment approval.',
      data: {
        registration: {
          id: registration._id,
          status: 'PENDING',
          order: registration.merchandiseOrder
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel registration
 */
const cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.id,
      participantId: req.user._id
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Registration is already cancelled'
      });
    }

    registration.status = 'CANCELLED';
    await registration.save();

    // Update event count
    await Event.findByIdAndUpdate(registration.eventId, {
      $inc: { registrationCount: -1 }
    });

    res.json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEvents,
  getTrendingEvents,
  getEventById,
  registerForEvent,
  purchaseMerchandise,
  cancelRegistration
};
