"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  ChevronLeft,
  Shield,
  AlertCircle,
} from "lucide-react";

export type AgreementData = {
  accepted: boolean;
  acceptedAt: string;
  version: string;
};

interface StepAgreementProps {
  role: "caregiver" | "careseeker";
  userName: string;
  onBack: () => void;
  onSubmit: (data: AgreementData) => void;
  isSubmitting: boolean;
}

const AGREEMENT_VERSION = "v1.0";

function getCaregiverClauses() {
  return [
    {
      title: "Professional Standards",
      body: "I agree to provide care services to the highest professional standards, maintaining dignity, respect, and safety for all care recipients at all times.",
    },
    {
      title: "Background Verification",
      body: "I consent to background verification checks and agree that my credentials, certifications, and documents must be accurate and current. I will notify CareConnect of any changes immediately.",
    },
    {
      title: "Confidentiality",
      body: "I agree to maintain strict confidentiality of all care recipient personal, medical, and family information, both during and after any caregiving engagement.",
    },
    {
      title: "Booking & Payment Terms",
      body: "I agree to honor confirmed bookings and adhere to the payment and cancellation policies set by CareConnect. Cancellations must follow the prescribed notice periods.",
    },
    {
      title: "Safety & Incident Reporting",
      body: "I agree to promptly report any incidents, accidents, or safety concerns to both the care seeker family and CareConnect within 2 hours of occurrence.",
    },
    {
      title: "Platform Conduct",
      body: "I agree not to solicit or engage in off-platform transactions with care seekers found through CareConnect, and to comply with all platform policies.",
    },
    {
      title: "Termination Rights",
      body: "CareConnect reserves the right to suspend or terminate access for violation of these terms, fraudulent activity, or verified complaints from care seekers.",
    },
  ];
}

function getCareseekerClauses() {
  return [
    {
      title: "Accurate Care Needs",
      body: "I agree to provide accurate information about care needs, medical conditions, and any special requirements to ensure safe and appropriate caregiver matching.",
    },
    {
      title: "Respectful Environment",
      body: "I agree to maintain a safe, respectful, and non-discriminatory environment for caregivers, and will not subject caregivers to harassment, abuse, or unsafe conditions.",
    },
    {
      title: "Payment Obligations",
      body: "I agree to make payments as required and on time through the CareConnect platform. I understand that off-platform payments void CareConnect protection guarantees.",
    },
    {
      title: "Booking Commitments",
      body: "I agree to honor confirmed bookings and follow the cancellation policy. Repeated last-minute cancellations may result in account restrictions.",
    },
    {
      title: "Privacy of Caregivers",
      body: "I agree not to share caregiver contact details, engage in unsolicited contact outside the platform, or solicit caregivers to bypass the platform.",
    },
    {
      title: "Feedback & Reviews",
      body: "I agree to provide honest, factual, and fair reviews of caregiver services after completed engagements, and not to submit false or malicious reviews.",
    },
    {
      title: "Platform Policies",
      body: "I agree to comply with all CareConnect platform policies and understand that violations may result in account suspension or permanent termination.",
    },
  ];
}

export function StepAgreement({
  role,
  userName,
  onBack,
  onSubmit,
  isSubmitting,
}: StepAgreementProps) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clauses = role === "caregiver" ? getCaregiverClauses() : getCareseekerClauses();
  const roleLabel = role === "caregiver" ? "Caregiver" : "Care Seeker";

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const content = [
      `CARECONNECT ${roleLabel.toUpperCase()} SERVICE AGREEMENT`,
      `Version: ${AGREEMENT_VERSION}`,
      `Date: ${new Date().toLocaleDateString("en-NP")}`,
      `Name: ${userName}`,
      "",
      ...clauses.flatMap((c, i) => [
        `${i + 1}. ${c.title}`,
        c.body,
        "",
      ]),
      "By accepting this agreement digitally, you confirm you have read, understood,",
      "and agree to be bound by all the terms stated above.",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CareConnect-${roleLabel}-Agreement-${AGREEMENT_VERSION}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    if (!agreed) {
      setError("You must read and agree to the terms before submitting.");
      return;
    }
    onSubmit({
      accepted: true,
      acceptedAt: new Date().toISOString(),
      version: AGREEMENT_VERSION,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Service Agreement</h2>
        <p className="text-sm text-gray-500 mt-1">
          Please read and accept the {roleLabel} Service Agreement to complete your profile.
        </p>
      </div>

      {/* Document toolbar */}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:bg-gray-50"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:bg-gray-50"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>

      {/* Agreement content */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-[#39B54A] to-emerald-600 px-5 py-4 flex items-center gap-3">
          <FileText className="w-5 h-5 text-white shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">
              CareConnect {roleLabel} Service Agreement
            </p>
            <p className="text-white/70 text-xs">
              Version {AGREEMENT_VERSION} · Effective immediately upon acceptance
            </p>
          </div>
        </div>

        <div className="p-5 max-h-72 overflow-y-auto space-y-4 text-sm">
          <p className="text-gray-700 leading-relaxed">
            This Service Agreement (&quot;Agreement&quot;) is entered into between{" "}
            <strong>{userName}</strong> (&quot;{roleLabel}&quot;) and CareConnect
            Platform (&quot;CareConnect&quot;). By accepting, you agree to all terms below.
          </p>

          {clauses.map((clause, i) => (
            <div key={i} className="space-y-1">
              <h4 className="font-semibold text-gray-800">
                {i + 1}. {clause.title}
              </h4>
              <p className="text-gray-600 leading-relaxed">{clause.body}</p>
            </div>
          ))}

          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 italic">
              By accepting this agreement digitally, you confirm you have read, understood,
              and agree to be bound by all the terms stated above. This acceptance is
              legally binding and timestamped.
            </p>
          </div>
        </div>
      </div>

      {/* Trust note */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5">
        <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800 leading-relaxed">
          Your acceptance is cryptographically timestamped and stored securely.
          This agreement protects both you and the people you connect with on CareConnect.
        </p>
      </div>

      {/* Consent checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            agreed
              ? "bg-[#39B54A] border-[#39B54A]"
              : "border-gray-300 group-hover:border-[#39B54A]"
          }`}
          onClick={() => {
            setAgreed((v) => !v);
            setError(null);
          }}
        >
          {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>
        <span
          className="text-sm text-gray-700 leading-relaxed"
          onClick={() => {
            setAgreed((v) => !v);
            setError(null);
          }}
        >
          I have read, understood, and agree to the CareConnect {roleLabel} Service
          Agreement ({AGREEMENT_VERSION}). I confirm that the information I have
          provided is accurate and complete.
        </span>
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !agreed}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#39B54A] hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition text-sm"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Accept &amp; Submit Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
