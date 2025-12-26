'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { AIMatchResult } from '@/types/aiMatch.types';
import { SERVICE_TYPE_LABELS } from '@/types/aiMatch.types';

// --- Match Score Gradient Colors -----------------------------------
function getScoreColor(score: number) {
  if (score >= 85) return { bg: 'from-emerald-500 to-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-500' };
  if (score >= 70) return { bg: 'from-blue-500 to-blue-600', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-500' };
  return { bg: 'from-gray-400 to-gray-500', text: 'text-gray-600', light: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-400' };
}

function getCategoryLabel(category: string, score: number) {
  if (category === 'excellent') return `Best Match for Your Needs · ${score}%`;
  if (category === 'good') return `Great Match · ${score}%`;
  if (category === 'fair') return `Good Option · ${score}%`;
  return `${score}% Compatibility`;
}

// --- Score Ring Component ------------------------------------------
function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#E5E7EB" strokeWidth="4" fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#scoreGradient)" strokeWidth="4" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={score >= 85 ? '#10B981' : score >= 70 ? '#3B82F6' : '#9CA3AF'} />
            <stop offset="100%" stopColor={score >= 85 ? '#059669' : score >= 70 ? '#2563EB' : '#6B7280'} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${color.text}`}>{score}</span>
      </div>
    </div>
  );
}

// --- Breakdown Bar -------------------------------------------------
function BreakdownBar({ label, value, maxValue, icon }: { label: string; value: number; maxValue: number; icon: string }) {
  const percentage = Math.min(100, (value / maxValue) * 100);
  const color = percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-blue-500' : 'bg-gray-400';
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-center">{icon}</span>
      <span className="w-20 text-gray-600 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-6 text-right text-gray-500 font-medium">{value}</span>
    </div>
  );
}

// --- Main Card Component -------------------------------------------

interface CaregiverMatchCardProps {
  result: AIMatchResult;
  onTrackInteraction?: (caregiverId: string, action: string) => void;
  showBreakdown?: boolean;
  compact?: boolean;
}

export default function CaregiverMatchCard({ 
  result, 
  onTrackInteraction, 
  showBreakdown: initialShowBreakdown = false,
  compact = false,
}: CaregiverMatchCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(initialShowBreakdown);
  const [isHovered, setIsHovered] = useState(false);
  const color = getScoreColor(result.matchScore);

  const handleCardClick = useCallback(() => {
    onTrackInteraction?.(result.caregiverId, 'profile_click');
  }, [result.caregiverId, onTrackInteraction]);

  const primaryRate = result.hourlyRate || result.dailyRate || result.weeklyRate || result.monthlyRate;
  const rateLabel = result.hourlyRate ? '/hr' : result.dailyRate ? '/day' : result.weeklyRate ? '/wk' : result.monthlyRate ? '/mo' : '';

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden
        ${isHovered ? `shadow-xl ${color.border} scale-[1.01]` : 'shadow-sm border-gray-100 hover:shadow-lg'}
        ${compact ? 'p-4' : 'p-5'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Match Badge */}
      {result.rank <= 3 && result.category === 'excellent' && (
        <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-semibold text-white rounded-bl-xl rounded-tr-2xl bg-linear-to-r ${color.bg}`}>
          {result.rank === 1 ? '? TOP MATCH' : `#${result.rank} MATCH`}
        </div>
      )}

      {/* Featured badge */}
      {result.featured && (
        <div className="absolute top-0 left-0 px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-br-xl rounded-tl-2xl border-b border-r border-amber-200">
          ? FEATURED
        </div>
      )}

      {/* Profile Header */}
      <Link href={`/caregiver/${result.caregiverId}`} onClick={handleCardClick}>
        <div className="flex items-start gap-3.5 mb-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-linear-to-br from-primary-500/10 to-secondary-500/10">
              {result.avatar ? (
                <Image
                  src={result.avatar}
                  alt={result.fullName}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary-500 to-secondary-500 text-white text-xl font-bold">
                  {result.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Verified badge */}
            {result.verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Name & meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-500 transition-colors">
                {result.fullName}
              </h3>
            </div>
            {result.headline && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{result.headline}</p>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {result.location.city && (
                <span className="flex items-center gap-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {result.location.city}{result.location.state ? `, ${result.location.state}` : ''}
                </span>
              )}
              {result.experience > 0 && (
                <span>{result.experience} yr{result.experience !== 1 ? 's' : ''} exp</span>
              )}
            </div>
          </div>

          {/* Score Ring */}
          <div className="shrink-0">
            <ScoreRing score={result.matchScore} />
          </div>
        </div>
      </Link>

      {/* Match Label */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg mb-3 ${color.light} ${color.border} border`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className={`text-xs font-medium ${color.text}`}>
          {getCategoryLabel(result.category, result.matchScore)}
        </span>
      </div>

      {/* Top Reasons (explainable AI) */}
      <div className="space-y-1 mb-3">
        {result.reasons.slice(0, 4).map((reason, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{reason}</span>
          </div>
        ))}
      </div>

      {/* Skills tags */}
      {result.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {result.skills.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-[#F0F5FF] text-primary-500 text-[10px] font-medium rounded-full"
            >
              {skill}
            </span>
          ))}
          {result.skills.length > 4 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-medium rounded-full">
              +{result.skills.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Service Types */}
      {result.serviceTypes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {result.serviceTypes.slice(0, 3).map((st) => (
            <span
              key={st}
              className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-medium rounded-full"
            >
              {SERVICE_TYPE_LABELS[st] || st.replace(/_/g, ' ')}
            </span>
          ))}
          {result.serviceTypes.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-medium rounded-full">
              +{result.serviceTypes.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Rating, Reviews, Certifications row */}
      <div className="flex items-center gap-3 mb-3 text-xs">
        {/* Rating */}
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
          </svg>
          <span className="font-semibold text-gray-900">{result.rating?.toFixed(1) || '—'}</span>
          <span className="text-gray-400">({result.totalReviews})</span>
        </div>

        {/* Background check badge */}
        {result.backgroundCheck === 'passed' && (
          <div className="flex items-center gap-0.5 text-emerald-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">BG Check</span>
          </div>
        )}

        {/* Response rate */}
        {result.responseRate >= 80 && (
          <div className="flex items-center gap-0.5 text-blue-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium">Fast Reply</span>
          </div>
        )}
      </div>

      {/* Collapsible Breakdown */}
      <button
        onClick={(e) => { e.preventDefault(); setShowBreakdown(!showBreakdown); }}
        className="w-full text-left text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-2 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {showBreakdown ? 'Hide score breakdown' : 'View score breakdown'}
      </button>
      
      {showBreakdown && (
        <div className={`space-y-1.5 p-3 rounded-lg mb-3 ${color.light} border ${color.border}`}>
          <BreakdownBar label="Skills" value={result.breakdown.skills} maxValue={40} icon="🎯" />
          <BreakdownBar label="Availability" value={result.breakdown.availability} maxValue={20} icon="📅" />
          <BreakdownBar label="Distance" value={result.breakdown.distance} maxValue={15} icon="📍" />
          <BreakdownBar label="Ratings" value={result.breakdown.ratings} maxValue={15} icon="⭐" />
          <BreakdownBar label="Budget" value={result.breakdown.budget} maxValue={10} icon="💰" />
        </div>
      )}

      {/* Price & CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          {primaryRate ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs font-semibold text-gray-400 mr-0.5">Rs.</span>
              <span className="text-lg font-bold text-[#39B54A]">
                {primaryRate.toLocaleString("en-NP")}
              </span>
              <span className="text-sm text-gray-500">{rateLabel}</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Contact for rates</span>
          )}
          {result.availability.immediateAvailability && (
            <p className="text-[10px] text-emerald-600 font-medium">Available Now</p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/caregiver/${result.caregiverId}`}
            onClick={handleCardClick}
            className="px-4 py-2 bg-[#F0F5FF] text-primary-500 text-sm font-medium rounded-lg hover:bg-primary-500 hover:text-white transition-all duration-200"
          >
            View Profile
          </Link>
          <Link
            href={`/book/${result.caregiverId}`}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-all duration-200 bg-linear-to-r ${color.bg} hover:shadow-md hover:scale-[1.02]`}
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
