"use client";

import { ShieldCheck } from "lucide-react";

interface TrustScoreBadgeProps {
  score: number;
}

function resolveLevel(score: number) {
  if (score >= 71) {
    return {
      label: "Trusted",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (score >= 31) {
    return {
      label: "Verified",
      className: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: "Basic",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  };
}

export default function TrustScoreBadge({ score }: TrustScoreBadgeProps) {
  const level = resolveLevel(score);

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${level.className}`}>
      <ShieldCheck className="h-3.5 w-3.5" />
      <span>{level.label}</span>
      <span className="opacity-80">{score}/100</span>
    </div>
  );
}
