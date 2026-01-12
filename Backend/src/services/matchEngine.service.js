/**
 * Match Scoring Engine
 * 
 * Production-grade weighted scoring system for caregiver matching.
 * Computes a transparent 0–100 match score with detailed breakdown.
 * 
 * Weight Distribution:
 *   40% — Skill & Certification Match
 *   20% — Availability Match
 *   15% — Distance / Proximity
 *   15% — Ratings & Reviews
 *   10% — Budget Compatibility
 * 
 * Every score is explainable — no opaque rankings.
 */

// ─── Default Weights ───────────────────────────────────────────────
const DEFAULT_WEIGHTS = {
  skills: 40,
  availability: 20,
  distance: 15,
  ratings: 15,
  budget: 10,
};

// ─── Concept Relationships (for semantic skill expansion) ──────────
const RELATED_CONCEPTS = {
  dementia_care: ['alzheimers_care', 'elderly_care', 'medication_management', 'companionship'],
  alzheimers_care: ['dementia_care', 'elderly_care', 'medication_management', 'companionship'],
  elderly_care: ['companionship', 'mobility_assistance', 'meal_preparation', 'medication_management', 'personal_hygiene'],
  child_care: ['meal_preparation', 'transportation'],
  special_needs: ['disability_care', 'mobility_assistance', 'personal_hygiene'],
  disability_care: ['special_needs', 'mobility_assistance', 'personal_hygiene'],
  post_surgery: ['medication_management', 'mobility_assistance', 'personal_hygiene', 'meal_preparation'],
  palliative_care: ['elderly_care', 'medication_management', 'companionship', 'personal_hygiene'],
  respite_care: ['companionship', 'elderly_care', 'child_care'],
  mobility_assistance: ['elderly_care', 'disability_care', 'transportation'],
  medication_management: ['elderly_care', 'post_surgery', 'palliative_care'],
  meal_preparation: ['elderly_care', 'child_care'],
  personal_hygiene: ['elderly_care', 'disability_care', 'post_surgery'],
  transportation: ['mobility_assistance', 'child_care'],
  companionship: ['elderly_care', 'respite_care'],
};

// ─── Skill keyword synonyms for natural language matching ──────────
const SKILL_SYNONYMS = {
  'gentle': ['patience', 'empathy', 'companionship', 'compassionate'],
  'patient': ['patience', 'empathy', 'gentle', 'calm'],
  'experienced': ['senior', 'expert', 'professional'],
  'medical': ['medication_management', 'post_surgery', 'palliative_care'],
  'cooking': ['meal_preparation'],
  'driving': ['transportation'],
  'bathing': ['personal_hygiene'],
  'memory': ['dementia_care', 'alzheimers_care'],
  'alzheimer': ['alzheimers_care', 'dementia_care'],
  'dementia': ['dementia_care', 'alzheimers_care'],
  'wheelchair': ['mobility_assistance', 'disability_care'],
  'overnight': ['live_in'],
  'live-in': ['live_in'],
  'part-time': ['part_time'],
  'full-time': ['full_time'],
};

/**
 * Main scoring function
 * @param {Object} caregiver - Caregiver document (populated with user data)
 * @param {Object} seekerCriteria - What the care seeker is looking for
 * @param {Object} weights - Optional custom weight overrides
 * @returns {Object} { matchScore, breakdown, reasons, category }
 */
export function computeMatchScore(caregiver, seekerCriteria, weights = {}) {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  // Normalize weights to sum to 100
  const totalWeight = Object.values(w).reduce((sum, v) => sum + v, 0);
  const normalizedWeights = {};
  for (const [key, val] of Object.entries(w)) {
    normalizedWeights[key] = (val / totalWeight) * 100;
  }

  // Compute individual dimension scores (each 0–100)
  const skillScore = computeSkillScore(caregiver, seekerCriteria);
  const availabilityScore = computeAvailabilityScore(caregiver, seekerCriteria);
  const distanceScore = computeDistanceScore(caregiver, seekerCriteria);
  const ratingsScore = computeRatingsScore(caregiver);
  const budgetScore = computeBudgetScore(caregiver, seekerCriteria);

  // Weighted composite
  const breakdown = {
    skills: Math.round((skillScore.score / 100) * normalizedWeights.skills),
    availability: Math.round((availabilityScore.score / 100) * normalizedWeights.availability),
    distance: Math.round((distanceScore.score / 100) * normalizedWeights.distance),
    ratings: Math.round((ratingsScore.score / 100) * normalizedWeights.ratings),
    budget: Math.round((budgetScore.score / 100) * normalizedWeights.budget),
  };

  const matchScore = Math.min(100, Math.max(0,
    breakdown.skills + breakdown.availability + breakdown.distance +
    breakdown.ratings + breakdown.budget
  ));

  // Collect human-readable reasons
  const reasons = [
    ...skillScore.reasons,
    ...availabilityScore.reasons,
    ...distanceScore.reasons,
    ...ratingsScore.reasons,
    ...budgetScore.reasons,
  ];

  // Categorize match quality
  const category = getMatchCategory(matchScore);

  return {
    matchScore,
    breakdown,
    rawScores: {
      skills: skillScore.score,
      availability: availabilityScore.score,
      distance: distanceScore.score,
      ratings: ratingsScore.score,
      budget: budgetScore.score,
    },
    reasons,
    category,
    weights: normalizedWeights,
  };
}

