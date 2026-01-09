import { db, FieldValue } from '@/config/firebase';
import { AvailabilityResult, DailyAvailability, TimeSlot, SeatingType } from '@/types';
import { getSettings, getCapacity } from './settings.service';
import { getStartOfDay, getEndOfDay, formatDateKey } from '@/utils/dates';
import { ResourceExhaustedError } from '@/utils/errors';

/**
 * Calculate availability for a specific time slot
 */
export async function calculateSlotAvailability(
  date: Date,
  time: string,
  seatingType: SeatingType
): Promise<AvailabilityResult> {
  const totalCapacity = await getCapacity(seatingType);

  // Query all active reservations for this slot
  // Firestore automatically converts Date objects to Timestamps in queries
  const startOfDay = getStartOfDay(date);
  const endOfDay = getEndOfDay(date);

  const reservationsSnapshot = await db.collection('reservations')
    .where('date', '>=', startOfDay)
    .where('date', '<=', endOfDay)
    .where('time', '==', time)
    .where('seatingType', '==', seatingType)
    .where('status', 'in', ['confirmed', 'pending', 'seated'])
    .get();

  // Sum up party sizes to get booked count
  const bookedCount = reservationsSnapshot.docs.reduce(
    (sum, doc) => sum + (doc.data().partySize || 0),
    0
  );

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
export async function checkSlotAvailability(
  date: Date,
  time: string,
  seatingType: SeatingType,
  partySize: number
): Promise<AvailabilityResult & { canAccommodate: boolean }> {
  const availability = await calculateSlotAvailability(date, time, seatingType);

  return {
    ...availability,
    canAccommodate: availability.remainingCapacity >= partySize,
  };
}

/**
 * Get availability for all slots on a specific date
 */
export async function getDailyAvailability(date: Date): Promise<DailyAvailability> {
  const dateKey = formatDateKey(date);

  // Check if date is blocked
  const blockedDoc = await db.collection('blocked-dates').doc(dateKey).get();

  if (blockedDoc.exists) {
    const blockedData = blockedDoc.data();
    return {
      date: date.toISOString(),
      timeSlots: [],
      isBlocked: true,
      notes: blockedData?.reason,
    };
  }

  // Get settings for time slots
  const settings = await getSettings();

  // Calculate availability for each time slot
  const timeSlots: TimeSlot[] = await Promise.all(
    settings.timeSlots.map(async (time) => {
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
    })
  );

  return {
    date: date.toISOString(),
    timeSlots,
    isBlocked: false,
  };
}

/**
 * Transaction-safe availability check and reservation (prevents double-booking)
 */
export async function checkAndReserveSlot(
  date: Date,
  time: string,
  seatingType: SeatingType,
  partySize: number,
  reservationData: Record<string, any>
): Promise<string> {
  const slotLockRef = db.collection('slot-locks').doc(
    `${formatDateKey(date)}_${time}_${seatingType}`
  );

  const reservationRef = db.collection('reservations').doc();

  await db.runTransaction(async (transaction) => {
    // Read slot lock first so concurrent writes force a retry
    await transaction.get(slotLockRef);

    const totalCapacity = await getCapacity(seatingType);
    const startOfDay = getStartOfDay(date);
    const endOfDay = getEndOfDay(date);

    const reservationsQuery = db.collection('reservations')
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .where('time', '==', time)
      .where('seatingType', '==', seatingType)
      .where('status', 'in', ['confirmed', 'pending', 'seated']);

    const reservationsSnapshot = await transaction.get(reservationsQuery);

    const bookedCount = reservationsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().partySize || 0),
      0
    );

    const remainingCapacity = totalCapacity - bookedCount;

    if (remainingCapacity < partySize) {
      throw new ResourceExhaustedError(
        `This time slot is fully booked. Only ${Math.max(0, remainingCapacity)} seats remaining.`
      );
    }

    transaction.set(reservationRef, reservationData);
    transaction.set(
      slotLockRef,
      {
        lastReservationId: reservationRef.id,
        lastReservationAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return reservationRef.id;
}

/**
 * Get available time slots for a date and party size
 */
export async function getAvailableTimeSlotsForParty(
  date: Date,
  partySize: number,
  preferredSeatingType?: SeatingType
): Promise<{
  indoor: string[];
  balcony: string[];
}> {
  const dailyAvailability = await getDailyAvailability(date);

  if (dailyAvailability.isBlocked) {
    return { indoor: [], balcony: [] };
  }

  const indoorSlots: string[] = [];
  const balconySlots: string[] = [];

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
export async function hasAvailability(date: Date): Promise<boolean> {
  const dailyAvailability = await getDailyAvailability(date);

  if (dailyAvailability.isBlocked) {
    return false;
  }

  return dailyAvailability.timeSlots.some((slot) => slot.isAvailable);
}
