const Notification = require('../models/Notification');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// @desc   Get notifications for current user
// @route  GET /api/v1/notifications
// @access Private
const getNotifications = async (req, res, next) => {
  try {
    const { isRead, page = 1, limit = 20 } = req.query;
    const query = { recipient: req.user._id };
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const skip = (page - 1) * limit;
    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return sendPaginated(res, notifications, page, limit, total);
  } catch (error) {
    next(error);
  }
};

// @desc   Get unread notification count
// @route  GET /api/v1/notifications/unread-count
// @access Private
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });
    return sendSuccess(res, 200, 'Unread count retrieved', { count });
  } catch (error) {
    next(error);
  }
};

// @desc   Mark notification as read
// @route  PATCH /api/v1/notifications/:id/read
// @access Private
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return sendError(res, 404, 'Notification not found.');
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied.');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return sendSuccess(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    next(error);
  }
};

// @desc   Mark all notifications as read
// @route  PATCH /api/v1/notifications/read-all
// @access Private
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return sendSuccess(res, 200, `${result.modifiedCount} notifications marked as read`);
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
