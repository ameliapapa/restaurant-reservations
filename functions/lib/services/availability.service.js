"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSlotAvailability = calculateSlotAvailability;
exports.checkSlotAvailability = checkSlotAvailability;
exports.getDailyAvailability = getDailyAvailability;
exports.checkAndReserveSlot = checkAndReserveSlot;
exports.getAvailableTimeSlotsForParty = getAvailableTimeSlotsForParty;
exports.hasAvailability = hasAvailability;
const firebase_1 = require("../config/firebase");
const settings_service_1 = require("./settings.service");
const dates_1 = require("../utils/dates");
const errors_1 = require("../utils/errors");
/**
 * Calculate availability for a specific time slot
 */
async function calculateSlotAvailability(date, time, seatingType) {
    const totalCapacity = await (0, settings_service_1.getCapacity)(seatingType);
    // Query all active reservations for this slot
    // Firestore automatically converts Date objects to Timestamps in queries
    const startOfDay = (0, dates_1.getStartOfDay)(date);
    const endOfDay = (0, dates_1.getEndOfDay)(date);
    const reservationsSnapshot = await firebase_1.db.collection('reservations')
        .where('date', '>=', startOfDay)
        .where('date', '<=', endOfDay)
        .where('time', '==', time)
        .where('seatingType', '==', seatingType)
        .where('status', 'in', ['confirmed', 'pending', 'seated'])
        .get();
    // Sum up party sizes to get booked count
    const bookedCount = reservationsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().partySize || 0), 0);
    const remainingCapacity = Math.max(0, totalCapacity - bookedCount);
    return {
        available: remainingCapacity > 0,
        remainingCapacity,
        totalCapacity,
        bookedCount,
    };
}
/**
 * Check if a specific slot can accommodate a party size
 */
async function checkSlotAvailability(date, time, seatingType, partySize) {
    const availability = await calculateSlotAvailability(date, time, seatingType);
    return Object.assign(Object.assign({}, availability), { canAccommodate: availability.remainingCapacity >= partySize });
}
/**
 * Get availability for all slots on a specific date
 */
async function getDailyAvailability(date) {
    const dateKey = (0, dates_1.formatDateKey)(date);
    // Check if date is blocked
    const blockedDoc = await firebase_1.db.collection('blocked-dates').doc(dateKey).get();
    if (blockedDoc.exists) {
        const blockedData = blockedDoc.data();
        return {
            date: date.toISOString(),
            timeSlots: [],
            isBlocked: true,
            notes: blockedData === null || blockedData === void 0 ? void 0 : blockedData.reason,
        };
    }
    // Get settings for time slots
    const settings = await (0, settings_service_1.getSettings)();
    // Calculate availability for each time slot
    const timeSlots = await Promise.all(settings.timeSlots.map(async (time) => {
        const [indoorAvailability, balconyAvailability] = await Promise.all([
            calculateSlotAvailability(date, time, 'indoor'),
            calculateSlotAvailability(date, time, 'balcony'),
        ]);
        return {
            time,
            availableIndoor: indoorAvailability.remainingCapacity,
            availableBalcony: balconyAvailability.remainingCapacity,
            isAvailable: indoorAvailability.remainingCapacity > 0 || balconyAvailability.remainingCapacity > 0,
        };
    }));
    return {
        date: date.toISOString(),
        timeSlots,
        isBlocked: false,
    };
}
/**
 * Transaction-safe availability check and reservation (prevents double-booking)
 */
async function checkAndReserveSlot(date, time, seatingType, partySize, reservationData) {
    const slotLockRef = firebase_1.db.collection('slot-locks').doc(`${(0, dates_1.formatDateKey)(date)}_${time}_${seatingType}`);
    const reservationRef = firebase_1.db.collection('reservations').doc();
    await firebase_1.db.runTransaction(async (transaction) => {
        // Read slot lock first so concurrent writes force a retry
        await transaction.get(slotLockRef);
        const totalCapacity = await (0, settings_service_1.getCapacity)(seatingType);
        const startOfDay = (0, dates_1.getStartOfDay)(date);
        const endOfDay = (0, dates_1.getEndOfDay)(date);
        const reservationsQuery = firebase_1.db.collection('reservations')
            .where('date', '>=', startOfDay)
            .where('date', '<=', endOfDay)
            .where('time', '==', time)
            .where('seatingType', '==', seatingType)
            .where('status', 'in', ['confirmed', 'pending', 'seated']);
        const reservationsSnapshot = await transaction.get(reservationsQuery);
        const bookedCount = reservationsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().partySize || 0), 0);
        const remainingCapacity = totalCapacity - bookedCount;
        if (remainingCapacity < partySize) {
            throw new errors_1.ResourceExhaustedError(`This time slot is fully booked. Only ${Math.max(0, remainingCapacity)} seats remaining.`);
        }
        transaction.set(reservationRef, reservationData);
        transaction.set(slotLockRef, {
            lastReservationId: reservationRef.id,
            lastReservationAt: firebase_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    return reservationRef.id;
}
/**
 * Get available time slots for a date and party size
 */
async function getAvailableTimeSlotsForParty(date, partySize, preferredSeatingType) {
    const dailyAvailability = await getDailyAvailability(date);
    if (dailyAvailability.isBlocked) {
        return { indoor: [], balcony: [] };
    }
    const indoorSlots = [];
    const balconySlots = [];
    for (const slot of dailyAvailability.timeSlots) {
        if (slot.availableIndoor >= partySize) {
            indoorSlots.push(slot.time);
        }
        if (slot.availableBalcony >= partySize) {
            balconySlots.push(slot.time);
        }
    }
    return { indoor: indoorSlots, balcony: balconySlots };
}
/**
 * Check if any slots are available for a date
 */
async function hasAvailability(date) {
    const dailyAvailability = await getDailyAvailability(date);
    if (dailyAvailability.isBlocked) {
        return false;
    }
    return dailyAvailability.timeSlots.some((slot) => slot.isAvailable);
}
//# sourceMappingURL=availability.service.js.map