# Restaurant Reservation App

Full-stack reservation experience for Fresh Garden. Guests can pick a date/time, choose indoor or balcony seating, and create a confirmed booking; staff get availability, status management, and waitlist support backed by Firestore.

## Project layout
- `src/`: Vite + React front-end using MUI/Radix components for the guest and admin experience.
- `functions/`: Firebase Cloud Functions + Firestore data layer (availability, reservations, waitlist, settings). See `README_BACKEND.md` and `BACKEND_SETUP.md` for detailed backend steps.
- `public/`, `index.html`: static assets and entrypoint.

## Running the app locally
- Front-end: `npm install` then `npm run dev` at the repo root.
- Backend/emulator: `npm --prefix functions install`, then follow `BACKEND_SETUP.md` to start the Firebase emulators and functions.

## Current status
- Latest change: `checkAndReserveSlot` now runs the availability check and reservation creation inside a Firestore transaction with a slot-level lock document, preventing double-booking under concurrent requests.
  
