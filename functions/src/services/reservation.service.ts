import { db } from '@/config/firebase';
import { Reservation, CreateReservationInput, ReservationStatus } from '@/types';
import { checkAndReserveSlot } from './availability.service';
import { getCancellationWindow, isDateWithinBookingWindow } from './settings.service';
import {
  NotFoundError,
  PreconditionFailedError,
  ValidationError,
} from '@/utils/errors';
import { ALLOWED_STATUS_TRANSITIONS } from '@/config/constants';
import { getHoursBetween } from '@/utils/dates';

/**
 * Create a new reservation
 */
export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const reservationDate = new Date(input.date);

  // Validate booking window
  if (!(await isDateWithinBookingWindow(reservationDate))) {
    throw new ValidationError('Date is outside the allowed booking window');
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
    status: 'confirmed' as ReservationStatus,
    specialRequests: input.specialRequests,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const reservationId = await checkAndReserveSlot(
    reservationDate,
    input.time,
    input.seatingType,
    input.partySize,
    reservationData
  );

  const createdDoc = await db.collection('reservations').doc(reservationId).get();
  const createdData = createdDoc.data() as any;

  return {
    id: reservationId,
    ...createdData,
    createdAt: createdData.createdAt,
    updatedAt: createdData.updatedAt,
  } as Reservation;
}

/**
 * Get reservation by ID
 */
export async function getReservation(reservationId: string): Promise<Reservation> {
  const doc = await db.collection('reservations').doc(reservationId).get();

  if (!doc.exists) {
    throw new NotFoundError('Reservation not found');
  }

  return {
    id: doc.id,
    ...doc.data(),
  } as Reservation;
}

/**
 * Update reservation status
 */
export async function updateReservationStatus(
  reservationId: string,
  newStatus: ReservationStatus,
  cancellationReason?: string
): Promise<Reservation> {
  const reservationRef = db.collection('reservations').doc(reservationId);
  const reservation = await reservationRef.get();

  if (!reservation.exists) {
    throw new NotFoundError('Reservation not found');
  }

  const currentData = reservation.data() as Reservation;
  const currentStatus = currentData.status;

  // Validate status transition
  if (!validateStatusTransition(currentStatus, newStatus)) {
    throw new ValidationError(
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }

  const updateData: any = {
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
export async function cancelReservation(
  reservationId: string,
  cancellationReason?: string
): Promise<Reservation> {
  const reservation = await getReservation(reservationId);

  // Check if reservation can be cancelled
  if (reservation.status === 'cancelled') {
    throw new ValidationError('Reservation is already cancelled');
  }

  if (reservation.status === 'completed' || reservation.status === 'no-show') {
    throw new ValidationError(`Cannot cancel a reservation with status: ${reservation.status}`);
  }

  // Check cancellation window
  const reservationDateTime = reservation.date.toDate();
  const hoursUntilReservation = getHoursBetween(new Date(), reservationDateTime);
  const cancellationWindow = await getCancellationWindow();

  if (hoursUntilReservation < cancellationWindow) {
    throw new PreconditionFailedError(
      `Reservations must be cancelled at least ${cancellationWindow} hours in advance. ` +
      `This reservation is in ${Math.floor(hoursUntilReservation)} hours.`
    );
  }

  return updateReservationStatus(reservationId, 'cancelled', cancellationReason);
}

/**
 * List reservations with filters
 */
export async function listReservations(filters?: {
  status?: ReservationStatus;
  date?: Date;
  email?: string;
  seatingType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ reservations: Reservation[]; total: number }> {
  let query: any = db.collection('reservations').orderBy('date', 'desc');

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }

  if (filters?.date) {
    const startOfDay = new Date(filters.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filters.date);
    endOfDay.setHours(23, 59, 59, 999);

    query = query
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay);
  }

  if (filters?.email) {
    query = query.where('email', '==', filters.email);
  }

  if (filters?.seatingType) {
    query = query.where('seatingType', '==', filters.seatingType);
  }

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  query = query.limit(limit).offset(offset);

  const snapshot = await query.get();

  const reservations = snapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reservation[];

  return {
    reservations,
    total: snapshot.size,
  };
}

/**
 * Get today's reservations
 */
export async function getTodayReservations(): Promise<Reservation[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const snapshot = await db.collection('reservations')
    .where('date', '>=', today)
    .where('date', '<', tomorrow)
    .where('status', 'in', ['confirmed', 'seated'])
    .orderBy('date')
    .orderBy('time')
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Reservation[];
}

/**
 * Validate status transition
 */
function validateStatusTransition(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus
): boolean {
  const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
}

/**
 * Delete a reservation (admin only)
 */
export async function deleteReservation(reservationId: string): Promise<void> {
  const reservationRef = db.collection('reservations').doc(reservationId);
  const reservation = await reservationRef.get();

  if (!reservation.exists) {
    throw new NotFoundError('Reservation not found');
  }

  await reservationRef.delete();
}
