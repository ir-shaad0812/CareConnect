// ============================================
// AVAILABILITY ROUTES
// API routes for caregiver availability management
// ============================================

import { Router } from 'express';
import * as availabilityController from '../controllers/availability/availability.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// ============================================
// PUBLIC ROUTES (for booking page)
// ============================================

// Get caregiver availability for a date range
router.get('/caregivers/:caregiverId', availabilityController.getCaregiverAvailability);

// Get available time slots for a specific date
router.get('/caregivers/:caregiverId/slots', availabilityController.getAvailableSlots);

// ============================================
// PROTECTED ROUTES (caregivers only)
// ============================================

router.use(authenticate);

// Get own availability
router.get('/me', availabilityController.getMyAvailability);

// Get own calendar view
router.get('/me/calendar', availabilityController.getMyCalendar);

// Update weekly schedule
router.put('/me/weekly-schedule', availabilityController.updateWeeklySchedule);

// Update blocked dates (replace all)
router.put('/me/blocked-dates', availabilityController.updateBlockedDates);

// Add a single blocked date
router.post('/me/blocked-dates', availabilityController.addBlockedDate);

// Remove a single blocked date
router.delete('/me/blocked-dates/:date', availabilityController.removeBlockedDate);

export default router;
