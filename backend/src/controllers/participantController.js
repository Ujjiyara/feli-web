const { User, Event, Registration, Organizer } = require('../models');

/**
 * Get participant profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followedOrganizers', 'name category');
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update participant profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = ['firstName', 'lastName', 'contactNumber', 'collegeName', 'interests', 'followedOrganizers'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete onboarding with preferences
 */
const completeOnboarding = async (req, res, next) => {
  try {
    const { interests, followedOrganizers } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        interests: interests || [],
        followedOrganizers: followedOrganizers || [],
        onboardingCompleted: true
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Onboarding completed',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get participant's registered events
 */
const getMyEvents = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    
    const query = { participantId: req.user._id };
    if (status) query.status = status;

    const registrations = await Registration.find(query)
      .populate({
        path: 'eventId',
        select: 'name type organizerId startDate endDate status',
        populate: { path: 'organizerId', select: 'name' }
      })
      .sort({ createdAt: -1 });

    // Categorize events using IST threshold
    const now = new Date();
    const nowIST = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const upcoming = [];
    const completed = [];
    const cancelled = [];

    registrations.forEach(reg => {
      if (!reg.eventId) return;
      
      const event = reg.eventId;
      const eventEndIST = new Date(event.endDate);
      const isCompletedEvent = event.status === 'COMPLETED' || eventEndIST < nowIST;
      
      const regData = {
        registrationId: reg._id,
        ticketId: reg.ticketId,
        status: reg.status,
        event: {
          id: event._id,
          name: event.name,
          type: event.type,
          organizer: event.organizerId?.name,
          startDate: event.startDate,
          endDate: event.endDate,
          status: isCompletedEvent && event.status !== 'CANCELLED' ? 'COMPLETED' : event.status
        }
      };

      if (reg.status === 'CANCELLED' || reg.status === 'REJECTED') {
        cancelled.push(regData);
      } else if (reg.status === 'ATTENDED' || eventEndIST < nowIST || event.status === 'COMPLETED') {
        completed.push(regData);
      } else {
        upcoming.push(regData);
      }
    });

    res.json({
      success: true,
      data: { upcoming, completed, cancelled }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all organizers
 */
const getOrganizers = async (req, res, next) => {
  try {
    const organizers = await Organizer.find({ isActive: true })
      .select('name category description contactEmail');

    // Add follow status if user is authenticated
    let organizersWithStatus = organizers.map(org => ({
      ...org.toObject(),
      isFollowed: req.user?.followedOrganizers?.includes(org._id) || false
    }));

    res.json({
      success: true,
      data: { organizers: organizersWithStatus }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single organizer details
 */
const getOrganizerById = async (req, res, next) => {
  try {
    const organizer = await Organizer.findById(req.params.id)
      .select('name category description contactEmail isActive');

    if (!organizer || organizer.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    // Get upcoming and past events
    const now = new Date();
    const upcomingEvents = await Event.find({
      organizerId: organizer._id,
      status: { $in: ['PUBLISHED', 'ONGOING'] },
      startDate: { $gte: now }
    }).select('name type startDate registrationFee').limit(10);

    const pastEvents = await Event.find({
      organizerId: organizer._id,
      status: 'COMPLETED'
    }).select('name type startDate').limit(10).sort({ endDate: -1 });

    const isFollowed = req.user?.followedOrganizers?.includes(organizer._id) || false;

    res.json({
      success: true,
      data: {
        organizer: { ...organizer.toObject(), isFollowed },
        upcomingEvents,
        pastEvents
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Follow/Unfollow an organizer
 */
const toggleFollowOrganizer = async (req, res, next) => {
  try {
    const organizerId = req.params.id;
    
    const organizer = await Organizer.findById(organizerId);
    if (!organizer || !organizer.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found'
      });
    }

    const user = await User.findById(req.user._id);
    const isFollowing = user.followedOrganizers.includes(organizerId);

    if (isFollowing) {
      user.followedOrganizers = user.followedOrganizers.filter(
        id => id.toString() !== organizerId
      );
    } else {
      user.followedOrganizers.push(organizerId);
    }

    await user.save();

    res.json({
      success: true,
      message: isFollowing ? 'Unfollowed organizer' : 'Following organizer',
      data: { isFollowing: !isFollowing }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ticket details
 */
const getTicket = async (req, res, next) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.id,
      participantId: req.user._id
    })
      .populate('eventId', 'name type startDate endDate venue organizerId')
      .populate('participantId', 'firstName lastName email contact');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Format for frontend
    const ticketData = {
      _id: registration._id,
      ticketId: registration.ticketId,
      status: registration.status,
      attended: registration.attendance,
      qrCode: registration.qrCode,
      event: registration.eventId,
      participant: registration.participantId
    };

    res.json({
      success: true,
      data: ticketData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload payment proof for merchandise order
 */
const uploadPaymentProof = async (req, res, next) => {
  try {
    const { registrationId, paymentProof } = req.body;

    if (!paymentProof) {
      return res.status(400).json({
        success: false,
        message: 'Payment proof is required'
      });
    }

    const registration = await Registration.findOne({
      _id: registrationId,
      participantId: req.user._id
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (!registration.merchandiseOrder) {
      return res.status(400).json({
        success: false,
        message: 'This is not a merchandise order'
      });
    }

    registration.merchandiseOrder.paymentProof = paymentProof;
    registration.merchandiseOrder.paymentApprovalStatus = 'PENDING';
    await registration.save();

    res.json({
      success: true,
      message: 'Payment proof uploaded successfully. Awaiting admin approval.',
      data: { registration }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get recommended events based on user preferences
 * Scoring: +50 for followed organizer, +10 per matching interest tag
 */
const getRecommendedEvents = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('interests followedOrganizers participantType');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const followedIds = (user.followedOrganizers || []).map(id => id.toString());
    const interests = (user.interests || []).map(i => i.toLowerCase());

    // Get all upcoming/ongoing published events
    const now = new Date();
    const events = await Event.find({
      status: { $in: ['PUBLISHED', 'ONGOING'] },
      endDate: { $gte: now }
    })
      .populate('organizerId', 'name category')
      .lean();

    // Score and sort
    const scored = events.map(event => {
      let score = 0;

      // +50 if organizer is followed
      if (event.organizerId && followedIds.includes(event.organizerId._id.toString())) {
        score += 50;
      }

      // +10 per matching tag
      if (event.tags && interests.length > 0) {
        const eventTags = event.tags.map(t => t.toLowerCase());
        interests.forEach(interest => {
          if (eventTags.some(tag => tag.includes(interest) || interest.includes(tag))) {
            score += 10;
          }
        });
      }

      // +5 if organizer category matches any interest
      if (event.organizerId?.category && interests.includes(event.organizerId.category.toLowerCase())) {
        score += 5;
      }

      return { ...event, _recommendScore: score };
    });

    // Sort by score descending, then by startDate ascending as tiebreaker
    scored.sort((a, b) => {
      if (b._recommendScore !== a._recommendScore) return b._recommendScore - a._recommendScore;
      return new Date(a.startDate) - new Date(b.startDate);
    });

    // Return top 10
    const recommended = scored.slice(0, 10);

    res.json({
      success: true,
      data: { events: recommended }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  completeOnboarding,
  getMyEvents,
  getRecommendedEvents,
  getOrganizers,
  getOrganizerById,
  toggleFollowOrganizer,
  getTicket,
  uploadPaymentProof
};
