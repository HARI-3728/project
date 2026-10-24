const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Create a notification for a user.
 * This is the single source of truth for notification creation.
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  refModel = null,
  refId = null,
  priority = 'normal',
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      refModel,
      refId,
      priority,
    });
    return notification;
  } catch (error) {
    // Notification failures must not break the main flow
    logger.error(`Failed to create notification for user ${recipient}: ${error.message}`);
    return null;
  }
};

/**
 * Notify patient of appointment confirmation
 */
const notifyAppointmentConfirmed = (patientId, appointmentId, doctorName, dateStr) =>
  createNotification({
    recipient: patientId,
    type: 'appointment_confirmed',
    title: 'Appointment Confirmed',
    message: `Your appointment with Dr. ${doctorName} on ${dateStr} has been confirmed.`,
    refModel: 'Appointment',
    refId: appointmentId,
  });

/**
 * Notify patient of appointment cancellation
 */
const notifyAppointmentCancelled = (patientId, appointmentId, doctorName, cancelledBy) =>
  createNotification({
    recipient: patientId,
    type: 'appointment_cancelled',
    title: 'Appointment Cancelled',
    message: `Your appointment with Dr. ${doctorName} has been cancelled by ${cancelledBy}.`,
    refModel: 'Appointment',
    refId: appointmentId,
    priority: 'high',
  });

/**
 * Notify doctor of new appointment
 */
const notifyDoctorNewAppointment = (doctorId, appointmentId, patientName, dateStr) =>
  createNotification({
    recipient: doctorId,
    type: 'appointment_upcoming',
    title: 'New Appointment Booked',
    message: `New appointment from ${patientName} on ${dateStr}.`,
    refModel: 'Appointment',
    refId: appointmentId,
  });

/**
 * Notify patient of order status update
 */
const notifyOrderStatusUpdate = (patientId, orderId, orderNumber, newStatus) =>
  createNotification({
    recipient: patientId,
    type: 'order_status_update',
    title: 'Order Status Updated',
    message: `Your order #${orderNumber} status has been updated to: ${newStatus}.`,
    refModel: 'Order',
    refId: orderId,
  });

/**
 * Notify hospital staff of a new order
 */
const notifyHospitalNewOrder = (hospitalUserId, orderId, orderNumber) =>
  createNotification({
    recipient: hospitalUserId,
    type: 'order_new',
    title: 'New Medicine Order',
    message: `A new medicine order #${orderNumber} has been placed and requires review.`,
    refModel: 'Order',
    refId: orderId,
    priority: 'high',
  });

/**
 * Notify patient when a bill is generated
 */
const notifyBillGenerated = (patientId, billId, billNumber, totalAmount) =>
  createNotification({
    recipient: patientId,
    type: 'bill_generated',
    title: 'Bill Generated',
    message: `A bill #${billNumber} for ₹${totalAmount.toFixed(2)} has been generated for you.`,
    refModel: 'Bill',
    refId: billId,
  });

/**
 * Notify patient when prescription is issued
 */
const notifyPrescriptionIssued = (patientId, prescriptionId, doctorName) =>
  createNotification({
    recipient: patientId,
    type: 'prescription_issued',
    title: 'New Prescription',
    message: `Dr. ${doctorName} has issued a new prescription for you.`,
    refModel: 'Prescription',
    refId: prescriptionId,
  });

/**
 * Notify patient when diagnostic booking status changes
 */
const notifyDiagnosticStatus = (patientId, bookingId, serviceName, status) =>
  createNotification({
    recipient: patientId,
    type: 'appointment_upcoming',
    title: 'Diagnostic Test Update',
    message: `Your booking for "${serviceName}" is now: ${status.replace('_', ' ')}.`,
    refModel: 'DiagnosticBooking',
    refId: bookingId,
  });

module.exports = {
  createNotification,
  notifyAppointmentConfirmed,
  notifyAppointmentCancelled,
  notifyDoctorNewAppointment,
  notifyOrderStatusUpdate,
  notifyHospitalNewOrder,
  notifyBillGenerated,
  notifyPrescriptionIssued,
  notifyDiagnosticStatus,
};

