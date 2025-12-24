import User from '../models/user.model.js';
import Token from '../models/token.model.js';
import Caregiver from '../models/caregiver.model.js';
import CareSeeker from '../models/careseeker.model.js';
import Document from '../models/document.model.js';
import { timingSafeEqual } from 'crypto';
import { ApiError } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import { invalidateCachedUser } from '../utils/userCache.js';
import { 
  generateTokenPair, 
  generateRandomToken, 
  hashToken,
  verifyRefreshToken 
} from '../utils/tokenUtils.js';
import { uploadDocument, uploadImage } from '../utils/cloudinary.js';
import { haversineDistanceKm } from '../utils/haversine.js';
import { 
  ERROR_MESSAGES, 
  USER_STATUS, 
  TOKEN_TYPES,
  AUTH_PROVIDERS,
  USER_ROLES,
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
} from '../constants/index.js';
import emailService from './email.service.js';

const MAX_TEXT_LENGTH = {
  locationName: 150,
  placeId: 150,
  address: 500,
  city: 100,
  state: 100,
  country: 100,
  postalCode: 30,
};

const toCleanText = (value, maxLen) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
};

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeEmailCredential = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const PHONE_REGEX = /^\+?[\d\s\-()]{10,20}$/;

const secureEqual = (a, b) => {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
};

const getRequiredAdminCredentials = () => {
  const adminEmail = normalizeEmailCredential(process.env.ADMIN_EMAIL);
  const adminPassword = typeof process.env.ADMIN_PASSWORD === 'string'
    ? process.env.ADMIN_PASSWORD
    : '';

  if (!adminEmail || !adminPassword) {
    throw ApiError.internal('Admin authentication is not configured. Please set ADMIN_EMAIL and ADMIN_PASSWORD.');
  }

  return { adminEmail, adminPassword };
};

const isValidCoordinate = (lat, lng) => (
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180
);

