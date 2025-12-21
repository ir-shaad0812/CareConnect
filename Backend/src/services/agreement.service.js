// ============================================
// AGREEMENT SERVICE
// Auto-generates, stores, and manages the digital
// service agreement between a care seeker and a
// caregiver after the caregiver accepts a booking.
//
// Workflow:
//   1. Caregiver accepts booking  (PENDING → ACCEPTED)
//   2. generateAgreement()        → saves JSON content, moves to AGREEMENT_PENDING
//   3. Both parties call acceptAgreement() independently
//   4. When both have accepted    → AGREEMENT_PENDING → PAYMENT_PENDING
//      + emits BOOKING_AGREEMENT_ACCEPTED via eventBus
// ============================================

import PDFDocument from "pdfkit";
import Booking from "../models/booking.model.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/apiResponse.js";
import logger from "../utils/logger.js";
import { eventBus, SYSTEM_EVENTS } from "../utils/eventBus.js";
import bookingStateTransitionService from "./bookingStateTransition.service.js";
import {
  BOOKING_STATUS,
  NOTIFICATION_TYPE,
} from "../constants/booking.constants.js";
import { USER_ROLES } from "../constants/index.js";

// ─── PDF style constants ──────────────────────────────────────────────────────
const BRAND_BLUE = "#2563EB";
const BRAND_DARK = "#1E3A5F";
const TEXT_DARK = "#1F2937";
const TEXT_MUTED = "#6B7280";
const RULE_COLOR = "#E5E7EB";
const PAGE_MARGIN = 50;
const CONTENT_W = 495; // 595 pt (A4 width) − 2 × 50 pt margin

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a date value into a human-readable string.
 * Handles Date objects, ISO strings, and null/undefined gracefully.
 *
 * @param {Date|string|null|undefined} value
 * @param {Intl.DateTimeFormatOptions} [opts={}]
 * @returns {string}
 */
function fmtDate(value, opts = {}) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...opts,
    });
  } catch {
    return String(value);
  }
}

/**
 * Title-case a snake_case / kebab-case string.
 * e.g. 'elderly_care' → 'Elderly Care'
 *
 * @param {string|null|undefined} str
 * @returns {string}
 */
