const express = require('express');
const router = express.Router();
const { DiscussionMessage, Event } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');

/**
 * Get messages for an event discussion
 * GET /api/discussions/:eventId/messages
 */
router.get('/:eventId/messages', optionalAuth, async (req, res, next) => {
  try {
    const { before, limit = 50 } = req.query;

    const query = {
      eventId: req.params.eventId,
      isDeleted: false
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await DiscussionMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Post a message to an event discussion
 * POST /api/discussions/:eventId/messages
 */
router.post('/:eventId/messages', authenticate, async (req, res, next) => {
  try {
    const { message, parentId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message too long (max 1000 characters)'
      });
    }

    // Verify event exists
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Determine user info
    const userRole = req.user.role;
    let userName;
    if (userRole === 'organizer') {
      userName = req.user.name;
    } else {
      userName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Anonymous';
    }

    const newMessage = await DiscussionMessage.create({
      eventId: req.params.eventId,
      userId: req.user._id,
      userModel: userRole === 'organizer' ? 'Organizer' : 'User',
      userName,
      userRole,
      message: message.trim(),
      parentId: parentId || null
    });

    res.status(201).json({
      success: true,
      data: { message: newMessage }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a message (only by the author or organizer of the event)
 * DELETE /api/discussions/:eventId/messages/:messageId
 */
router.delete('/:eventId/messages/:messageId', authenticate, async (req, res, next) => {
  try {
    const msg = await DiscussionMessage.findById(req.params.messageId);

    if (!msg) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only author or event organizer can delete
    const event = await Event.findById(req.params.eventId);
    const isAuthor = msg.userId.toString() === req.user._id.toString();
    const isEventOrganizer = event && event.organizerId.toString() === req.user._id.toString();

    if (!isAuthor && !isEventOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this message'
      });
    }

    msg.isDeleted = true;
    await msg.save();

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Toggle pin status of a message (organizer only)
 * PATCH /api/discussions/:eventId/messages/:messageId/pin
 */
router.patch('/:eventId/messages/:messageId/pin', authenticate, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event || event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the event organizer can pin messages'
      });
    }

    const msg = await DiscussionMessage.findById(req.params.messageId);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    msg.isPinned = !msg.isPinned;
    await msg.save();

    res.json({ success: true, data: { message: msg } });
  } catch (error) {
    next(error);
  }
});

/**
 * React to a message
 * POST /api/discussions/:eventId/messages/:messageId/react
 */
router.post('/:eventId/messages/:messageId/react', authenticate, async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, message: 'Emoji is required' });

    const msg = await DiscussionMessage.findById(req.params.messageId);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Determine user info
    const userId = req.user._id;
    const userName = req.user.role === 'organizer' ? req.user.name : `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Anonymous';

    // Check if reacted
    const existingIndex = msg.reactions.findIndex(r => r.userId.toString() === userId.toString() && r.emoji === emoji);

    if (existingIndex > -1) {
      // Remove reaction
      msg.reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      msg.reactions.push({ emoji, userId, userName });
    }

    await msg.save();
    res.json({ success: true, data: { message: msg } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
