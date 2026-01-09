"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReservation = createReservation;
exports.getReservation = getReservation;
exports.updateReservationStatus = updateReservationStatus;
exports.cancelReservation = cancelReservation;
exports.listReservations = listReservations;
exports.getTodayReservations = getTodayReservations;
exports.deleteReservation = deleteReservation;
const firebase_1 = require("../config/firebase");
const availability_service_1 = require("./availability.service");
const settings_service_1 = require("./settings.service");
const errors_1 = require("../utils/errors");
const constants_1 = require("../config/constants");
const dates_1 = require("../utils/dates");
/**
 * Create a new reservation
 */
async function createReservation(input) {
    const reservationDate = new Date(input.date);
    // Validate booking window
    if (!(await (0, settings_service_1.isDateWithinBookingWindow)(reservationDate))) {
        throw new errors_1.ValidationError('Date is outside the allowed booking window');
    }
    // Check availability (throws if not available)
    const reservationData = {
        guestName: input.guestName,
        email: input.email,
        phone: input.phone,
        partySize: input.partySize,
        date: reservationDate, // Firestore automatically converts Date to Timestamp
        time: input.time,
        seatingType: input.seatingType,
        status: 'confirmed',
        specialRequests: input.specialRequests,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const reservationId = await (0, availability_service_1.checkAndReserveSlot)(reservationDate, input.time, input.seatingType, input.partySize, reservationData);
    const createdDoc = await firebase_1.db.collection('reservations').doc(reservationId).get();
    const createdData = createdDoc.data();
    return Object.assign(Object.assign({ id: reservationId }, createdData), { createdAt: createdData.createdAt, updatedAt: createdData.updatedAt });
}
/**
 * Get reservation by ID
 */
async function getReservation(reservationId) {
    const doc = await firebase_1.db.collection('reservations').doc(reservationId).get();
    if (!doc.exists) {
        throw new errors_1.NotFoundError('Reservation not found');
    }
    return Object.assign({ id: doc.id }, doc.data());
}
/**
 * Update reservation status
 */
async function updateReservationStatus(reservationId, newStatus, cancellationReason) {
    const reservationRef = firebase_1.db.collection('reservations').doc(reservationId);
    const reservation = await reservationRef.get();
    if (!reservation.exists) {
        throw new errors_1.NotFoundError('Reservation not found');
    }
    const currentData = reservation.data();
    const currentStatus = currentData.status;
    // Validate status transition
    if (!validateStatusTransition(currentStatus, newStatus)) {
        throw new errors_1.ValidationError(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
    const updateData = {
        status: newStatus,
        updatedAt: new Date(),
    };
    if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date();
        if (cancellationReason) {
            updateData.cancellationReason = cancellationReason;
        }
    }
    await reservationRef.update(updateData);
    return getReservation(reservationId);
}
/**
 * Cancel a reservation
 */
async function cancelReservation(reservationId, cancellationReason) {
    const reservation = await getReservation(reservationId);
    // Check if reservation can be cancelled
    if (reservation.status === 'cancelled') {
        throw new errors_1.ValidationError('Reservation is already cancelled');
    }
    if (reservation.status === 'completed' || reservation.status === 'no-show') {
        throw new errors_1.ValidationError(`Cannot cancel a reservation with status: ${reservation.status}`);
    }
    // Check cancellation window
    const reservationDateTime = reservation.date.toDate();
    const hoursUntilReservation = (0, dates_1.getHoursBetween)(new Date(), reservationDateTime);
    const cancellationWindow = await (0, settings_service_1.getCancellationWindow)();
    if (hoursUntilReservation < cancellationWindow) {
        throw new errors_1.PreconditionFailedError(`Reservations must be cancelled at least ${cancellationWindow} hours in advance. ` +
            `This reservation is in ${Math.floor(hoursUntilReservation)} hours.`);
    }
    return updateReservationStatus(reservationId, 'cancelled', cancellationReason);
}
/**
 * List reservations with filters
 */
async function listReservations(filters) {
    let query = firebase_1.db.collection('reservations').orderBy('date', 'desc');
    if (filters === null || filters === void 0 ? void 0 : filters.status) {
        query = query.where('status', '==', filters.status);
    }
    if (filters === null || filters === void 0 ? void 0 : filters.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        query = query
            .where('date', '>=', startOfDay)
            .where('date', '<=', endOfDay);
    }
    if (filters === null || filters === void 0 ? void 0 : filters.email) {
        query = query.where('email', '==', filters.email);
    }
    if (filters === null || filters === void 0 ? void 0 : filters.seatingType) {
        query = query.where('seatingType', '==', filters.seatingType);
    }
    const limit = (filters === null || filters === void 0 ? void 0 : filters.limit) || 50;
    const offset = (filters === null || filters === void 0 ? void 0 : filters.offset) || 0;
    query = query.limit(limit).offset(offset);
    const snapshot = await query.get();
    const reservations = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    return {
        reservations,
        total: snapshot.size,
    };
}
/**
 * Get today's reservations
 */
async function getTodayReservations() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const snapshot = await firebase_1.db.collection('reservations')
        .where('date', '>=', today)
        .where('date', '<', tomorrow)
        .where('status', 'in', ['confirmed', 'seated'])
        .orderBy('date')
        .orderBy('time')
        .get();
    return snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
}
/**
 * Validate status transition
 */
function validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = constants_1.ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
}
/**
 * Delete a reservation (admin only)
 */
async function deleteReservation(reservationId) {
    const reservationRef = firebase_1.db.collection('reservations').doc(reservationId);
    const reservation = await reservationRef.get();
    if (!reservation.exists) {
        throw new errors_1.NotFoundError('Reservation not found');
    }
    await reservationRef.delete();
}
//# sourceMappingURL=reservation.service.js.map