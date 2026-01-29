import User from '../models/user.model.js';
import Caregiver from '../models/caregiver.model.js';
import Document from '../models/document.model.js';
import { ApiError } from '../utils/apiResponse.js';
import { ERROR_MESSAGES, USER_STATUS, USER_ROLES } from '../constants/index.js';
import { uploadAvatar, deleteFromCloudinary } from '../utils/cloudinary.js';
import { invalidateCachedUser } from '../utils/userCache.js';
import config from '../config/index.js';

class UserService {
  parseCategoryList(rawCategories) {
    if (Array.isArray(rawCategories)) {
      return rawCategories
        .flatMap((value) => String(value).split(','))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    }

    if (typeof rawCategories === 'string') {
      return rawCategories
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    }

    return [];
  }

  getEffectiveHourlyRate(caregiver) {
    const hourlyRate = Number(caregiver?.hourlyRate || 0);
    if (hourlyRate > 0) return hourlyRate;

    const dailyRate = Number(caregiver?.dailyRate || 0);
    if (dailyRate > 0) return dailyRate / 8;

    const weeklyRate = Number(caregiver?.weeklyRate || 0);
    if (weeklyRate > 0) return weeklyRate / 40;

    const monthlyRate = Number(caregiver?.monthlyRate || 0);
    if (monthlyRate > 0) return monthlyRate / 160;

    return 0;
  }

  getPercentile(sortedValues, percentile) {
    if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
      return 0;
    }