const normalizeLocationProof = (rawLocationProof) => {
  if (!rawLocationProof) {
    throw ApiError.badRequest('Live location capture is required');
  }

  let parsed;
  try {
    parsed = typeof rawLocationProof === 'string'
      ? JSON.parse(rawLocationProof)
      : rawLocationProof;
  } catch {
    throw ApiError.badRequest('Invalid location proof format');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw ApiError.badRequest('Invalid location proof payload');
  }

  const selected = parsed.selectedCoordinates || parsed.coordinates;
  const selectedLat = toFiniteNumber(selected?.lat);
  const selectedLng = toFiniteNumber(selected?.lng);

  if (!isValidCoordinate(selectedLat, selectedLng)) {
    throw ApiError.badRequest('Live location capture is required');
  }

  const gpsLat = toFiniteNumber(parsed?.gpsCoordinates?.lat);
  const gpsLng = toFiniteNumber(parsed?.gpsCoordinates?.lng);
  const hasGpsCoordinates = gpsLat !== null && gpsLng !== null;

  if (hasGpsCoordinates && !isValidCoordinate(gpsLat, gpsLng)) {
    throw ApiError.badRequest('Invalid GPS coordinates provided');
  }

  const address = toCleanText(parsed.address, MAX_TEXT_LENGTH.address);
  if (!address) {
    throw ApiError.badRequest('Resolved address is required for location verification');
  }

  const rawAccuracy = toFiniteNumber(parsed.accuracy);
  const accuracy = rawAccuracy === null ? 0 : Math.max(0, Math.min(rawAccuracy, 5000));

  const capturedAt = parsed.capturedAt ? new Date(parsed.capturedAt) : new Date();
  const normalizedCapturedAt = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;

  return {
    locationName: toCleanText(parsed.locationName, MAX_TEXT_LENGTH.locationName),
    placeId: toCleanText(parsed.placeId, MAX_TEXT_LENGTH.placeId),
    selectedCoordinates: { lat: selectedLat, lng: selectedLng },
    gpsCoordinates: hasGpsCoordinates ? { lat: gpsLat, lng: gpsLng } : undefined,
    address,
    city: toCleanText(parsed.city, MAX_TEXT_LENGTH.city),
    state: toCleanText(parsed.state, MAX_TEXT_LENGTH.state),
    country: toCleanText(parsed.country, MAX_TEXT_LENGTH.country),
    postalCode: toCleanText(parsed.postalCode, MAX_TEXT_LENGTH.postalCode),
    accuracy,
    capturedAt: normalizedCapturedAt,
  };
};

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { email, password, fullName, role, age, phone, gender, location } = userData;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict(ERROR_MESSAGES.USER_EXISTS);
    }

    // Create base user. Role/age/gender can be completed during onboarding.
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      fullName: fullName.trim(),
      ...(phone ? { phone } : {}),
      ...(role ? { role } : {}),
      ...(typeof age === 'number' ? { age } : {}),
      ...(gender ? { gender } : {}),
      ...(location ? { location } : {}),
      authProvider: AUTH_PROVIDERS.LOCAL,
      status: USER_STATUS.PENDING,
    });

    // Create role-specific profile in separate collection
    try {
      if (role === USER_ROLES.CAREGIVER) {
        await Caregiver.create({
          userId: user._id,
          languages: [],
          serviceTypes: [],
          skills: [],
        });
        logger.info('Caregiver profile created', { email: user.email });
      } else if (role === USER_ROLES.CARESEEKER) {
        await CareSeeker.create({
          userId: user._id,
          careNeeds: [],
          familyMembers: [],
        });
        logger.info('CareSeeker profile created', { email: user.email });
      }
    } catch (profileError) {
      logger.error('Failed to create role profile', { error: profileError.message });
      // Don't fail registration if profile creation fails
    }

    const verificationToken = generateRandomToken();
    const hashedToken = hashToken(verificationToken);

    await Token.createVerificationToken(user._id, hashedToken);
    await emailService.sendVerificationEmail(user.email, user.fullName, verificationToken);

    return {
      user: user.toJSON(),
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * registerComplete — handles multi-step registration with optional document uploads.
   * 1. Creates user + role-specific profile.
   * 2. Uploads each provided file to Cloudinary and stores the secure_url.
   * 3. Stores location proof for care-seekers (replaces image-based address proof).
   * 4. Sends verification email.
   *
   * @param {Object} userData
   * @param {string} userData.fullName
   * @param {string} userData.email
   * @param {string} userData.password
   * @param {string} [userData.phone]
   * @param {string} [userData.dateOfBirth]  ISO date string
   * @param {string} [userData.gender]
   * @param {string} [userData.address]      free-form address string
   * @param {string} userData.role           'caregiver' | 'careseeker'
   * @param {Express.Multer.File[]} userData.files   multer file objects
   * @param {string[]} userData.docTypes     parallel array of DOCUMENT_TYPES values
   * @param {Object} [userData.locationProof]  location data for care-seeker address verification
   */
  async registerComplete({ fullName, email, password, phone, dateOfBirth, gender, address, role, files = [], docTypes = [], locationProof }) {
    // ── 1. Uniqueness check ──────────────────────────────────────────────────
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      // Allow re-registration only if the previous attempt was incomplete:
      // user exists but email is still unverified and account is PENDING.
      if (existing.isEmailVerified || existing.status !== USER_STATUS.PENDING) {
        throw ApiError.conflict(ERROR_MESSAGES.USER_EXISTS);
      }
      // Clean up the incomplete registration so this attempt can proceed.
      logger.info('Cleaning up incomplete registration', { email: existing.email });
      await Promise.all([
        User.deleteOne({ _id: existing._id }),
        Caregiver.deleteOne({ userId: existing._id }),
        CareSeeker.deleteOne({ userId: existing._id }),
        Document.deleteMany({ userId: existing._id }),
        Token.deleteMany({ userId: existing._id }),
      ]);
    }

    // ── 2. Validate role ─────────────────────────────────────────────────────
    const validRoles = [USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER];
    if (!validRoles.includes(role)) {
      throw ApiError.badRequest('Invalid role. Must be caregiver or careseeker.');
    }

    const normalizedLocationProof = normalizeLocationProof(locationProof);
    const { selectedCoordinates, gpsCoordinates } = normalizedLocationProof;

    const hasGpsCoordinates =
      Number.isFinite(gpsCoordinates?.lat) &&
      Number.isFinite(gpsCoordinates?.lng);

    const distanceKm = hasGpsCoordinates
      ? haversineDistanceKm(
        selectedCoordinates.lat,
        selectedCoordinates.lng,
        gpsCoordinates.lat,
        gpsCoordinates.lng,
      )
      : null;

    const gpsVerified = typeof distanceKm === 'number' ? distanceKm <= 3 : false;

    const trustScore =
      20 +
      (gpsVerified ? 40 : 0) +
      (docTypes.includes(DOCUMENT_TYPES.ADDRESS_PROOF) ? 40 : 0);

    if (role === USER_ROLES.CAREGIVER) {
      const requiredTypes = [
        DOCUMENT_TYPES.ID_PROOF,
        DOCUMENT_TYPES.ADDRESS_PROOF,
        DOCUMENT_TYPES.CERTIFICATION,
      ];

      const missingType = requiredTypes.find((type) => !docTypes.includes(type));
      if (missingType) {
        throw ApiError.badRequest(`Missing required document type: ${missingType}`);
      }
    }

    // ── 3. Parse optional fields ─────────────────────────────────────────────
    let age;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) throw ApiError.badRequest('You must be at least 18 years old to register.');
    }

    // Build location from free-form address
    const location = {
      address: normalizedLocationProof.address || address,
      city: normalizedLocationProof.city,
      state: normalizedLocationProof.state,
      country: normalizedLocationProof.country,
      postalCode: normalizedLocationProof.postalCode,
      coordinates: {
        type: 'Point',
        coordinates: [selectedCoordinates.lng, selectedCoordinates.lat],
      },
    };

    // ── 4. Create user ───────────────────────────────────────────────────────
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      fullName: fullName.trim(),
      role,
      ...(phone ? { phone } : {}),
      ...(age ? { age } : {}),
      ...(gender ? { gender } : {}),
      ...(location ? { location } : {}),
      authProvider: AUTH_PROVIDERS.LOCAL,
      status: USER_STATUS.PENDING,
      isProfileComplete: true,
    });

    // ── 4b. Save location proof ───────────────────────────────────────────────
    try {
      user.locationProof = {
        locationName: normalizedLocationProof.locationName,
        placeId: normalizedLocationProof.placeId,
        coordinates: { lat: selectedCoordinates.lat, lng: selectedCoordinates.lng },
        selectedCoordinates: { lat: selectedCoordinates.lat, lng: selectedCoordinates.lng },
        gpsCoordinates: gpsCoordinates
          ? { lat: gpsCoordinates.lat, lng: gpsCoordinates.lng }
          : undefined,
        distanceKm: typeof distanceKm === 'number' ? Number(distanceKm.toFixed(3)) : undefined,
        gpsVerified,
        trustScore,
        accuracy: normalizedLocationProof.accuracy,
        address: normalizedLocationProof.address,
        city: normalizedLocationProof.city,
        state: normalizedLocationProof.state,
        country: normalizedLocationProof.country,
        postalCode: normalizedLocationProof.postalCode,
        capturedAt: normalizedLocationProof.capturedAt,
        verificationStatus: 'pending',
      };
      await user.save();
      logger.info('Location proof saved', { email: user.email });
    } catch (locErr) {
      logger.error('Failed to save location proof', { error: locErr.message });
      throw ApiError.badRequest('Failed to persist location proof data');
    }

    // ── 5. Create role-specific profile ──────────────────────────────────────
    try {
      if (role === USER_ROLES.CAREGIVER) {
        await Caregiver.create({ userId: user._id, languages: [], serviceTypes: [], skills: [] });
      } else {
        await CareSeeker.create({ userId: user._id, careNeeds: [], familyMembers: [] });
      }
    } catch (profileErr) {
      logger.error('Role profile creation failed', { error: profileErr.message });
    }

    // ── 6. Upload documents to Cloudinary ────────────────────────────────────
    const uploadedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docType = docTypes[i] || DOCUMENT_TYPES.ID_PROOF;

      // Validate document type
      if (!Object.values(DOCUMENT_TYPES).includes(docType)) {
        console.warn(`⚠️ Unknown document type "${docType}" — skipping`);
        continue;
      }

      try {
        const isImage = file.mimetype.startsWith('image/');
        let cloudResult;

        if (isImage) {
          cloudResult = await uploadImage(file.buffer, {
            folder: `careconnect/registration/${user._id}`,
            publicId: `${docType}_${Date.now()}`,
          });
        } else {
          cloudResult = await uploadDocument(file.buffer, {
            folder: `careconnect/registration/${user._id}`,
            publicId: `${docType}_${Date.now()}`,
          });
        }

        const doc = await Document.create({
          userId: user._id,
          type: docType,
          fileName: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: cloudResult.size || file.size,
          url: cloudResult.url,        // Cloudinary secure_url — publicly accessible
          publicId: cloudResult.publicId,
          status: DOCUMENT_STATUS.PENDING,
        });

        uploadedDocs.push(doc);
        logger.info('Document uploaded', { email: user.email, url: cloudResult.url });
      } catch (uploadErr) {
        // Log but don't fail registration if a document upload fails
        logger.error('Document upload failed', { docType, error: uploadErr.message });
      }
    }

    // ── 7. Send verification email ────────────────────────────────────────────
    const verificationToken = generateRandomToken();
    const hashedVerify = hashToken(verificationToken);
    await Token.createVerificationToken(user._id, hashedVerify);
    await emailService.sendVerificationEmail(user.email, user.fullName, verificationToken);

    return {
      user: user.toJSON(),
      documentsUploaded: uploadedDocs.length,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * completeOnboarding — finalizes profile setup for authenticated users.
   * Used by /auth/onboarding/complete after email verification.
   */
  async completeOnboarding(userId, { fullName, phone, dateOfBirth, gender, address, role, files = [], docTypes = [], locationProof, agreementAccepted, agreementAcceptedAt, agreementVersion }) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
    const existingPhone = typeof user.phone === 'string' ? user.phone.trim() : '';
    const normalizedGender = typeof gender === 'string' ? gender.trim() : '';

    const finalRole = role || user.role;
    const validRoles = [USER_ROLES.CAREGIVER, USER_ROLES.CARESEEKER];
    if (!validRoles.includes(finalRole)) {
      throw ApiError.badRequest('Role is required and must be caregiver or careseeker.');
    }

    if (!normalizedPhone && !existingPhone) {
      throw ApiError.badRequest('Phone number is required');
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      throw ApiError.badRequest('Please provide a valid phone number');
    }

    if (!normalizedGender && !user.gender) {
      throw ApiError.badRequest('Gender is required');
    }

    let age = user.age;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) throw ApiError.badRequest('You must be at least 18 years old to complete onboarding.');
    } else if (!age) {
      throw ApiError.badRequest('Date of birth is required');
    }

    const normalizedLocationProof = normalizeLocationProof(locationProof);
    const { selectedCoordinates, gpsCoordinates } = normalizedLocationProof;

    const hasGpsCoordinates =
      Number.isFinite(gpsCoordinates?.lat) &&
      Number.isFinite(gpsCoordinates?.lng);

    const distanceKm = hasGpsCoordinates
      ? haversineDistanceKm(
        selectedCoordinates.lat,
        selectedCoordinates.lng,
        gpsCoordinates.lat,
        gpsCoordinates.lng,
      )
      : null;

    const gpsVerified = typeof distanceKm === 'number' ? distanceKm <= 3 : false;

    const existingDocs = await Document.find({ userId: user._id }).select('type').lean();
    const existingDocTypes = new Set(existingDocs.map((doc) => doc.type));
    const submittedDocTypes = new Set(docTypes);

    const hasAddressProof = submittedDocTypes.has(DOCUMENT_TYPES.ADDRESS_PROOF) || existingDocTypes.has(DOCUMENT_TYPES.ADDRESS_PROOF);
    const hasIdProof = submittedDocTypes.has(DOCUMENT_TYPES.ID_PROOF) || existingDocTypes.has(DOCUMENT_TYPES.ID_PROOF);

    const trustScore =
      20 +
      (gpsVerified ? 40 : 0) +
      ((finalRole === USER_ROLES.CAREGIVER ? hasAddressProof : hasIdProof) ? 40 : 0);

    if (finalRole === USER_ROLES.CAREGIVER) {
      const requiredTypes = [
        DOCUMENT_TYPES.ID_PROOF,
        DOCUMENT_TYPES.ADDRESS_PROOF,
        DOCUMENT_TYPES.CERTIFICATION,
      ];

      const missingType = requiredTypes.find(
        (type) => !submittedDocTypes.has(type) && !existingDocTypes.has(type),
      );
      if (missingType) {
        throw ApiError.badRequest(`Missing required document type: ${missingType}`);
      }
    } else {
      const hasRequiredIdProof = submittedDocTypes.has(DOCUMENT_TYPES.ID_PROOF) || existingDocTypes.has(DOCUMENT_TYPES.ID_PROOF);
      if (!hasRequiredIdProof) {
        throw ApiError.badRequest(`Missing required document type: ${DOCUMENT_TYPES.ID_PROOF}`);
      }
    }

    const location = {
      address: normalizedLocationProof.address || address || user.location?.address,
      city: normalizedLocationProof.city,
      state: normalizedLocationProof.state,
      country: normalizedLocationProof.country,
      postalCode: normalizedLocationProof.postalCode,
      coordinates: {
        type: 'Point',
        coordinates: [selectedCoordinates.lng, selectedCoordinates.lat],
      },
    };

    // Ensure role-specific profile exists.
    if (finalRole === USER_ROLES.CAREGIVER) {
      const caregiverProfile = await Caregiver.findOne({ userId: user._id }).lean();
      if (!caregiverProfile) {
        await Caregiver.create({
          userId: user._id,
          languages: [],
          serviceTypes: [],
          skills: [],
        });
      }
    } else {
      const careSeekerProfile = await CareSeeker.findOne({ userId: user._id }).lean();
      if (!careSeekerProfile) {
        await CareSeeker.create({
          userId: user._id,
          careNeeds: [],
          familyMembers: [],
        });
      }
    }

    const uploadedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docType = docTypes[i] || DOCUMENT_TYPES.ID_PROOF;

      if (!Object.values(DOCUMENT_TYPES).includes(docType)) {
        logger.warn('Unknown onboarding document type skipped', { userId: user._id, docType });
        continue;
      }

      try {
        const isImage = file.mimetype.startsWith('image/');
        const cloudResult = isImage
          ? await uploadImage(file.buffer, {
            folder: `careconnect/onboarding/${user._id}`,
            publicId: `${docType}_${Date.now()}`,
          })
          : await uploadDocument(file.buffer, {
            folder: `careconnect/onboarding/${user._id}`,
            publicId: `${docType}_${Date.now()}`,
          });

        const docPayload = {
          fileName: file.originalname,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: cloudResult.size || file.size,
          url: cloudResult.url,
          publicId: cloudResult.publicId,
          status: DOCUMENT_STATUS.PENDING,
        };

        const existingDoc = await Document.findOne({ userId: user._id, type: docType });

        let savedDoc;
        if (existingDoc) {
          existingDoc.fileName = docPayload.fileName;
          existingDoc.originalName = docPayload.originalName;
          existingDoc.mimeType = docPayload.mimeType;
          existingDoc.size = docPayload.size;
          existingDoc.url = docPayload.url;
          existingDoc.publicId = docPayload.publicId;
          existingDoc.status = docPayload.status;
          savedDoc = await existingDoc.save();
        } else {
          savedDoc = await Document.create({
            userId: user._id,
            type: docType,
            ...docPayload,
          });
        }

        uploadedDocs.push(savedDoc);
      } catch (uploadErr) {
        logger.error('Onboarding document upload failed', {
          userId: user._id,
          docType,
          error: uploadErr.message,
        });
      }
    }

    user.fullName = fullName?.trim() || user.fullName;
    user.phone = normalizedPhone || user.phone;
    user.age = age;
    user.gender = normalizedGender || user.gender;
    user.role = finalRole;
    user.location = location;
    user.locationProof = {
      locationName: normalizedLocationProof.locationName,
      placeId: normalizedLocationProof.placeId,
      coordinates: { lat: selectedCoordinates.lat, lng: selectedCoordinates.lng },
      selectedCoordinates: { lat: selectedCoordinates.lat, lng: selectedCoordinates.lng },
      gpsCoordinates: gpsCoordinates
        ? { lat: gpsCoordinates.lat, lng: gpsCoordinates.lng }
        : undefined,
      distanceKm: typeof distanceKm === 'number' ? Number(distanceKm.toFixed(3)) : undefined,
      gpsVerified,
      trustScore,
      accuracy: normalizedLocationProof.accuracy,
      address: normalizedLocationProof.address,
      city: normalizedLocationProof.city,
      state: normalizedLocationProof.state,
      country: normalizedLocationProof.country,
      postalCode: normalizedLocationProof.postalCode,
      capturedAt: normalizedLocationProof.capturedAt,
      verificationStatus: 'pending',
    };
    user.isProfileComplete = true;

    // Store agreement acceptance
    if (agreementAccepted === true || agreementAccepted === 'true') {
      user.agreementAccepted = true;
      user.agreementAcceptedAt = agreementAcceptedAt ? new Date(agreementAcceptedAt) : new Date();
      user.agreementVersion = agreementVersion || 'v1.0';
    }

    if (!user.isEmailVerified) {
      user.status = USER_STATUS.PENDING;
    } else if (finalRole === USER_ROLES.CAREGIVER) {
      user.status = USER_STATUS.PENDING_APPROVAL;
    } else {
      user.status = USER_STATUS.ACTIVE;
    }

    await user.save();

    const isPendingApproval = user.status === USER_STATUS.PENDING_APPROVAL;

    return {
      user: user.toJSON(),
      documentsUploaded: uploadedDocs.length,
      message: isPendingApproval
        ? 'Onboarding completed. Your account is now pending administrator approval.'
        : 'Onboarding completed successfully.',
    };
  }

  /**
   * Login with email and password
   */
  async login(email, password, userAgent, ipAddress) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (user.isLocked) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      throw ApiError.forbidden(`Account is locked. Please try again in ${lockTime} minutes.`);
    }

    if (user.authProvider !== AUTH_PROVIDERS.LOCAL && !user.password) {
      throw ApiError.badRequest(
        `This account uses ${user.authProvider} login. Please use ${user.authProvider} to sign in.`
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Auto-activate admin accounts regardless of current status — admins are
    // managed internally and do not go through the caregiver approval flow.
    if (user.role === USER_ROLES.ADMIN && (!user.isEmailVerified || user.status !== USER_STATUS.ACTIVE)) {
      user.isEmailVerified = true;
      user.status = USER_STATUS.ACTIVE;
      await user.save();
      logger.info('Admin account auto-activated on regular login', { email: user.email });
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_SUSPENDED);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    if (user.status === USER_STATUS.REJECTED) {
      const err = ApiError.forbidden('Your account application was rejected. Please contact support for more information.');
      err.code = 'ACCOUNT_REJECTED';
      throw err;
    }

    if (user.status === USER_STATUS.ONBOARDING) {
      // This should only happen for OAuth users who somehow try to use password login.
      const err = ApiError.forbidden('Please complete your account setup before logging in.');
      err.code = 'ONBOARDING_REQUIRED';
      throw err;
    }

    if (user.status === USER_STATUS.PENDING_APPROVAL) {
      const err = ApiError.forbidden('Your account is currently pending administrator approval. You will receive access once the review process is complete.');
      err.code = 'PENDING_APPROVAL';
      throw err;
    }

    if (!user.isEmailVerified) {
      throw ApiError.forbidden(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    // PENDING with verified email means onboarding was not completed
    if (user.status === USER_STATUS.PENDING && user.isEmailVerified) {
      const err = ApiError.forbidden('Please complete your account onboarding before logging in.');
      err.code = 'ONBOARDING_REQUIRED';
      throw err;
    }

    await user.resetLoginAttempts();

    const tokens = generateTokenPair(user._id, user.role);
    const hashedRefreshToken = hashToken(tokens.refreshToken);
    await Token.createRefreshToken(user._id, hashedRefreshToken, userAgent, ipAddress);

    return { user: user.toJSON(), ...tokens };
  }

  /**
   * OAuth Login (Google) - handles user from passport
   */
  async oauthLogin(user, userAgent, ipAddress) {
    if (!user) {
      throw ApiError.unauthorized('OAuth authentication failed');
    }

    // Hard-block terminated accounts
    if (user.status === USER_STATUS.SUSPENDED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_SUSPENDED);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    // Generate tokens — ONBOARDING / PENDING_APPROVAL users get tokens
    // so they can reach onboarding wizard or pending screen.
    const tokens = generateTokenPair(user._id, user.role || null);
    const hashedRefreshToken = hashToken(tokens.refreshToken);
    await Token.createRefreshToken(user._id, hashedRefreshToken, userAgent, ipAddress);

    // Route to onboarding only for lifecycle-incomplete users.
    const requiresOnboarding =
      user.status === USER_STATUS.ONBOARDING ||
      user.status === USER_STATUS.PENDING ||
      !user.role;

    return { user: user.toJSON(), ...tokens, requiresOnboarding };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token, userAgent, ipAddress) {
    if (!token) {
      throw ApiError.badRequest('Verification token is required');
    }

    const hashedToken = hashToken(token);
    logger.debug('Looking for verification token');

    const tokenDoc = await Token.findValidToken(hashedToken, TOKEN_TYPES.EMAIL_VERIFICATION);
    
    if (!tokenDoc) {
      // Check if token exists but is expired or used
      const expiredOrUsedToken = await Token.findOne({ 
        token: hashedToken, 
        type: TOKEN_TYPES.EMAIL_VERIFICATION 
      });
      
      if (expiredOrUsedToken) {
        if (expiredOrUsedToken.isUsed) {
          // Token was already consumed — check if the user is actually verified.
          // This gracefully handles React StrictMode double-invocation in dev where
          // the same token fires twice: the first call succeeds, the second finds
          // the token already used. Instead of 400-ing, confirm the user is active.
          const alreadyVerifiedUser = await User.findById(expiredOrUsedToken.userId);
          if (alreadyVerifiedUser && alreadyVerifiedUser.isEmailVerified) {
            logger.info('Token already used, user already verified', { email: alreadyVerifiedUser.email });
            return { 
              user: alreadyVerifiedUser.toJSON(), 
              message: 'Email is already verified. You can log in now.' 
            };
          }
          throw ApiError.badRequest('This verification link has already been used. Please login.');
        }
        if (expiredOrUsedToken.expiresAt < new Date()) {
          throw ApiError.badRequest('This verification link has expired. Please request a new one.');
        }
      }
      
      throw ApiError.badRequest(ERROR_MESSAGES.INVALID_TOKEN);
    }

    logger.debug('Verification token found', { userId: tokenDoc.userId });

    const user = await User.findById(tokenDoc.userId);
    
    if (!user) {
      logger.error('User not found for token', { userId: tokenDoc.userId });
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if already verified
    if (user.isEmailVerified) {
      await tokenDoc.markAsUsed();
      return { user: user.toJSON(), message: 'Email is already verified. You can login now.' };
    }

    // Update user verification status.
    // If profile setup is incomplete, user stays in PENDING and is routed to onboarding.
    // Caregivers with completed onboarding move to PENDING_APPROVAL for admin review.
    // Care-seekers with completed onboarding are activated immediately.
    user.isEmailVerified = true;
    if (!user.isProfileComplete) {
      user.status = USER_STATUS.PENDING;
    } else if (user.role === USER_ROLES.CAREGIVER) {
      user.status = USER_STATUS.PENDING_APPROVAL;
    } else {
      user.status = USER_STATUS.ACTIVE;
    }
    await user.save();

    await tokenDoc.markAsUsed();

    const tokens = generateTokenPair(user._id, user.role || USER_ROLES.CARESEEKER);
    const hashedRefreshToken = hashToken(tokens.refreshToken);
    await Token.createRefreshToken(user._id, hashedRefreshToken, userAgent, ipAddress);

    const isPendingApproval = user.status === USER_STATUS.PENDING_APPROVAL;
    const requiresOnboarding = user.status === USER_STATUS.PENDING;
    logger.info('User email verified', { email: user.email, status: user.status });

    return { 
      user: user.toJSON(),
      requiresApproval: isPendingApproval,
      requiresOnboarding,
      message: isPendingApproval
        ? 'Your email has been verified successfully. Your account is now pending administrator approval. You will be notified once approved.'
        : requiresOnboarding
          ? 'Email verified successfully! Please complete your onboarding to continue.'
          : 'Email verified successfully! Your account is now active. You can log in.',
      ...tokens,
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return { message: 'If an account exists, a verification email has been sent.' };
    }

    if (user.isEmailVerified) {
      throw ApiError.badRequest('Email is already verified');
    }

    const verificationToken = generateRandomToken();
    const hashedToken = hashToken(verificationToken);

    await Token.createVerificationToken(user._id, hashedToken);
    await emailService.sendVerificationEmail(user.email, user.fullName, verificationToken);

    return { message: 'Verification email sent successfully' };
  }

  /**
   * Forgot password - Send reset email
   * Google OAuth users cannot reset password — they must sign in with Google.
   */
  async forgotPassword(email) {
    const genericMessage = 'If an account exists with this email, a password reset link has been sent.';
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return { message: genericMessage };
    }

    // Block Google users from password reset — avoid revealing account existence
    // by returning the same generic message (prevents user enumeration).
    if (user.authProvider === AUTH_PROVIDERS.GOOGLE) {
      return { message: genericMessage, isGoogleAccount: true };
    }

    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);

    await Token.createPasswordResetToken(user._id, hashedToken);
    await emailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);

    return { message: genericMessage };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token, newPassword) {
    const hashedToken = hashToken(token);

    const tokenDoc = await Token.findValidToken(hashedToken, TOKEN_TYPES.PASSWORD_RESET);
    if (!tokenDoc) {
      throw ApiError.badRequest(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    user.password = newPassword;
    await user.save();

    invalidateCachedUser(user._id);
    await tokenDoc.markAsUsed();
    await Token.deleteMany({ userId: user._id, type: TOKEN_TYPES.REFRESH });

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken, userAgent, ipAddress) {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const hashedToken = hashToken(refreshToken);
    const tokenDoc = await Token.findValidToken(hashedToken, TOKEN_TYPES.REFRESH);
    if (!tokenDoc) {
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_TOKEN);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw ApiError.unauthorized(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Only hard-block terminated accounts — pending_approval users must be
    // able to refresh so they stay logged in on the waiting screen.
    if (user.status === USER_STATUS.SUSPENDED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_SUSPENDED);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    const tokens = generateTokenPair(user._id, user.role);

    await tokenDoc.deleteOne();

    const hashedRefreshToken = hashToken(tokens.refreshToken);
    await Token.createRefreshToken(user._id, hashedRefreshToken, userAgent, ipAddress);

    return tokens;
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    invalidateCachedUser(user._id);
    await Token.deleteMany({ userId: user._id, type: TOKEN_TYPES.REFRESH });

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Logout - Invalidate refresh token
   */
  async logout(refreshToken) {
    if (!refreshToken) {
      return { message: 'Logged out successfully' };
    }

    const hashedToken = hashToken(refreshToken);
    await Token.deleteOne({ token: hashedToken, type: TOKEN_TYPES.REFRESH });

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await Token.deleteMany({ userId, type: TOKEN_TYPES.REFRESH });
    return { message: 'Logged out from all devices' };
  }

  /**
   * Handle OAuth login/registration
   */
  async handleOAuthUser(user, userAgent, ipAddress) {
    // Auto-activate admin OAuth accounts — they bypass email verification
    // and the manual approval flow, same as the email/password admin login.
    if (user.role === USER_ROLES.ADMIN && (!user.isEmailVerified || user.status !== USER_STATUS.ACTIVE)) {
      user.isEmailVerified = true;
      user.status = USER_STATUS.ACTIVE;
      await user.save();
      logger.info('Admin account auto-activated on OAuth login', { email: user.email });
    }

    const tokens = generateTokenPair(user._id, user.role || 'pending');

    const hashedRefreshToken = hashToken(tokens.refreshToken);
    await Token.createRefreshToken(user._id, hashedRefreshToken, userAgent, ipAddress);

    return {
      user: user.toJSON(),
      ...tokens,
      requiresOnboarding:
        user.status === USER_STATUS.ONBOARDING ||
        user.status === USER_STATUS.PENDING ||
        !user.role,
    };
  }

  /**
   * Admin Login - Only allows admin role users to login
   */
  async adminLogin(email, password, userAgent, ipAddress) {
    const { adminEmail, adminPassword } = getRequiredAdminCredentials();
    const normalizedInputEmail = normalizeEmailCredential(email);
    const inputPassword = typeof password === 'string' ? password : '';

    const isEnvEmailMatch = secureEqual(normalizedInputEmail, adminEmail);
    const isEnvPasswordMatch = secureEqual(inputPassword, adminPassword);

    if (!isEnvEmailMatch || !isEnvPasswordMatch) {
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    let user = await User.findOne({ email: adminEmail }).select('+password');

    if (!user) {
      user = new User({
        fullName: 'Admin User',
        email: adminEmail,
        password: inputPassword,
        role: USER_ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        isEmailVerified: true,
        authProvider: AUTH_PROVIDERS.LOCAL,
        isProfileComplete: true,
      });
      await user.save();
      logger.warn('Admin account auto-provisioned during admin login', { email: adminEmail });

      user = await User.findOne({ email: adminEmail }).select('+password');
      if (!user) {
        throw ApiError.internal('Failed to provision admin account.');
      }
    }

    let shouldPersistAdminState = false;

    if (user.role !== USER_ROLES.ADMIN) {
      user.role = USER_ROLES.ADMIN;
      shouldPersistAdminState = true;
      logger.warn('Promoted configured admin account to admin role during login', { email: adminEmail });
    }

    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      shouldPersistAdminState = true;
    }

    if (
      user.status !== USER_STATUS.ACTIVE &&
      user.status !== USER_STATUS.SUSPENDED &&
      user.status !== USER_STATUS.DELETED
    ) {
      user.status = USER_STATUS.ACTIVE;
      shouldPersistAdminState = true;
    }

    if (user.authProvider !== AUTH_PROVIDERS.LOCAL) {
      user.authProvider = AUTH_PROVIDERS.LOCAL;
      shouldPersistAdminState = true;
    }

    if (user.isLocked) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      shouldPersistAdminState = true;
      logger.warn('Cleared admin lock state after validated environment credentials', { email: adminEmail });
    }

    if (shouldPersistAdminState) {
      await user.save();
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_SUSPENDED);
    }

    if (user.status === USER_STATUS.DELETED) {
      throw ApiError.forbidden(ERROR_MESSAGES.ACCOUNT_DELETED);
    }

    let isPasswordValid = await user.comparePassword(inputPassword);
    if (!isPasswordValid) {
      // Keep admin login aligned with configured environment credentials
      // without requiring a separate seed command after env rotations.
      user.password = inputPassword;
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      user = await User.findById(user._id).select('+password');
      isPasswordValid = Boolean(user) && await user.comparePassword(inputPassword);

      if (isPasswordValid) {
        logger.info('Admin password hash synchronized from environment credentials', { email: adminEmail });
      }
    }

    if (!user || !isPasswordValid) {
      if (user) {
        await user.incrementLoginAttempts();
      }
      throw ApiError.unauthorized(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    await user.resetLoginAttempts();

    const tokens = generateTokenPair(user._id, user.role);
    const hashedRefreshToken = hashToken(tokens.refreshToken);
    await Token.createRefreshToken(user._id, hashedRefreshToken, userAgent, ipAddress);

    return { user: user.toJSON(), ...tokens };
  }
}

export default new AuthService();