function titleCase(str) {
  if (!str) return "—";
  return str.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve a Mongoose field that may be either a populated sub-document or a
 * raw ObjectId / plain string.
 *
 * @param {object|string|null|undefined} value
 * @returns {string|null}
 */
function resolveId(value) {
  if (!value) return null;
  return value._id ? value._id.toString() : value.toString();
}

const AGREEMENT_RECOVERY_STATUSES = new Set([
  BOOKING_STATUS.RESERVED,
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.AGREEMENT_PENDING,
  BOOKING_STATUS.PAYMENT_PENDING,
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACTIVE,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.COMPLETED,
  BOOKING_STATUS.DISPUTED,
]);

function buildAgreementContentFromBooking(booking) {
  const careSeeker = booking.careSeekerId;
  const caregiver = booking.caregiverId;

  const startDate = booking.schedule?.startDate
    ? new Date(booking.schedule.startDate)
    : null;
  const endDate = booking.schedule?.endDate
    ? new Date(booking.schedule.endDate)
    : null;

  const scheduleDurationDays =
    startDate instanceof Date &&
    endDate instanceof Date &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime())
      ? Math.max(
          0,
          Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

  const durationType = String(booking.durationType || "").toLowerCase();
  const isLongTermCare =
    durationType === "long_term" ||
    durationType === "monthly" ||
    scheduleDurationDays >= 30;

  return {
    agreementId:
      booking.agreement?.agreementId || `AGR-${booking.bookingNumber}`,
    version: "v1",
    generatedAt: new Date().toISOString(),

    parties: {
      careSeeker: {
        name: careSeeker?.fullName || "Care Seeker",
        email: careSeeker?.email || "",
        userId: resolveId(booking.careSeekerId),
      },
      caregiver: {
        name: caregiver?.fullName || "Caregiver",
        email: caregiver?.email || "",
        userId: resolveId(booking.caregiverId),
      },
    },

    bookingDetails: {
      bookingNumber: booking.bookingNumber,
      serviceType: booking.serviceType,
      startDate: booking.schedule?.startDate,
      endDate: booking.schedule?.endDate,
      startTime: booking.schedule?.startTime || "",
      endTime: booking.schedule?.endTime || "",
      location:
        [
          booking.location?.address,
          booking.location?.city,
          booking.location?.state,
        ]
          .filter(Boolean)
          .join(", ") || "To be confirmed",
      durationType: booking.durationType,
    },

    paymentTerms: {
      totalAmount:
        booking.pricing?.total ??
        booking.totalAmount ??
        booking.pricing?.totalAmount ??
        0,
      currency: booking.pricing?.currency ?? "NPR",
      deadlineDays: 3,
      paymentCadenceAllowed: isLongTermCare ? ["monthly", "yearly"] : ["full"],
      partialPaymentAllowed: isLongTermCare,
      partialRules: isLongTermCare
        ? "Installments may be approved only for long-term care plans under a documented schedule approved by CareConnect. The first installment must clear before service commencement."
        : "Not allowed for short-term or daily bookings.",
    },

    trackingRules: {
      dailyCheckInRequired: true,
      reportSubmissionRequired: true,
      proofOfWorkRequired: true,
      missedLogAutoFlag: true,
    },

    leavePolicy: {
      noSuddenLeave: true,
      minNoticeHours: 24,
      approvalRequired: true,
    },

    penaltyRules: {
      missedWorkPenalty:
        "Service default may trigger payout holdback, trust-and-safety review, and contractual penalties.",
      lateSubmissionFlag: true,
      repeatedMisses:
        "Repeated non-compliance may result in immediate suspension or permanent platform removal.",
    },

    disputeTerms: {
      evidenceRequired: true,
      adminFinalDecision: true,
      resolutionDays: 7,
    },

    platformRules: {
      noOffPlatformCommunication: true,
      dataPrivacy: true,
      platformFeePercent: 10,
    },

    // ── Role-specific obligations ─────────────────────────────────────────
    // These sections are rendered separately per role on the agreement PDF
    // and in the frontend agreement review panel.

    caregiverObligations: {
      title: "Caregiver Obligations & Responsibilities",
      obligations: [
        {
          id: "daily_check_in",
          label: "Daily Check-In & Check-Out",
          description:
            "You must check in at the start of each shift and check out at the end using the CareConnect platform. Both actions must be completed on the scheduled day.",
          mandatory: true,
        },
        {
          id: "daily_log_submission",
          label: "Daily Tracking Log Submission",
          description:
            "A detailed daily log must be submitted for every active booking day. This log must include: work description, tasks completed, care recipient status notes, and at least one proof-of-work photo via Cloudinary.",
          mandatory: true,
        },
        {
          id: "report_incidents",
          label: "Incident Reporting",
          description:
            "Any accident, health emergency, or unusual incident involving the care recipient must be reported to the care seeker and CareConnect admin within 1 hour of occurrence.",
          mandatory: true,
        },
        {
          id: "maintain_confidentiality",
          label: "Confidentiality & Privacy",
          description:
            "All personal, medical, and financial information of the care recipient and family must be kept strictly confidential both during and after the service engagement.",
          mandatory: true,
        },
        {
          id: "follow_care_instructions",
          label: "Follow Care Instructions",
          description:
            "You must follow all care instructions provided by the care seeker, including medication schedules, dietary restrictions, mobility assistance protocols, and emergency contacts.",
          mandatory: true,
        },
        {
          id: "no_sudden_abandonment",
          label: "No Sudden Abandonment",
          description: `A minimum of ${isLongTermCare ? "72" : "24"}-hour advance notice is required before discontinuing service. Sudden abandonment without notice may result in payout holdback, trust score reduction, and account suspension.`,
          mandatory: true,
        },
        {
          id: "professional_conduct",
          label: "Professional Conduct",
          description:
            "You must maintain professional behaviour at all times: no use of personal devices for non-emergency purposes during shift, no off-platform financial transactions, and respectful communication.",
          mandatory: true,
        },
        {
          id: "platform_compliance",
          label: "Platform Compliance",
          description:
            "All communications, payments, and service documentation must be conducted through CareConnect. Off-platform arrangements are prohibited and may result in immediate account termination.",
          mandatory: true,
        },
      ],
      acknowledgement:
        "By accepting this agreement I confirm I have read, understood, and agree to fulfil all obligations listed above throughout the duration of this care booking.",
    },

    careSeekerObligations: {
      title: "Care Seeker Obligations & Responsibilities",
      obligations: [
        {
          id: "accurate_information",
          label: "Provide Accurate Care Information",
          description:
            "You must provide complete and accurate information about the care recipient, including medical conditions, medications, allergies, mobility needs, and any known behavioural considerations.",
          mandatory: true,
        },
        {
          id: "safe_environment",
          label: "Ensure a Safe Working Environment",
          description:
            "You are responsible for providing a safe, clean, and hazard-free environment for the caregiver to perform their duties. This includes proper lighting, accessible facilities, and necessary safety equipment.",
          mandatory: true,
        },
        {
          id: "timely_payment",
          label: "Timely Payment",
          description:
            "Payment must be completed within 3 days of agreement acceptance or before service commencement, whichever is earlier. Late payment may result in booking cancellation.",
          mandatory: true,
        },
        {
          id: "respect_caregiver",
          label: "Respectful Treatment",
          description:
            "You must treat the caregiver with respect and dignity at all times. Any form of harassment, discrimination, or unreasonable demands is strictly prohibited and may result in booking termination.",
          mandatory: true,
        },
        {
          id: "provide_supplies",
          label: "Provide Necessary Supplies & Resources",
          description:
            "Unless otherwise agreed, you are responsible for providing all necessary care supplies, medications, medical equipment, and household resources required to deliver the agreed care services.",
          mandatory: true,
        },
        {
          id: "communicate_changes",
          label: "Communicate Schedule Changes Promptly",
          description:
            "Any changes to the care schedule, location, or service requirements must be communicated to the caregiver and submitted through CareConnect at least 24 hours in advance.",
          mandatory: true,
        },
        {
          id: "review_daily_logs",
          label: "Review Daily Tracking Logs",
          description:
            "You are encouraged to review the caregiver's daily tracking submissions promptly. If you have concerns about the care provided, you must raise them through the CareConnect dispute system — not directly with the caregiver.",
          mandatory: false,
        },
        {
          id: "platform_compliance",
          label: "Platform Compliance",
          description:
            "All payments, dispute resolutions, and service modifications must be handled through CareConnect. Off-platform financial arrangements are prohibited.",
          mandatory: true,
        },
      ],
      acknowledgement:
        "By accepting this agreement I confirm I have read, understood, and agree to fulfil all obligations listed above to support effective care delivery throughout this booking.",
    },

    acceptanceRecord: {
      seekerAcceptedAt: booking.agreement?.seekerAcceptedAt || null,
      caregiverAcceptedAt: booking.agreement?.caregiverAcceptedAt || null,
      fullyAcceptedAt: booking.agreement?.acceptedAt || null,
    },
  };
}

function syncAgreementStateInPlace(booking) {
  if (!booking?.agreement) {
    return { mutated: false, fullyAccepted: false };
  }

  const agreement = booking.agreement;
  let mutated = false;

  const seekerAccepted = Boolean(agreement.seekerAccepted);
  const caregiverAccepted = Boolean(agreement.caregiverAccepted);
  const legacyAccepted =
    Boolean(agreement.accepted) || agreement.status === "accepted";

  if (legacyAccepted && !seekerAccepted) {
    agreement.seekerAccepted = true;
    mutated = true;
  }

  if (legacyAccepted && !caregiverAccepted) {
    agreement.caregiverAccepted = true;
    mutated = true;
  }

  const fullyAccepted =
    Boolean(agreement.seekerAccepted) && Boolean(agreement.caregiverAccepted);

  if (fullyAccepted && agreement.accepted !== true) {
    agreement.accepted = true;
    mutated = true;
  }

  if (fullyAccepted && agreement.status !== "accepted") {
    agreement.status = "accepted";
    mutated = true;
  }

  if (!fullyAccepted && !agreement.status) {
    agreement.status = "pending";
    mutated = true;
  }

  const acceptedAtFallback =
    agreement.acceptedAt ||
    agreement.caregiverAcceptedAt ||
    agreement.seekerAcceptedAt ||
    null;

  if (fullyAccepted && !agreement.acceptedAt) {
    agreement.acceptedAt = acceptedAtFallback || new Date();
    mutated = true;
  }

  if (fullyAccepted) {
    const fullAcceptedAt = agreement.acceptedAt || new Date();

    if (!agreement.seekerAcceptedAt) {
      agreement.seekerAcceptedAt = fullAcceptedAt;
      mutated = true;
    }

    if (!agreement.caregiverAcceptedAt) {
      agreement.caregiverAcceptedAt = fullAcceptedAt;
      mutated = true;
    }
  }

  if (agreement.content?.acceptanceRecord) {
    const record = agreement.content.acceptanceRecord;

    const seekerTs = agreement.seekerAcceptedAt || null;
    const caregiverTs = agreement.caregiverAcceptedAt || null;
    const fullyAcceptedTs = agreement.acceptedAt || null;

    if (String(record.seekerAcceptedAt || "") !== String(seekerTs || "")) {
      record.seekerAcceptedAt = seekerTs;
      mutated = true;
    }

    if (
      String(record.caregiverAcceptedAt || "") !== String(caregiverTs || "")
    ) {
      record.caregiverAcceptedAt = caregiverTs;
      mutated = true;
    }

    if (
      String(record.fullyAcceptedAt || "") !== String(fullyAcceptedTs || "")
    ) {
      record.fullyAcceptedAt = fullyAcceptedTs;
      mutated = true;
    }
  }

  return { mutated, fullyAccepted };
}

// ─── Service class ────────────────────────────────────────────────────────────

class AgreementService {
  // ── 0. ensureAgreementDraft ───────────────────────────────────────────────

  /**
   * Ensure a booking has draft agreement content that the care seeker can
   * review and accept before submitting the request.
   *
   * This method does not force a booking status transition; it only hydrates
   * `booking.agreement.content` and keeps acceptance flags consistent.
   *
   * @param {string} bookingId
   * @returns {Promise<import('mongoose').Document>}
   */
  async ensureAgreementDraft(bookingId) {
    const booking = await Booking.findById(bookingId)
      .populate("careSeekerId", "fullName email")
      .populate("caregiverId", "fullName email");

    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    const existingContent = booking.agreement?.content;
    if (existingContent) {
      return booking;
    }

    const draftContent = buildAgreementContentFromBooking(booking);

    const seekerAccepted = Boolean(booking.agreement?.seekerAccepted);
    const caregiverAccepted = Boolean(booking.agreement?.caregiverAccepted);
    const legacyAccepted =
      Boolean(booking.agreement?.accepted) ||
      booking.agreement?.status === "accepted";
    const fullyAccepted =
      legacyAccepted || (seekerAccepted && caregiverAccepted);

    const acceptedAt =
      booking.agreement?.acceptedAt ||
      booking.agreement?.caregiverAcceptedAt ||
      booking.agreement?.seekerAcceptedAt ||
      (fullyAccepted ? new Date() : null);

    const normalizedSeekerAccepted = fullyAccepted ? true : seekerAccepted;
    const normalizedCaregiverAccepted = fullyAccepted
      ? true
      : caregiverAccepted;

    booking.agreement = {
      ...(booking.agreement?.toObject?.() ?? booking.agreement ?? {}),
      agreementId: draftContent.agreementId,
      status: fullyAccepted ? "accepted" : "pending",
      accepted: fullyAccepted,
      acceptedAt: fullyAccepted ? acceptedAt : null,
      version: draftContent.version,
      content: draftContent,
      seekerAccepted: normalizedSeekerAccepted,
      caregiverAccepted: normalizedCaregiverAccepted,
      seekerAcceptedAt:
        booking.agreement?.seekerAcceptedAt ||
        (fullyAccepted ? acceptedAt : null),
      caregiverAcceptedAt:
        booking.agreement?.caregiverAcceptedAt ||
        (fullyAccepted ? acceptedAt : null),
    };

    syncAgreementStateInPlace(booking);

    booking.markModified("agreement");
    await booking.save();

    return booking;
  }

  // ── 1. generateAgreement ────────────────────────────────────────────────────

  /**
   * Auto-generate the booking agreement JSON and persist it on the booking
   * document. Transitions the booking from ACCEPTED → AGREEMENT_PENDING and
   * emits BOOKING_AGREEMENT_GENERATED to both parties.
   *
   * Called automatically by `BookingService.acceptBookingByCaregiver()`.
   *
   * @param {string} bookingId
   * @returns {Promise<import('mongoose').Document>} The updated booking document
   */
  async generateAgreement(bookingId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate("careSeekerId", "fullName email")
        .populate("caregiverId", "fullName email");

      if (!booking) {
        throw ApiError.notFound("Booking not found");
      }

      if (booking.status !== BOOKING_STATUS.ACCEPTED) {
        throw ApiError.badRequest(
          `Agreement can only be generated for bookings in ACCEPTED status. ` +
            `Current: ${booking.status}`,
        );
      }

      const content = buildAgreementContentFromBooking(booking);

      const seekerAccepted = Boolean(booking.agreement?.seekerAccepted);
      const caregiverAccepted = Boolean(booking.agreement?.caregiverAccepted);
      const legacyAccepted =
        Boolean(booking.agreement?.accepted) ||
        booking.agreement?.status === "accepted";
      const fullyAccepted =
        legacyAccepted || (seekerAccepted && caregiverAccepted);

      const acceptedAt =
        booking.agreement?.acceptedAt ||
        booking.agreement?.caregiverAcceptedAt ||
        booking.agreement?.seekerAcceptedAt ||
        (fullyAccepted ? new Date() : null);

      const normalizedSeekerAccepted = fullyAccepted ? true : seekerAccepted;
      const normalizedCaregiverAccepted = fullyAccepted
        ? true
        : caregiverAccepted;

      // ── Persist to booking ────────────────────────────────────────────
      booking.agreement = {
        ...(booking.agreement?.toObject?.() ?? booking.agreement ?? {}),
        agreementId: content.agreementId,
        status: fullyAccepted ? "accepted" : "pending",
        accepted: fullyAccepted,
        acceptedAt: fullyAccepted ? acceptedAt : null,
        version: content.version,
        content,
        seekerAccepted: normalizedSeekerAccepted,
        caregiverAccepted: normalizedCaregiverAccepted,
        seekerAcceptedAt:
          booking.agreement?.seekerAcceptedAt ||
          (fullyAccepted ? acceptedAt : null),
        caregiverAcceptedAt:
          booking.agreement?.caregiverAcceptedAt ||
          (fullyAccepted ? acceptedAt : null),
      };

      syncAgreementStateInPlace(booking);

      // Mongoose Mixed fields require explicit markModified()
      booking.markModified("agreement");

      let transitionApplied = false;

      if (booking.status === BOOKING_STATUS.ACCEPTED) {
        await bookingStateTransitionService.transition(
          booking,
          BOOKING_STATUS.AGREEMENT_PENDING,
          {
            source: 'agreement.generateAgreement',
            reason: 'Agreement document generated',
            metadata: {
              agreementId: content.agreementId,
            },
          },
        );
        transitionApplied = true;
      }

      if (fullyAccepted && booking.status === BOOKING_STATUS.AGREEMENT_PENDING) {
        await bookingStateTransitionService.transition(
          booking,
          BOOKING_STATUS.PAYMENT_PENDING,
          {
            source: 'agreement.generateAgreement',
            reason: 'Both parties already accepted agreement',
            metadata: {
              agreementId: content.agreementId,
              fullyAccepted,
            },
          },
        );
        transitionApplied = true;
      }

      if (!transitionApplied) {
        await booking.save();
      }

      logger.info("[AgreementService] Agreement generated", {
        bookingId: bookingId.toString(),
        agreementId: content.agreementId,
        status: booking.status,
      });

      // ── Real-time event ───────────────────────────────────────────────
      try {
        eventBus.emitToBookingParties(
          booking,
          SYSTEM_EVENTS.BOOKING_AGREEMENT_GENERATED,
          {
            agreementId: content.agreementId,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            message:
              "A service agreement has been generated for your booking. " +
              "Please review and accept it to proceed.",
          },
        );
      } catch (emitErr) {
        logger.error(
          "[AgreementService] Failed to emit BOOKING_AGREEMENT_GENERATED",
          {
            error: emitErr.message,
            bookingId: bookingId.toString(),
          },
        );
      }

      // Return the booking document so callers (e.g. BookingService) can
      // chain further operations without a second DB round-trip.
      return booking;
    } catch (err) {
      if (err.isOperational) throw err;
      logger.error("[AgreementService] generateAgreement error", {
        error: err.message,
        bookingId: bookingId?.toString(),
      });
      throw err;
    }
  }

  // ── 2. generateAgreementPDF ──────────────────────────────────────────────────

  /**
   * Render the stored agreement content as a professional PDF and return it
   * as a Node.js Buffer. Suitable for direct HTTP streaming or Cloudinary upload.
   *
   * Requires `generateAgreement()` to have been called first so that
   * `booking.agreement.content` is populated.
   *
   * @param {string} bookingId
   * @returns {Promise<Buffer>} Raw PDF bytes
   */
  async generateAgreementPDF(bookingId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate("careSeekerId", "fullName email")
        .populate("caregiverId", "fullName email");

      if (!booking) {
        throw ApiError.notFound("Booking not found");
      }

      if (!booking.agreement?.content) {
        throw ApiError.badRequest(
          "Agreement content not found. Call generateAgreement() first.",
        );
      }

      // content may be stored as a Mongoose Mixed (JS object) or a serialised string
      const content =
        typeof booking.agreement.content === "string"
          ? JSON.parse(booking.agreement.content)
          : booking.agreement.content;

      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: "A4",
            margins: {
              top: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
              right: PAGE_MARGIN,
            },
            info: {
              Title: `CareConnect Service Agreement — ${content.agreementId}`,
              Author: "CareConnect Platform",
              Subject: "Caregiver Service Agreement",
              Keywords: "careconnect agreement caregiver",
            },
          });

          const chunks = [];
          doc.on("data", (chunk) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", (err) => reject(err));

          this._renderPDF(doc, content, booking);

          doc.end();
        } catch (innerErr) {
          reject(innerErr);
        }
      });
    } catch (err) {
      if (err.isOperational) throw err;
      logger.error("[AgreementService] generateAgreementPDF error", {
        error: err.message,
        bookingId: bookingId?.toString(),
      });
      throw err;
    }
  }

  // ── PDF internal renderer ─────────────────────────────────────────────────────

  /**
   * Render all pages of the agreement PDF onto the open PDFDocument instance.
   * Kept separate from the Promise constructor to keep that handler lean.
   *
   * @private
   * @param {import('pdfkit')} doc
   * @param {object} content  - Agreement content object (already parsed)
   * @param {object} booking  - Mongoose booking document (for any live fallbacks)
   */
  _renderPDF(doc, content, booking) {
    // ────────────────────────────────────────────────────────────────────
    // HEADER BAND
    // ────────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 90).fill(BRAND_DARK);

    doc
      .fillColor("#FFFFFF")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("CareConnect", PAGE_MARGIN, 16, {
        width: CONTENT_W,
        align: "center",
      });

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("PROFESSIONAL CARE SERVICE AGREEMENT", PAGE_MARGIN, 44, {
        width: CONTENT_W,
        align: "center",
      });

    // ── Meta strip ───────────────────────────────────────────────────────
    doc.fillColor(TEXT_DARK);

    doc
      .moveDown(3.2)
      .fontSize(9)
      .font("Helvetica")
      .fillColor(TEXT_MUTED)
      .text(
        [
          `Agreement ID: ${content.agreementId}`,
          `Version: ${content.version}`,
          `Generated: ${fmtDate(content.generatedAt)}`,
        ].join("   •   "),
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_W, align: "center" },
      );

    doc.moveDown(0.6);
    this._rule(doc);

    // ────────────────────────────────────────────────────────────────────
    // SECTION HELPER CLOSURES
    // ────────────────────────────────────────────────────────────────────

    /** Numbered, blue-underlined section heading */
    const sectionTitle = (num, title) => {
      doc.moveDown(0.7);
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(BRAND_BLUE)
        .text(`${num}. ${title.toUpperCase()}`, PAGE_MARGIN, doc.y, {
          width: CONTENT_W,
        });
      doc
        .moveDown(0.15)
        .moveTo(PAGE_MARGIN, doc.y)
        .lineTo(PAGE_MARGIN + 220, doc.y)
        .strokeColor(BRAND_BLUE)
        .lineWidth(1.5)
        .stroke()
        .lineWidth(1)
        .strokeColor(RULE_COLOR);
      doc.moveDown(0.45);
      doc.fillColor(TEXT_DARK).fontSize(10).font("Helvetica");
    };

    /** Bold label + regular value on one line */
    const row = (label, value) => {
      doc
        .font("Helvetica-Bold")
        .fillColor(TEXT_DARK)
        .fontSize(10)
        .text(`${label}:`, PAGE_MARGIN, doc.y, { continued: true, width: 140 });
      doc
        .font("Helvetica")
        .fillColor(TEXT_DARK)
        .text(` ${String(value ?? "—")}`, { width: CONTENT_W - 145 });
    };

    /** Full-width justified paragraph */
    const paragraph = (text) => {
      if (!text) return;
      doc
        .font("Helvetica")
        .fillColor(TEXT_DARK)
        .fontSize(10)
        .text(String(text), PAGE_MARGIN, doc.y, {
          width: CONTENT_W,
          align: "justify",
        })
        .moveDown(0.4);
    };

    // ────────────────────────────────────────────────────────────────────
    // SECTION 1 — BOOKING DETAILS
    // ────────────────────────────────────────────────────────────────────
    sectionTitle(1, "Booking Details");

    row("Booking No.", content.bookingDetails.bookingNumber);
    row("Service Type", titleCase(content.bookingDetails.serviceType));
    row("Start Date", fmtDate(content.bookingDetails.startDate));
    row("End Date", fmtDate(content.bookingDetails.endDate));
    row(
      "Time",
      content.bookingDetails.startTime && content.bookingDetails.endTime
        ? `${content.bookingDetails.startTime} — ${content.bookingDetails.endTime}`
        : "—",
    );
    row("Duration Type", titleCase(content.bookingDetails.durationType));
    row("Location", content.bookingDetails.location);

    // ────────────────────────────────────────────────────────────────────
    // SECTION 2 — PAYMENT TERMS
    // ────────────────────────────────────────────────────────────────────
    sectionTitle(2, "Payment Terms");

    row(
      "Total Amount",
      `${content.paymentTerms.currency} ${Number(content.paymentTerms.totalAmount).toLocaleString()}`,
    );
    row(
      "Payment Deadline",
      `Within ${content.paymentTerms.deadlineDays} days of agreement acceptance`,
    );
    row(
      "Partial Payment",
      content.paymentTerms.partialPaymentAllowed
        ? "Allowed — 50% upfront required"
        : "Not Allowed — full payment due before service",
    );
    paragraph(content.paymentTerms.partialRules);

    // ────────────────────────────────────────────────────────────────────
    // SECTION 3 — TRACKING RULES
    // ────────────────────────────────────────────────────────────────────
    sectionTitle(3, "Tracking Rules");

    row(
      "Daily Check-In",
      content.trackingRules.dailyCheckInRequired
        ? "Mandatory — must be logged via the platform"
        : "Not required",
    );
    row(
      "Daily Report",
      content.trackingRules.reportSubmissionRequired
        ? "Required — submission mandatory by end of each service day"
        : "Not required",
    );
    row(
      "Proof of Work",
      content.trackingRules.proofOfWorkRequired
        ? "Required — photo proof must be submitted with each log"
        : "Not required",
    );
    row(
      "Missed Log",
      content.trackingRules.missedLogAutoFlag
        ? "Auto-flagged for admin review if not submitted on time"
        : "Manual review only",
    );

    // ────────────────────────────────────────────────────────────────────
    // SECTION 4 — LEAVE POLICY
    // ────────────────────────────────────────────────────────────────────
    sectionTitle(4, "Leave Policy");

    row(
      "Sudden Leave",
      content.leavePolicy.noSuddenLeave
        ? "Strictly prohibited"
        : "Permitted with notice",
    );
    row(
      "Advance Notice",
      `Minimum ${content.leavePolicy.minNoticeHours} hours written notice via the platform`,
    );
    row(
      "Prior Approval",
      content.leavePolicy.approvalRequired
        ? "Required from care seeker and platform"
        : "Not required",
    );
    paragraph(
      "Medical or family emergencies must be reported within 2 hours with " +
        "documentary evidence submitted through the platform.",
    );

    // ────────────────────────────────────────────────────────────────────
    // SECTION 5 — PENALTY RULES
    // ────────────────────────────────────────────────────────────────────
    sectionTitle(5, "Penalty Rules");

    row("Missed Work", content.penaltyRules.missedWorkPenalty);
    row(
      "Late Submission",
      content.penaltyRules.lateSubmissionFlag
        ? "Flagged for admin review — repeated offences escalate automatically"
        : "No automatic penalty",
    );
    row("Repeated Misses", content.penaltyRules.repeatedMisses);

    // ────────────────────────────────────────────────────────────────────
    // SECTION 6 — DISPUTE TERMS
    // ────────────────────────────────────────────────────────────────────
    sectionTitle(6, "Dispute Terms");

    row(
      "Evidence",
      content.disputeTerms.evidenceRequired
        ? "Required from both parties before any review begins"
        : "Optional",
    );
    row(
      "Final Authority",
      content.disputeTerms.adminFinalDecision
        ? "CareConnect admin decision is binding and final"
        : "Mutual agreement between parties",
    );
    row(
      "Resolution Period",
      `${content.disputeTerms.resolutionDays} business days from submission`,
    );
    paragraph(
      "Unresolved disputes are escalated to the CareConnect Trust & Safety team " +
        `after ${content.disputeTerms.resolutionDays} business days.`,
    );

    // ────────────────────────────────────────────────────────────────────
    // SECTION 7 — PLATFORM RULES
    // ────────────────────────────────────────────────────────────────────
    sectionTitle(7, "Platform Rules");

    row(
      "Communication",
      content.platformRules.noOffPlatformCommunication
        ? "All communication must occur on-platform"
        : "Off-platform communication permitted",
    );
    paragraph(
      "All communication, payments, and documentation must be handled " +
        "exclusively through the CareConnect platform.",
    );

    if (content.platformRules.dataPrivacy) {
      paragraph(
        "All personal and medical data is handled in accordance with the " +
          "CareConnect Privacy Policy. Neither party may share care-recipient " +
          "data with third parties without explicit written consent.",
      );
    }

    row(
      "Platform Fee",
      `${content.platformRules.platformFeePercent ?? 10}% of total booking value`,
    );
    paragraph(
      "Both parties agree to treat each other with dignity and respect and to " +
        "adhere to the CareConnect Community Standards at all times.",
    );

    // ────────────────────────────────────────────────────────────────────
    // SECTION 8 — AGREEMENT ACCEPTANCE
    // ────────────────────────────────────────────────────────────────────
    // Page-break guard: keep the signature block together on one page.
    if (doc.y > doc.page.height - 240) {
      doc.addPage();
    }

    sectionTitle(8, "Agreement Acceptance");
    paragraph(
      "By accepting this agreement on the CareConnect platform (digitally, via " +
        "the in-app acceptance button), both parties confirm that they have read, " +
        "understood, and agreed to all terms and conditions set out in this document. " +
        "This digital acceptance constitutes a legally binding contract and may be " +
        "relied upon for compliance, billing, audit, and dispute resolution under " +
        "applicable law.",
    );

    doc.moveDown(0.8);

    // Two-column signature block
    const sigY = doc.y;
    const COL_L = PAGE_MARGIN;
    const COL_R = PAGE_MARGIN + CONTENT_W / 2 + 10;
    const COL_W = CONTENT_W / 2 - 15;

    // ── Care Seeker column ───────────────────────────────────────────────
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(TEXT_DARK)
      .text("Care Seeker", COL_L, sigY, { width: COL_W });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(TEXT_DARK)
      .text(content.parties.careSeeker.name, COL_L, sigY + 18, {
        width: COL_W,
      });

    doc
      .moveTo(COL_L, sigY + 42)
      .lineTo(COL_L + COL_W, sigY + 42)
      .strokeColor("#9CA3AF")
      .lineWidth(1)
      .stroke();

    const seekerTs = content.acceptanceRecord?.seekerAcceptedAt;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(
        seekerTs
          ? `Accepted: ${fmtDate(seekerTs, { hour: "2-digit", minute: "2-digit" })}`
          : "Platform digital acceptance",
        COL_L,
        sigY + 48,
        { width: COL_W },
      );

    // ── Caregiver column ─────────────────────────────────────────────────
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(TEXT_DARK)
      .text("Caregiver", COL_R, sigY, { width: COL_W });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(TEXT_DARK)
      .text(content.parties.caregiver.name, COL_R, sigY + 18, { width: COL_W });

    doc
      .moveTo(COL_R, sigY + 42)
      .lineTo(COL_R + COL_W, sigY + 42)
      .strokeColor("#9CA3AF")
      .lineWidth(1)
      .stroke();

    const caregiverTs = content.acceptanceRecord?.caregiverAcceptedAt;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(
        caregiverTs
          ? `Accepted: ${fmtDate(caregiverTs, { hour: "2-digit", minute: "2-digit" })}`
          : "Platform digital acceptance",
        COL_R,
        sigY + 48,
        { width: COL_W },
      );

    // ────────────────────────────────────────────────────────────────────
    // FOOTER — stamped on every page
    // ────────────────────────────────────────────────────────────────────
    const range = doc.bufferedPageRange ? doc.bufferedPageRange() : null;
    if (range && range.count > 0) {
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        this._renderFooter(doc, content, i + 1, range.count);
      }
    } else {
      this._renderFooter(doc, content, 1, 1);
    }
  }

  /**
   * Render the footer band on the currently active page.
   * Shows agreement ID, both party names, and page numbering.
   *
   * @private
   * @param {import('pdfkit')} doc
   * @param {object}           content     - Agreement content object
   * @param {number}           pageNum     - 1-based current page number
   * @param {number}           totalPages
   */
  _renderFooter(doc, content, pageNum, totalPages) {
    const footerY = doc.page.height - PAGE_MARGIN + 8;

    doc
      .moveTo(PAGE_MARGIN, footerY - 6)
      .lineTo(PAGE_MARGIN + CONTENT_W, footerY - 6)
      .strokeColor(RULE_COLOR)
      .lineWidth(0.5)
      .stroke();

    const seekerName = content.parties?.careSeeker?.name || "";
    const caregiverName = content.parties?.caregiver?.name || "";
    const partiesStr =
      seekerName && caregiverName
        ? `${seekerName}  ↔  ${caregiverName}  •  `
        : "";

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(TEXT_MUTED)
      .text(
        `${content.agreementId}  •  ${partiesStr}` +
          `CareConnect Platform Agreement  •  Page ${pageNum} of ${totalPages}`,
        PAGE_MARGIN,
        footerY,
        { width: CONTENT_W, align: "center" },
      );
  }

  /**
   * Draw a full-width horizontal rule at the current cursor position.
   *
   * @private
   * @param {import('pdfkit')} doc
   * @param {string}           [color=RULE_COLOR]
   */
  _rule(doc, color = RULE_COLOR) {
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(PAGE_MARGIN + CONTENT_W, doc.y)
      .strokeColor(color)
      .lineWidth(0.8)
      .stroke()
      .moveDown(0.5);
  }

  // ── 3. acceptAgreement ───────────────────────────────────────────────────────

  /**
   * Record one party's digital acceptance of the agreement.
   *
   * - If only one party has accepted, the booking stays in AGREEMENT_PENDING.
   * - When **both** parties have accepted the booking moves to PAYMENT_PENDING
   *   and BOOKING_AGREEMENT_ACCEPTED is emitted via the event bus.
   *
   * @param {string} bookingId
   * @param {string} userId   - The ID of the authenticated user accepting
   * @param {string} userRole - 'caregiver' | 'careseeker'
   * @returns {Promise<import('mongoose').Document>} The updated booking document
   */
  async acceptAgreement(bookingId, userId, userRole) {
    try {
      let booking = await Booking.findById(bookingId)
        .populate("careSeekerId", "_id fullName email")
        .populate("caregiverId", "_id fullName email");

      if (!booking) {
        throw ApiError.notFound("Booking not found");
      }

      // ── Identify the caller ───────────────────────────────────────────
      const careSeekerId = resolveId(booking.careSeekerId);
      const caregiverId = resolveId(booking.caregiverId);
      const callerIdStr = userId.toString();

      const isCareSeeker = careSeekerId === callerIdStr;
      const isCaregiver = caregiverId === callerIdStr;

      if (!isCareSeeker && !isCaregiver) {
        throw ApiError.forbidden(
          "You are not a party to this booking agreement.",
        );
      }

      if (!booking.agreement?.content) {
        booking = await this.ensureAgreementDraft(bookingId);
      }

      const syncResult = syncAgreementStateInPlace(booking);
      if (syncResult.mutated) {
        booking.markModified("agreement");
        await booking.save();
      }

      // Idempotent acceptance: if this party already accepted (including after
      // legacy-state normalization), return success instead of throwing.
      if (isCareSeeker && booking.agreement.seekerAccepted) {
        return booking;
      }

      if (isCaregiver && booking.agreement.caregiverAccepted) {
        return booking;
      }

      const caregiverAllowedStatuses = new Set([
        BOOKING_STATUS.ACCEPTED,
        BOOKING_STATUS.AGREEMENT_PENDING,
        BOOKING_STATUS.PAYMENT_PENDING,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.DISPUTED,
      ]);

      const careSeekerAllowedStatuses = new Set([
        BOOKING_STATUS.RESERVED,
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.ACCEPTED,
        BOOKING_STATUS.AGREEMENT_PENDING,
        BOOKING_STATUS.PAYMENT_PENDING,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
        BOOKING_STATUS.COMPLETED,
        BOOKING_STATUS.DISPUTED,
      ]);

      // ── Terminal / inactive statuses ──────────────────────────────────
      const terminalStatuses = new Set([
        BOOKING_STATUS.CANCELLED,
        BOOKING_STATUS.REJECTED,
        BOOKING_STATUS.EXPIRED,
      ]);

      if (terminalStatuses.has(booking.status)) {
        throw ApiError.badRequest(
          `This booking is no longer active (status: ${booking.status}). ` +
            "Agreements cannot be accepted for cancelled, rejected, or expired bookings.",
          [],
          "BOOKING_INACTIVE",
        );
      }

      if (isCaregiver && !caregiverAllowedStatuses.has(booking.status)) {
        // Most common cause: caregiver tries to accept agreement before
        // accepting the booking request. Guide them to the correct action.
        if (booking.status === BOOKING_STATUS.PENDING) {
          throw ApiError.badRequest(
            "You must first accept the booking request before accepting the service agreement. " +
              "Please go to your pending bookings and accept the request.",
            [],
            "BOOKING_REQUEST_PENDING",
          );
        }

        if (booking.status === BOOKING_STATUS.RESERVED) {
          throw ApiError.badRequest(
            "This booking has not been submitted yet. The care seeker must submit the booking request first.",
            [],
            "BOOKING_NOT_SUBMITTED",
          );
        }

        throw ApiError.badRequest(
          `Agreement cannot be accepted by the caregiver while booking is in '${booking.status}' status. ` +
            `Expected status: accepted or agreement_pending.`,
          [],
          "INVALID_BOOKING_STATUS_FOR_AGREEMENT",
        );
      }

      if (isCareSeeker && !careSeekerAllowedStatuses.has(booking.status)) {
        throw ApiError.badRequest(
          `Agreement cannot be accepted by the care seeker while booking is in '${booking.status}' status.`,
          [],
          "INVALID_BOOKING_STATUS_FOR_AGREEMENT",
        );
      }

      // ── Guard against double-acceptance ──────────────────────────────
      if (isCareSeeker && booking.agreement.seekerAccepted) {
        return booking;
      }
      if (isCaregiver && booking.agreement.caregiverAccepted) {
        return booking;
      }

      // ── Record acceptance ─────────────────────────────────────────────
      const now = new Date();

      if (isCareSeeker) {
        booking.agreement.seekerAccepted = true;
        booking.agreement.seekerAcceptedAt = now;

        // Keep the cached timestamp inside the content object in sync so that
        // re-generated PDFs reflect the real acceptance time.
        if (booking.agreement.content?.acceptanceRecord) {
          booking.agreement.content.acceptanceRecord.seekerAcceptedAt = now;
        }
      }

      if (isCaregiver) {
        booking.agreement.caregiverAccepted = true;
        booking.agreement.caregiverAcceptedAt = now;

        if (booking.agreement.content?.acceptanceRecord) {
          booking.agreement.content.acceptanceRecord.caregiverAcceptedAt = now;
        }
      }

      // ── Check for full bilateral acceptance ───────────────────────────
      const fullyAccepted =
        booking.agreement.seekerAccepted && booking.agreement.caregiverAccepted;

      if (fullyAccepted) {
        booking.agreement.status = "accepted";
        booking.agreement.accepted = true;
        booking.agreement.acceptedAt = now;

        if (booking.agreement.content?.acceptanceRecord) {
          booking.agreement.content.acceptanceRecord.fullyAcceptedAt = now;
        }

      }

      // Mixed fields require explicit markModified() to be persisted
      booking.markModified("agreement");

      let transitionApplied = false;

      if (fullyAccepted && booking.status === BOOKING_STATUS.ACCEPTED) {
        await bookingStateTransitionService.transition(
          booking,
          BOOKING_STATUS.AGREEMENT_PENDING,
          {
            actorId: userId,
            actorRole: isCareSeeker ? 'careseeker' : 'caregiver',
            source: 'agreement.acceptAgreement',
            reason: 'Agreement accepted while booking still in accepted state',
          },
        );
        transitionApplied = true;
      }

      if (fullyAccepted && booking.status === BOOKING_STATUS.AGREEMENT_PENDING) {
        await bookingStateTransitionService.transition(
          booking,
          BOOKING_STATUS.PAYMENT_PENDING,
          {
            actorId: userId,
            actorRole: isCareSeeker ? 'careseeker' : 'caregiver',
            source: 'agreement.acceptAgreement',
            reason: 'Both parties accepted agreement',
          },
        );
        transitionApplied = true;
      }

      if (!transitionApplied) {
        await booking.save();
      }

      const acceptedBy = isCareSeeker ? "care seeker" : "caregiver";
      logger.info("[AgreementService] Agreement accepted", {
        bookingId: bookingId.toString(),
        acceptedBy,
        fullyAccepted,
        newStatus: booking.status,
      });

      // ── Emit real-time events ─────────────────────────────────────────
      try {
        if (fullyAccepted) {
          // Both parties signed → advance to payment stage
          eventBus.emitToBookingParties(
            booking,
            SYSTEM_EVENTS.BOOKING_AGREEMENT_ACCEPTED,
            {
              bookingNumber: booking.bookingNumber,
              status: booking.status,
              message:
                "Both parties have accepted the service agreement. " +
                "Please proceed to payment to confirm your booking.",
            },
          );
        } else {
          // Notify the OTHER party that the first has accepted and is waiting
          const waitingOnId = isCareSeeker ? caregiverId : careSeekerId;
          const acceptorName = isCareSeeker
            ? (booking.careSeekerId?.fullName ?? "The care seeker")
            : (booking.caregiverId?.fullName ?? "The caregiver");

          if (waitingOnId) {
            eventBus.emitToUser(
              waitingOnId,
              SYSTEM_EVENTS.BOOKING_AGREEMENT_GENERATED,
              {
                bookingId: bookingId.toString(),
                bookingNumber: booking.bookingNumber,
                message:
                  `${acceptorName} has accepted the agreement. ` +
                  `Your acceptance is now required to proceed.`,
              },
            );
          }
        }
      } catch (emitErr) {
        logger.error(
          "[AgreementService] Failed to emit agreement acceptance event",
          {
            error: emitErr.message,
            bookingId: bookingId.toString(),
            fullyAccepted,
          },
        );
      }

      return booking;
    } catch (err) {
      if (err.isOperational) throw err;
      logger.error("[AgreementService] acceptAgreement error", {
        error: err.message,
        bookingId: bookingId?.toString(),
      });
      throw err;
    }
  }

  // ── 4. getAgreement ──────────────────────────────────────────────────────────

  /**
   * Retrieve the full agreement object for a booking.
   * Access is restricted to the two booking parties and platform admins.
   *
   * @param {string}  bookingId
   * @param {string}  userId
   * @param {boolean} [isAdmin=false]
   * @returns {Promise<object>} Formatted agreement response object
   */
  async getAgreement(bookingId, userId, isAdmin = false) {
    let booking = await Booking.findById(bookingId)
      .populate("careSeekerId", "_id fullName email")
      .populate("caregiverId", "_id fullName email");

    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    if (!isAdmin) {
      const careSeekerId = resolveId(booking.careSeekerId);
      const caregiverId = resolveId(booking.caregiverId);
      const callerIdStr = userId.toString();

      if (careSeekerId !== callerIdStr && caregiverId !== callerIdStr) {
        throw ApiError.forbidden(
          "You are not authorised to view this agreement.",
        );
      }
    }

    if (!booking?.agreement?.content) {
      const canRecover = AGREEMENT_RECOVERY_STATUSES.has(booking.status);

      if (canRecover && booking.status === BOOKING_STATUS.ACCEPTED) {
        try {
          await this.generateAgreement(bookingId);
          booking = await Booking.findById(bookingId)
            .populate("careSeekerId", "_id fullName email")
            .populate("caregiverId", "_id fullName email");
        } catch (recoveryErr) {
          logger.error(
            "[AgreementService] Failed auto-generation recovery in getAgreement",
            {
              bookingId: bookingId?.toString(),
              status: booking.status,
              error: recoveryErr.message,
            },
          );
        }
      } else if (canRecover) {
        try {
          const seekerAccepted = Boolean(booking.agreement?.seekerAccepted);
          const caregiverAccepted = Boolean(
            booking.agreement?.caregiverAccepted,
          );
          const fullyAccepted = seekerAccepted && caregiverAccepted;
          const recoveredContent = buildAgreementContentFromBooking(booking);

          booking.agreement = {
            ...(booking.agreement?.toObject?.() ?? booking.agreement ?? {}),
            agreementId: recoveredContent.agreementId,
            status: fullyAccepted
              ? "accepted"
              : booking.agreement?.status || "pending",
            accepted: fullyAccepted || Boolean(booking.agreement?.accepted),
            acceptedAt:
              booking.agreement?.acceptedAt ||
              (fullyAccepted ? new Date() : null),
            version: recoveredContent.version,
            content: recoveredContent,
            seekerAccepted,
            caregiverAccepted,
            seekerAcceptedAt: booking.agreement?.seekerAcceptedAt || null,
            caregiverAcceptedAt: booking.agreement?.caregiverAcceptedAt || null,
          };

          if (
            fullyAccepted &&
            booking.status === BOOKING_STATUS.AGREEMENT_PENDING
          ) {
            await bookingStateTransitionService.transition(
              booking,
              BOOKING_STATUS.PAYMENT_PENDING,
              {
                source: 'agreement.getAgreement.recovery',
                reason: 'Recovered agreement content with both parties accepted',
                metadata: {
                  bookingId: bookingId?.toString?.() || null,
                },
              },
            );
          }

          booking.markModified("agreement");
          if (booking.status !== BOOKING_STATUS.PAYMENT_PENDING) {
            await booking.save();
          }

          logger.warn(
            "[AgreementService] Recovered missing agreement content",
            {
              bookingId: bookingId?.toString(),
              status: booking.status,
              fullyAccepted,
            },
          );
        } catch (recoveryErr) {
          logger.error(
            "[AgreementService] Failed agreement content recovery in getAgreement",
            {
              bookingId: bookingId?.toString(),
              status: booking.status,
              error: recoveryErr.message,
            },
          );
        }
      }
    }

    if (!booking?.agreement?.content) {
      throw ApiError.notFound(
        "Agreement has not been generated for this booking yet.",
      );
    }

    const syncResult = syncAgreementStateInPlace(booking);
    if (syncResult.mutated) {
      booking.markModified("agreement");
      await booking.save();
    }

    return {
      bookingId: bookingId.toString(),
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      agreement: {
        agreementId: booking.agreement.agreementId,
        status: booking.agreement.status,
        accepted: booking.agreement.accepted,
        acceptedAt: booking.agreement.acceptedAt,
        version: booking.agreement.version,
        seekerAccepted: booking.agreement.seekerAccepted,
        caregiverAccepted: booking.agreement.caregiverAccepted,
        seekerAcceptedAt: booking.agreement.seekerAcceptedAt,
        caregiverAcceptedAt: booking.agreement.caregiverAcceptedAt,
        content: booking.agreement.content,
      },
    };
  }

  // ── getAgreementStatus ────────────────────────────────────────────────────────

  /**
   * Lightweight agreement status check — does NOT return full agreement content.
   * Designed for polling / status-bar components that need to know:
   *  • who has accepted so far
   *  • what the next required action is
   *  • whether payment is now enabled
   *
   * @param {string} bookingId
   * @param {string} userId   - Authenticated user's ID
   * @param {boolean} isAdmin
   * @returns {Promise<object>}
   */
  async getAgreementStatus(bookingId, userId, isAdmin = false) {
    const booking = await Booking.findById(bookingId)
      .populate("careSeekerId", "_id fullName email")
      .populate("caregiverId", "_id fullName email");

    if (!booking) {
      throw ApiError.notFound("Booking not found");
    }

    if (!isAdmin) {
      const careSeekerId = resolveId(booking.careSeekerId);
      const caregiverId = resolveId(booking.caregiverId);
      const callerIdStr = userId.toString();
      if (careSeekerId !== callerIdStr && caregiverId !== callerIdStr) {
        throw ApiError.forbidden(
          "You are not authorised to view this agreement status.",
        );
      }
    }

    // Run sync so acceptance flags are always up-to-date
    const syncResult = syncAgreementStateInPlace(booking);
    if (syncResult.mutated) {
      booking.markModified("agreement");
      await booking.save();
    }

    const seekerAccepted = Boolean(booking.agreement?.seekerAccepted);
    const caregiverAccepted = Boolean(booking.agreement?.caregiverAccepted);
    const fullyAccepted =
      Boolean(booking.agreement?.accepted) ||
      (seekerAccepted && caregiverAccepted);
    const agreementExists = Boolean(booking.agreement?.content);

    // Terminal / inactive booking — cannot proceed
    const terminalStatuses = new Set([
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.REJECTED,
      BOOKING_STATUS.EXPIRED,
    ]);

    // Derive the human-readable next action
    let nextAction;
    if (terminalStatuses.has(booking.status)) {
      nextAction = "BOOKING_INACTIVE";
    } else if (!agreementExists && booking.status === BOOKING_STATUS.PENDING) {
      nextAction = "CAREGIVER_MUST_ACCEPT_BOOKING_REQUEST";
    } else if (!agreementExists) {
      nextAction = "AGREEMENT_PENDING_GENERATION";
    } else if (fullyAccepted) {
      nextAction = "FULLY_ACCEPTED";
    } else if (seekerAccepted && !caregiverAccepted) {
      nextAction = "CAREGIVER_MUST_ACCEPT";
    } else if (!seekerAccepted && caregiverAccepted) {
      nextAction = "SEEKER_MUST_ACCEPT";
    } else {
      nextAction = "BOTH_MUST_ACCEPT";
    }

    // Convenience flags for the caller role (if userId supplied)
    const callerIdStr = userId ? userId.toString() : null;
    const isCareSeeker =
      callerIdStr && resolveId(booking.careSeekerId) === callerIdStr;
    const isCaregiver =
      callerIdStr && resolveId(booking.caregiverId) === callerIdStr;

    const canSeekerAccept =
      !seekerAccepted &&
      agreementExists &&
      !terminalStatuses.has(booking.status);
    const canCaregiverAccept =
      !caregiverAccepted &&
      agreementExists &&
      [
        BOOKING_STATUS.ACCEPTED,
        BOOKING_STATUS.AGREEMENT_PENDING,
        BOOKING_STATUS.PAYMENT_PENDING,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.IN_PROGRESS,
      ].includes(booking.status);

    return {
      bookingId: bookingId.toString(),
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      agreementExists,
      agreementId: booking.agreement?.agreementId || null,
      agreementStatus: booking.agreement?.status || "not_generated",
      seekerAccepted,
      caregiverAccepted,
      fullyAccepted,
      seekerAcceptedAt: booking.agreement?.seekerAcceptedAt || null,
      caregiverAcceptedAt: booking.agreement?.caregiverAcceptedAt || null,
      fullyAcceptedAt: booking.agreement?.acceptedAt || null,
      paymentEnabled:
        fullyAccepted &&
        [
          BOOKING_STATUS.PAYMENT_PENDING,
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.ACTIVE,
        ].includes(booking.status),
      nextAction,
      // Role-specific convenience flags
      ...(isCareSeeker && { canAccept: canSeekerAccept }),
      ...(isCaregiver && { canAccept: canCaregiverAccept }),
    };
  }
}

// ─── Singleton export ──────────────────────────────────────────────────────────

export default new AgreementService();