    const clampedPercentile = Math.min(Math.max(percentile, 0), 1);
    const index = (sortedValues.length - 1) * clampedPercentile;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);

    if (lowerIndex === upperIndex) {
      return sortedValues[lowerIndex];
    }

    const weight = index - lowerIndex;
    return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
  }

  getRateBand(rates = []) {
    const normalized = rates
      .map((rate) => Number(rate))
      .filter((rate) => Number.isFinite(rate) && rate > 0)
      .sort((a, b) => a - b);

    if (normalized.length === 0) {
      return {
        avgLow: 0,
        avgHigh: 0,
        median: 0,
      };
    }

    return {
      avgLow: Math.round(this.getPercentile(normalized, 0.25)),
      avgHigh: Math.round(this.getPercentile(normalized, 0.75)),
      median: Math.round(this.getPercentile(normalized, 0.5)),
    };
  }

  formatServiceTypeLabel(serviceType = '') {
    return String(serviceType)
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  matchesLocation(location, locationQuery) {
    const query = String(locationQuery || '').trim().toLowerCase();
    if (!query) return true;

    const city = String(location?.city || '').toLowerCase();
    const state = String(location?.state || '').toLowerCase();
    const country = String(location?.country || '').toLowerCase();

    return [city, state, country].some((value) => value.includes(query));
  }

  /**
   * Get caregiver market context for pricing/location widgets.
   */
  async getCaregiverMarketContext(query = {}) {
    const {
      location = '',
      categories,
      topLocations = 6,
      topCategories = 6,
    } = query;

    const parsedTopLocations = Math.min(
      12,
      Math.max(1, Number.parseInt(topLocations, 10) || 6),
    );
    const parsedTopCategories = Math.min(
      12,
      Math.max(1, Number.parseInt(topCategories, 10) || 6),
    );

    const selectedCategories = this.parseCategoryList(categories);
    const caregiverFilter = {
      role: USER_ROLES.CAREGIVER,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
      ...(selectedCategories.length > 0
        ? { serviceTypes: { $in: selectedCategories } }
        : {}),
    };

    const [caregivers, totalRegisteredCaregivers, totalRegisteredUsers] =
      await Promise.all([
        User.find(caregiverFilter)
          .select(
            'hourlyRate dailyRate weeklyRate monthlyRate location serviceTypes currency createdAt',
          )
          .lean(),
        User.countDocuments({ role: USER_ROLES.CAREGIVER, status: USER_STATUS.ACTIVE }),
        User.countDocuments({ status: USER_STATUS.ACTIVE }),
      ]);

    const filteredCaregivers = caregivers.filter((caregiver) =>
      this.matchesLocation(caregiver.location, location),
    );

    const allRates = filteredCaregivers
      .map((caregiver) => this.getEffectiveHourlyRate(caregiver))
      .filter((rate) => rate > 0);

    const overallBand = this.getRateBand(allRates);

    const locationMap = new Map();
    filteredCaregivers.forEach((caregiver) => {
      const city = caregiver?.location?.city || 'Unknown';
      const state = caregiver?.location?.state || '';
      const country = caregiver?.location?.country || '';
      const key = `${city}|${state}|${country}`;
      const existing = locationMap.get(key) || {
        city,
        state,
        country,
        count: 0,
        rates: [],
      };

      existing.count += 1;
      const hourlyRate = this.getEffectiveHourlyRate(caregiver);
      if (hourlyRate > 0) {
        existing.rates.push(hourlyRate);
      }

      locationMap.set(key, existing);
    });

    const locationBreakdown = Array.from(locationMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, parsedTopLocations)
      .map((entry) => {
        const band = this.getRateBand(entry.rates);
        return {
          city: entry.city,
          state: entry.state,
          country: entry.country,
          count: entry.count,
          avgLow: band.avgLow,
          avgHigh: band.avgHigh,
          median: band.median,
        };
      });

    const categoryMap = new Map();
    filteredCaregivers.forEach((caregiver) => {
      const serviceTypes = Array.isArray(caregiver.serviceTypes)
        ? caregiver.serviceTypes
        : [];
      if (serviceTypes.length === 0) return;

      const hourlyRate = this.getEffectiveHourlyRate(caregiver);

      serviceTypes.forEach((type) => {
        const normalizedType = String(type || '').toLowerCase();
        if (!normalizedType) return;
        if (
          selectedCategories.length > 0 &&
          !selectedCategories.includes(normalizedType)
        ) {
          return;
        }

        const existing = categoryMap.get(normalizedType) || {
          category: normalizedType,
          count: 0,
          rates: [],
        };

        existing.count += 1;
        if (hourlyRate > 0) {
          existing.rates.push(hourlyRate);
        }

        categoryMap.set(normalizedType, existing);
      });
    });

    const categoryBreakdown = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, parsedTopCategories)
      .map((entry) => {
        const band = this.getRateBand(entry.rates);
        return {
          category: this.formatServiceTypeLabel(entry.category),
          key: entry.category,
          count: entry.count,
          avgLow: band.avgLow,
          avgHigh: band.avgHigh,
          median: band.median,
        };
      });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const currentWindowCount = filteredCaregivers.filter((caregiver) => {
      const createdAt = caregiver.createdAt ? new Date(caregiver.createdAt) : null;
      return createdAt && createdAt >= thirtyDaysAgo;
    }).length;

    const previousWindowCount = filteredCaregivers.filter((caregiver) => {
      const createdAt = caregiver.createdAt ? new Date(caregiver.createdAt) : null;
      return createdAt && createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo;
    }).length;

    let trend = 'stable';
    let trendPercent = 0;
    if (previousWindowCount === 0 && currentWindowCount > 0) {
      trend = 'up';
      trendPercent = 100;
    } else if (previousWindowCount > 0) {
      const change = Math.round(((currentWindowCount - previousWindowCount) / previousWindowCount) * 100);
      trendPercent = Math.abs(change);
      trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    }

    const inferredLocation =
      String(location || '').trim() ||
      locationBreakdown[0]?.city ||
      'Nepal';

    return {
      location: inferredLocation,
      avgLow: overallBand.avgLow,
      avgHigh: overallBand.avgHigh,
      median: overallBand.median,
      trend,
      trendPercent,
      sampleSize: filteredCaregivers.length,
      totalRegisteredUsers,
      totalRegisteredCaregivers,
      lastUpdated: new Date().toISOString(),
      breakdown: categoryBreakdown,
      locationBreakdown,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }
    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email) {
    return await User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Get public list of caregivers (for careseekers and guests)
   */
  async getPublicCaregivers(query = {}) {
    const {
      page = 1,
      limit = 12,
      search,
      skill,
      minRate,
      maxRate,
      minExperience,
      city,
      sortBy = 'rating',
      sortOrder = 'desc',
    } = query;

    const filter = {
      role: USER_ROLES.CAREGIVER,
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
    };

    // Search by name
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by skill
    if (skill) {
      filter.skills = { $in: Array.isArray(skill) ? skill : [skill] };
    }

    // Filter by rate range
    if (minRate || maxRate) {
      filter.hourlyRate = {};
      if (minRate) filter.hourlyRate.$gte = parseFloat(minRate);
      if (maxRate) filter.hourlyRate.$lte = parseFloat(maxRate);
    }

    // Filter by experience
    if (minExperience) {
      filter.experience = { $gte: parseInt(minExperience) };
    }

    // Filter by city
    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Only select public fields
    const publicFields = [
      'fullName',
      'avatar',
      'role',
      'bio',
      'experience',
      'hourlyRate',
      'dailyRate',
      'weeklyRate',
      'monthlyRate',
      'currency',
      'skills',
      'certifications',
      'availability',
      'rating',
      'totalReviews',
      'location.city',
      'location.state',
      'location.country',
      'isEmailVerified',
      'languages',
      'serviceTypes',
      'workPreferences',
    ];

    const [caregivers, total] = await Promise.all([
      User.find(filter)
        .select(publicFields.join(' '))
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return {
      caregivers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get public caregiver profile
   */
  async getPublicCaregiverProfile(caregiverId) {
    const populateOptions = {
      path: 'userId',
      match: { role: USER_ROLES.CAREGIVER, status: USER_STATUS.ACTIVE },
      select: 'fullName avatar role bio experience hourlyRate dailyRate weeklyRate monthlyRate currency skills certifications availability rating totalReviews location isEmailVerified languages serviceTypes workPreferences serviceRadius createdAt gender',
    };

    // Try by Caregiver document _id first
    let caregiverDoc = await Caregiver.findById(caregiverId)
      .populate(populateOptions)
      .lean();

    // Fallback: caregiverId might be a User _id (e.g. from profile edit page or admin panel)
    if (!caregiverDoc || !caregiverDoc.userId) {
      caregiverDoc = await Caregiver.findOne({ userId: caregiverId })
        .populate(populateOptions)
        .lean();
    }

    if (!caregiverDoc || !caregiverDoc.userId) {
      throw ApiError.notFound('Caregiver not found');
    }

    // Merge user-level and caregiver-level data into a single profile object
    const user = caregiverDoc.userId;
    return {
      _id: caregiverDoc._id,          // Caregiver document _id (used for booking/profile routes)
      userId: user._id,               // User _id (for internal references)
      fullName: user.fullName,
      avatar: user.avatar,
      gender: user.gender,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      location: user.location,
      createdAt: user.createdAt,
      rating: caregiverDoc.rating ?? user.rating,
      totalReviews: caregiverDoc.totalReviews ?? user.totalReviews,
      bio: caregiverDoc.bio || user.bio,
      headline: caregiverDoc.headline,
      experience: caregiverDoc.experience ?? user.experience,
      hourlyRate: caregiverDoc.hourlyRate ?? user.hourlyRate,
      dailyRate: caregiverDoc.dailyRate ?? user.dailyRate,
      weeklyRate: caregiverDoc.weeklyRate ?? user.weeklyRate,
      monthlyRate: caregiverDoc.monthlyRate ?? user.monthlyRate,
      currency: caregiverDoc.currency || user.currency,
      skills: caregiverDoc.skills?.length ? caregiverDoc.skills : (user.skills || []),
      certifications: caregiverDoc.certifications || user.certifications || [],
      languages: caregiverDoc.languages?.length ? caregiverDoc.languages : (user.languages || []),
      serviceTypes: caregiverDoc.serviceTypes?.length ? caregiverDoc.serviceTypes : (user.serviceTypes || []),
      workPreferences: caregiverDoc.workPreferences?.length ? caregiverDoc.workPreferences : (user.workPreferences || []),
      availability: caregiverDoc.availability || user.availability,
      serviceRadius: caregiverDoc.serviceRadius ?? user.serviceRadius,
      serviceAreas: caregiverDoc.serviceAreas || [],
      backgroundCheck: caregiverDoc.backgroundCheck,
      verified: caregiverDoc.verified || false,
      featured: caregiverDoc.featured || false,
      completedJobs: caregiverDoc.completedJobs || 0,
      responseRate: caregiverDoc.responseRate,
      responseTime: caregiverDoc.responseTime,
      completionPercentage: caregiverDoc.completionPercentage || 0,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    const allowedFields = [
      'fullName', 'phone', 'age', 'gender', 'location', 'avatar',
      // Common fields
      'bio', 'languages',
      // Caregiver fields
      'experience', 'hourlyRate', 'dailyRate', 'weeklyRate', 'monthlyRate',
      'skills', 'certifications', 'availability', 'serviceTypes', 'workPreferences',
      'serviceRadius', 'previousEmployers', 'emergencyContact', 'bankDetails',
      // Careseeker fields
      'careNeeds', 'preferredSchedule', 'budget', 'familyMembers',
    ];

    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Clean up empty date strings in certifications so Mongoose doesn't
    // throw a CastError when trying to cast "" → Date
    if (filteredData.certifications) {
      filteredData.certifications = filteredData.certifications.map((cert) => {
        const cleaned = { ...cert };
        if (cleaned.issueDate === '' || cleaned.issueDate === null) delete cleaned.issueDate;
        if (cleaned.expiryDate === '' || cleaned.expiryDate === null) delete cleaned.expiryDate;
        return cleaned;
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: filteredData },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Sync caregiver-specific fields to the Caregiver document so the
    // public profile (which reads from the Caregiver collection) stays
    // up to date.
    if (user.role === USER_ROLES.CAREGIVER) {
      const caregiverFields = [
        'bio', 'experience', 'hourlyRate', 'dailyRate', 'weeklyRate',
        'monthlyRate', 'currency', 'skills', 'certifications',
        'serviceTypes', 'workPreferences', 'availability', 'serviceRadius',
        'languages', 'previousEmployers', 'emergencyContact',
      ];
      const caregiverUpdate = {};
      for (const field of caregiverFields) {
        if (filteredData[field] !== undefined) {
          caregiverUpdate[field] = filteredData[field];
        }
      }
      if (Object.keys(caregiverUpdate).length > 0) {
        await Caregiver.findOneAndUpdate(
          { userId },
          { $set: caregiverUpdate },
          { new: true, runValidators: true }
        );
      }
    }

    // Update profile completion percentage
    await this.updateProfileCompletion(user);

    return user;
  }

  /**
   * Update user avatar with Cloudinary upload
   */
  async updateAvatar(userId, file) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Archive old avatar before replacing
    const oldEntry = user.avatarPublicId
      ? { url: user.avatar || '', publicId: user.avatarPublicId, action: 'delete', createdAt: new Date() }
      : null;

    // Delete old avatar from Cloudinary if it exists
    if (user.avatarPublicId && config.cloudinary.enabled) {
      try {
        await deleteFromCloudinary(user.avatarPublicId, 'image');
      } catch (error) {
        console.error('Failed to delete old avatar from Cloudinary:', error);
      }
    }

    // Upload new avatar to Cloudinary
    let avatarData;
    try {
      avatarData = await uploadAvatar(file.buffer, userId);
    } catch (error) {
      console.error('Cloudinary avatar upload error:', error);
      throw ApiError.serverError('Failed to upload avatar to cloud storage');
    }

    const historyPush = [{ url: avatarData.url, publicId: avatarData.publicId, action: 'upload', createdAt: new Date() }];
    if (oldEntry) historyPush.unshift(oldEntry);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: { avatar: avatarData.url, avatarPublicId: avatarData.publicId },
        $push: { avatarHistory: { $each: historyPush } },
      },
      { new: true }
    );

    await this.updateProfileCompletion(updatedUser);
    return updatedUser;
  }

  /**
   * Remove user avatar — deletes from Cloudinary and clears DB fields
   */
  async removeAvatar(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (user.avatarPublicId && config.cloudinary.enabled) {
      try {
        await deleteFromCloudinary(user.avatarPublicId, 'image');
      } catch (error) {
        console.error('Failed to delete avatar from Cloudinary:', error);
      }
    }

    const historyEntry = user.avatar
      ? { url: user.avatar, publicId: user.avatarPublicId || '', action: 'delete', createdAt: new Date() }
      : null;

    const updateOp = {
      $unset: { avatar: '', avatarPublicId: '' },
    };
    if (historyEntry) {
      updateOp.$push = { avatarHistory: historyEntry };
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateOp, { new: true });
    await this.updateProfileCompletion(updatedUser);
    return updatedUser;
  }

  /**
   * Complete profile for OAuth users
   */
  async completeProfile(userId, profileData) {
    const { role, phone, age, gender, location } = profileData;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          role,
          phone,
          age,
          gender,
          location,
          isProfileComplete: true,
          status: USER_STATUS.ACTIVE,
        },
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Check and update profile completion status
   */
  async checkProfileCompletion(user) {
    const requiredFields = ['fullName', 'email', 'phone', 'age', 'gender', 'role'];
    const isComplete = requiredFields.every((field) => user[field]);

    if (isComplete !== user.isProfileComplete) {
      await User.findByIdAndUpdate(user._id, { isProfileComplete: isComplete });
    }

    return isComplete;
  }

  /**
   * Get user with documents
   */
  async getUserWithDocuments(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const documents = await Document.getUserDocuments(userId);

    return { user, documents };
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          status: USER_STATUS.DELETED,
          email: `deleted_${userId}@deleted.com`,
        },
      },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return { message: 'Account deleted successfully' };
  }

  /**
   * Get all users (Admin)
   */
  async getAllUsers(query = {}) {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update user status (Admin)
   */
  async updateUserStatus(userId, status) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { status } },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    invalidateCachedUser(user._id);

    return user;
  }

  /**
   * Increment caregiver profile views
   */
  async incrementProfileViews(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { profileViews: 1 } },
      { new: true }
    );
    return user;
  }

  /**
   * Get public caregiver profile with view tracking
   */
  async getPublicCaregiverProfileWithTracking(caregiverId, viewerId = null) {
    const profile = await this.getPublicCaregiverProfile(caregiverId);
    
    // Use the real User _id (not the Caregiver _id) for view tracking
    const realUserId = profile.userId?.toString();

    // Increment view count if viewer is different from profile owner
    if (viewerId && viewerId.toString() !== realUserId) {
      await this.incrementProfileViews(realUserId).catch(() => {});
    } else if (!viewerId) {
      // Guest view
      await this.incrementProfileViews(realUserId).catch(() => {});
    }

    return profile;
  }

  /**
   * Update profile completion percentage for caregivers
   */
  async updateProfileCompletion(user) {
    if (user.role !== USER_ROLES.CAREGIVER) return;

    const fields = {
      fullName: !!user.fullName,
      phone: !!user.phone,
      age: !!user.age,
      gender: !!user.gender,
      bio: !!user.bio && user.bio.length > 50,
      avatar: !!user.avatar,
      experience: user.experience >= 0,
      hourlyRate: user.hourlyRate > 0,
      skills: user.skills && user.skills.length > 0,
      serviceTypes: user.serviceTypes && user.serviceTypes.length > 0,
      availability: user.availability && user.availability.days && user.availability.days.length > 0,
      location: user.location && (user.location.city || user.location.address),
      languages: user.languages && user.languages.length > 0,
      workPreferences: user.workPreferences && user.workPreferences.length > 0,
    };

    const completedFields = Object.values(fields).filter(Boolean).length;
    const totalFields = Object.keys(fields).length;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    await User.findByIdAndUpdate(user._id, { 
      completionPercentage,
      isProfileComplete: completionPercentage >= 70, 
    });

    return completionPercentage;
  }

  /**
   * Update caregiver availability calendar
   */
  async updateAvailabilityCalendar(userId, calendarData) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          'availability.calendar': calendarData.calendar,
          'availability.days': calendarData.days,
          'availability.hours': calendarData.hours,
          'availability.blockedDates': calendarData.blockedDates,
        } 
      },
      { new: true }
    );

    return updatedUser;
  }

  /**
   * Update caregiver rates
   */
  async updateCaregiverRates(userId, ratesData) {
    const rateFields = ['hourlyRate', 'dailyRate', 'weeklyRate', 'monthlyRate'];
    const updates = {};
    for (const field of rateFields) {
      if (ratesData[field] !== undefined) {
        updates[field] = ratesData[field];
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return updatedUser;
  }
  /**
   * Get caregiver dashboard stats
   */
  async getCaregiverDashboardStats(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      profileViews: user.profileViews || 0,
      rating: user.rating || 0,
      totalReviews: user.totalReviews || 0,
      completionPercentage: user.completionPercentage || 0,
      earnings: user.earnings || { total: 0, pending: 0, withdrawn: 0 },
      ratingBreakdown: user.ratingBreakdown || {},
      featured: user.featured || false,
      backgroundCheck: user.backgroundCheck || { status: 'not_started' },
    };
  }

  /**
   * Get caregivers for admin with extended details
   */
  async getCaregiversForAdmin(query = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      backgroundCheckStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter = { role: USER_ROLES.CAREGIVER };

    if (status) filter.status = status;
    if (backgroundCheckStatus) filter['backgroundCheck.status'] = backgroundCheckStatus;
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [caregivers, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return {
      caregivers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update background check status (Admin)
   */
  async updateBackgroundCheckStatus(userId, backgroundCheckData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { backgroundCheck: backgroundCheckData } },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }

  /**
   * Toggle caregiver featured status (Admin)
   */
  async toggleFeaturedStatus(userId, featured) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { featured } },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return user;
  }
}

export default new UserService();