// ─── SKILL & CERTIFICATION SCORING (40%) ──────────────────────────

function computeSkillScore(caregiver, criteria) {
  const reasons = [];
  let score = 0;
  let factors = 0;

  const caregiverServices = (caregiver.serviceTypes || []).map(s => s.toLowerCase());
  const caregiverSkills = (caregiver.skills || []).map(s => s.toLowerCase());
  const caregiverCerts = (caregiver.certifications || []).map(c =>
    (c.name || c).toString().toLowerCase()
  );

  // 1. Service Type Match (50% of skill score)
  const requestedServices = (criteria.serviceTypes || criteria.careNeeds || []).map(s => s.toLowerCase());
  if (requestedServices.length > 0) {
    factors++;
    // Direct matches
    const directMatches = requestedServices.filter(s => caregiverServices.includes(s));
    const directMatchRate = directMatches.length / requestedServices.length;

    // Related concept matches (partial credit)
    let relatedMatchCount = 0;
    for (const requested of requestedServices) {
      if (!caregiverServices.includes(requested)) {
        const related = RELATED_CONCEPTS[requested] || [];
        if (related.some(r => caregiverServices.includes(r))) {
          relatedMatchCount++;
        }
      }
    }
    const relatedMatchRate = relatedMatchCount / requestedServices.length;
    
    // Direct = full credit, Related = 60% credit
    const serviceScore = Math.min(100, (directMatchRate * 100) + (relatedMatchRate * 60));
    score += serviceScore * 0.5;

    if (directMatchRate >= 0.9) {
      reasons.push(`${Math.round(directMatchRate * 100)}% service type match`);
    } else if (directMatchRate >= 0.5) {
      reasons.push(`${Math.round(directMatchRate * 100)}% service match with related experience`);
    } else if (relatedMatchCount > 0) {
      reasons.push('Has related care experience');
    }
  }

  // 2. Skills Match (30% of skill score)
  const requestedSkills = (criteria.skills || criteria.preferredSkills || []).map(s => s.toLowerCase());
  if (requestedSkills.length > 0) {
    factors++;
    const matchedSkills = requestedSkills.filter(s =>
      caregiverSkills.some(cs => cs.includes(s) || s.includes(cs))
    );
    const skillMatchRate = matchedSkills.length / requestedSkills.length;
    score += (skillMatchRate * 100) * 0.3;

    if (skillMatchRate >= 0.8) {
      reasons.push(`${Math.round(skillMatchRate * 100)}% skill compatibility`);
    }
  } else {
    // No specific skills requested — give credit for having skills
    if (caregiverSkills.length >= 5) {
      score += 80 * 0.3;
    } else if (caregiverSkills.length >= 3) {
      score += 60 * 0.3;
    } else if (caregiverSkills.length >= 1) {
      score += 40 * 0.3;
    }
  }

  // 3. Certifications Match (20% of skill score)
  const requestedCerts = (criteria.certifications || criteria.preferredCertifications || []).map(c => c.toLowerCase());
  if (requestedCerts.length > 0) {
    factors++;
    const matchedCerts = requestedCerts.filter(c =>
      caregiverCerts.some(cc => cc.includes(c) || c.includes(cc))
    );
    const certMatchRate = matchedCerts.length / requestedCerts.length;
    score += (certMatchRate * 100) * 0.2;

    if (matchedCerts.length > 0) {
      reasons.push(`${matchedCerts.length} matching certification${matchedCerts.length > 1 ? 's' : ''}`);
    }
  } else {
    // Bonus for verified certs
    const verifiedCerts = (caregiver.certifications || []).filter(c => c.verified);
    if (verifiedCerts.length > 0) {
      score += Math.min(100, verifiedCerts.length * 30) * 0.2;
      reasons.push(`${verifiedCerts.length} verified certification${verifiedCerts.length > 1 ? 's' : ''}`);
    } else if (caregiverCerts.length > 0) {
      score += Math.min(80, caregiverCerts.length * 20) * 0.2;
    }
  }

  // 4. Experience bonus
  const experience = caregiver.experience || 0;
  const minExperience = criteria.minExperience || 0;
  if (experience >= minExperience && experience > 0) {
    if (experience >= 10) {
      score += 10;
      reasons.push(`${experience}+ years of experience`);
    } else if (experience >= 5) {
      score += 7;
      reasons.push(`${experience} years of experience`);
    } else if (experience >= 2) {
      score += 4;
    }
  }

  // 5. Profile completeness bonus
  if (caregiver.completionPercentage >= 90) {
    score += 5;
  }

  // 6. Verified & Background check bonus
  if (caregiver.verified) {
    score += 3;
    reasons.push('Verified caregiver');
  }
  if (caregiver.backgroundCheck?.status === 'passed') {
    score += 3;
    if (criteria.backgroundCheckRequired) {
      reasons.push('Background check passed');
    }
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

// ─── AVAILABILITY SCORING (20%) ────────────────────────────────────

function computeAvailabilityScore(caregiver, criteria) {
  const reasons = [];
  let score = 50; // Default score when no specific schedule requested

  const caregiverDays = (caregiver.availability?.days || []).map(d => d.toLowerCase());
  const requestedDays = (criteria.preferredDays || criteria.days || []).map(d => d.toLowerCase());

  // 1. Day availability match
  if (requestedDays.length > 0 && caregiverDays.length > 0) {
    const matchedDays = requestedDays.filter(d => caregiverDays.includes(d));
    const dayMatchRate = matchedDays.length / requestedDays.length;
    score = dayMatchRate * 70;

    if (dayMatchRate >= 1) {
      reasons.push('Available on all requested days');
    } else if (dayMatchRate >= 0.7) {
      reasons.push(`Available ${matchedDays.length} of ${requestedDays.length} requested days`);
    } else if (dayMatchRate >= 0.4) {
      reasons.push(`Partial availability (${matchedDays.length}/${requestedDays.length} days)`);
    }
  } else if (caregiverDays.length >= 5) {
    score = 80;
    reasons.push('Available most of the week');
  } else if (caregiverDays.length >= 3) {
    score = 60;
  }

  // 2. Work preference match
  const requestedPrefs = (criteria.workPreferences || []).map(p => p.toLowerCase());
  const caregiverPrefs = (caregiver.workPreferences || []).map(p => p.toLowerCase());
  if (requestedPrefs.length > 0 && caregiverPrefs.length > 0) {
    const matchedPrefs = requestedPrefs.filter(p => caregiverPrefs.includes(p));
    if (matchedPrefs.length > 0) {
      score += 15;
      reasons.push(`Works ${matchedPrefs.join(', ').replace(/_/g, ' ')}`);
    }
  }

  // 3. Immediate availability bonus
  if (criteria.urgency === 'immediate' && caregiver.availability?.immediateAvailability) {
    score += 15;
    reasons.push('Available immediately');
  } else if (criteria.urgency === 'within_week') {
    if (caregiver.availability?.immediateAvailability) {
      score += 10;
      reasons.push('Available this week');
    }
  }

  // 4. Blocked dates check
  if (criteria.startDate) {
    const startDate = new Date(criteria.startDate);
    const isBlocked = (caregiver.blockedDates || []).some(bd => {
      const blocked = new Date(bd);
      return blocked.toDateString() === startDate.toDateString();
    });
    if (isBlocked) {
      score -= 30;
      reasons.push('May have scheduling conflicts');
    }
  }

  // 5. Response rate bonus
  if (caregiver.responseRate >= 90) {
    score += 5;
    reasons.push('Responds quickly');
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

// ─── DISTANCE SCORING (15%) ────────────────────────────────────────

function computeDistanceScore(caregiver, criteria) {
  const reasons = [];
  
  // If distance is pre-computed (from $geoNear)
  if (caregiver._distance != null) {
    const distKm = caregiver._distance / 1000; // meters → km
    return scoreDistance(distKm, criteria.maxDistance || 25, reasons);
  }

  // If both have coordinates, compute Haversine
  const seekerCoords = criteria.coordinates || criteria.location?.coordinates;
  const caregiverCoords = caregiver.userId?.location?.coordinates?.coordinates
    || caregiver._userLocation?.coordinates;

  if (seekerCoords && caregiverCoords && seekerCoords.length === 2 && caregiverCoords.length === 2) {
    const distKm = haversineDistance(
      seekerCoords[1], seekerCoords[0],
      caregiverCoords[1], caregiverCoords[0]
    );
    return scoreDistance(distKm, criteria.maxDistance || 25, reasons);
  }

  // City-level match fallback
  const seekerCity = (criteria.city || '').toLowerCase();
  const caregiverCity = (caregiver.userId?.location?.city || '').toLowerCase();
  const caregiverAreas = (caregiver.serviceAreas || []).map(a => (a.city || '').toLowerCase());

  if (seekerCity && (caregiverCity === seekerCity || caregiverAreas.includes(seekerCity))) {
    reasons.push('Located in your area');
    return { score: 80, reasons };
  }

  // State-level match
  const seekerState = (criteria.state || '').toLowerCase();
  const caregiverState = (caregiver.userId?.location?.state || '').toLowerCase();
  if (seekerState && caregiverState === seekerState) {
    reasons.push('In your state/region');
    return { score: 50, reasons };
  }

  // No location data → neutral
  return { score: 50, reasons };
}

function scoreDistance(distanceKm, maxDistance, reasons) {
  let score;
  if (distanceKm <= 2) {
    score = 100;
    reasons.push(`${distanceKm.toFixed(1)} km away`);
  } else if (distanceKm <= 5) {
    score = 90;
    reasons.push(`${distanceKm.toFixed(1)} km away`);
  } else if (distanceKm <= 10) {
    score = 75;
    reasons.push(`${distanceKm.toFixed(1)} km from your location`);
  } else if (distanceKm <= maxDistance) {
    score = Math.max(30, 75 - ((distanceKm - 10) / (maxDistance - 10)) * 45);
    reasons.push(`${distanceKm.toFixed(1)} km from your location`);
  } else {
    score = Math.max(0, 30 - ((distanceKm - maxDistance) / maxDistance) * 30);
    reasons.push(`${distanceKm.toFixed(1)} km away (outside preferred range)`);
  }
  return { score: Math.round(score), reasons };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// ─── RATINGS & REVIEWS SCORING (15%) ───────────────────────────────

function computeRatingsScore(caregiver) {
  const reasons = [];
  let score = 40; // Default for no reviews

  const rating = caregiver.rating || 0;
  const totalReviews = caregiver.totalReviews || 0;

  if (totalReviews === 0) {
    return { score: 40, reasons: ['New caregiver — no reviews yet'] };
  }

  // Rating component (0–70 points)
  const ratingScore = (rating / 5) * 70;

  // Review volume component (0–30 points) — logarithmic scale
  const volumeScore = Math.min(30, Math.log10(totalReviews + 1) * 20);

  score = ratingScore + volumeScore;

  // Generate reason
  if (rating >= 4.8 && totalReviews >= 10) {
    reasons.push(`Exceptional rating: ${rating.toFixed(1)}/5 (${totalReviews} reviews)`);
  } else if (rating >= 4.5) {
    reasons.push(`Highly rated: ${rating.toFixed(1)}/5 (${totalReviews} reviews)`);
  } else if (rating >= 4.0) {
    reasons.push(`Well rated: ${rating.toFixed(1)}/5 (${totalReviews} reviews)`);
  } else if (rating >= 3.5) {
    reasons.push(`${rating.toFixed(1)}/5 rating (${totalReviews} reviews)`);
  } else {
    reasons.push(`${rating.toFixed(1)}/5 from ${totalReviews} reviews`);
  }

  // Completed jobs bonus
  if (caregiver.completedJobs >= 50) {
    score += 5;
    reasons.push(`${caregiver.completedJobs}+ completed bookings`);
  } else if (caregiver.completedJobs >= 20) {
    score += 3;
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

// ─── BUDGET SCORING (10%) ──────────────────────────────────────────

function computeBudgetScore(caregiver, criteria) {
  const reasons = [];

  const budgetMin = criteria.budgetMin ?? criteria.budget?.min ?? null;
  const budgetMax = criteria.budgetMax ?? criteria.budget?.max ?? null;
  const budgetType = criteria.budgetType ?? criteria.budget?.type ?? 'hourly';

  // Determine the caregiver's rate for the relevant type
  let caregiverRate;
  switch (budgetType) {
    case 'daily':
      caregiverRate = caregiver.dailyRate;
      break;
    case 'weekly':
      caregiverRate = caregiver.weeklyRate;
      break;
    case 'monthly':
      caregiverRate = caregiver.monthlyRate;
      break;
    default:
      caregiverRate = caregiver.hourlyRate;
  }

  if (caregiverRate == null) {
    return { score: 50, reasons: ['Rate not specified'] };
  }

  if (budgetMax == null && budgetMin == null) {
    // No budget specified — give decent score to affordable caregivers
    return { score: 60, reasons: [] };
  }

  let score = 0;

  if (budgetMax != null && budgetMin != null) {
    // Within range = 100, slightly above = partial, way above = low
    if (caregiverRate >= budgetMin && caregiverRate <= budgetMax) {
      score = 100;
      reasons.push('Within your budget');
    } else if (caregiverRate < budgetMin) {
      // Below budget — still good, might be a deal
      const diff = (budgetMin - caregiverRate) / budgetMin;
      score = Math.max(60, 100 - diff * 50);
      reasons.push('Below your budget range');
    } else {
      // Above budget
      const overPercent = ((caregiverRate - budgetMax) / budgetMax) * 100;
      if (overPercent <= 10) {
        score = 70;
        reasons.push('Slightly above budget');
      } else if (overPercent <= 25) {
        score = 45;
        reasons.push('Above budget');
      } else {
        score = Math.max(10, 40 - overPercent);
        reasons.push('Significantly above budget');
      }
    }
  } else if (budgetMax != null) {
    if (caregiverRate <= budgetMax) {
      score = 100;
      reasons.push('Within your budget');
    } else {
      const overPercent = ((caregiverRate - budgetMax) / budgetMax) * 100;
      score = Math.max(10, 80 - overPercent);
      reasons.push(overPercent <= 15 ? 'Slightly above budget' : 'Above budget');
    }
  } else if (budgetMin != null) {
    if (caregiverRate >= budgetMin) {
      score = 90;
      reasons.push('Meets minimum rate');
    } else {
      score = 50;
    }
  }

  return { score: Math.min(100, Math.max(0, Math.round(score))), reasons };
}

// ─── HELPERS ───────────────────────────────────────────────────────

function getMatchCategory(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'low';
}

/**
 * Expand natural language terms into matched service types / skills
 */
export function expandSearchTerms(query) {
  const terms = query.toLowerCase().split(/\s+/);
  const expandedServiceTypes = new Set();
  const expandedSkills = new Set();
  const matchedConcepts = [];

  for (const term of terms) {
    // Check direct service type match
    for (const serviceType of Object.keys(RELATED_CONCEPTS)) {
      if (serviceType.includes(term) || term.includes(serviceType.replace(/_/g, ''))) {
        expandedServiceTypes.add(serviceType);
        // Add related concepts
        for (const related of RELATED_CONCEPTS[serviceType]) {
          expandedServiceTypes.add(related);
        }
        matchedConcepts.push({ term, matched: serviceType, type: 'service' });
      }
    }

    // Check synonyms
    for (const [synonym, mappings] of Object.entries(SKILL_SYNONYMS)) {
      if (term.includes(synonym) || synonym.includes(term)) {
        for (const mapping of mappings) {
          if (RELATED_CONCEPTS[mapping]) {
            expandedServiceTypes.add(mapping);
          } else {
            expandedSkills.add(mapping);
          }
        }
        matchedConcepts.push({ term, matched: synonym, type: 'synonym' });
      }
    }
  }

  return {
    serviceTypes: [...expandedServiceTypes],
    skills: [...expandedSkills],
    matchedConcepts,
    originalQuery: query,
  };
}

/**
 * Batch score multiple caregivers and return sorted results
 */
export function batchScoreCaregivers(caregivers, seekerCriteria, weights = {}) {
  const scored = caregivers.map(caregiver => {
    const result = computeMatchScore(caregiver, seekerCriteria, weights);
    return {
      caregiver,
      ...result,
    };
  });

  // Sort by matchScore descending, then by rating as tiebreaker
  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (b.caregiver.rating || 0) - (a.caregiver.rating || 0);
  });

  return scored;
}

export { DEFAULT_WEIGHTS, RELATED_CONCEPTS, SKILL_SYNONYMS };
