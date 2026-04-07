"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  Loader2,
  Send,
} from "lucide-react";
import { Footer, Navbar } from "@/components";
import {
  feedbackService,
  type FeedbackRecord,
  type FeedbackType,
} from "@/services";
import type { ApiError } from "@/types";
import { useAuthContext } from "@/context/AuthContext";

const FEEDBACK_TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: "bug_report", label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "complaint", label: "Complaint" },
  { value: "general", label: "General feedback" },
];

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-violet-100 text-violet-700",
  resolved: "bg-emerald-100 text-emerald-700",
};

const formatDate = (isoValue: string) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

export default function HelpPage() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    accountStatus,
    isVerified,
  } = useAuthContext();

  const [type, setType] = useState<FeedbackType>("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackRecord[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);

  const hasValidFeedbackInput = useMemo(() => {
    return title.trim().length >= 3 && description.trim().length >= 10;
  }, [title, description]);

  const feedbackAccessMessage = useMemo(() => {
    if (isAuthLoading) return null;
    if (!isAuthenticated) {
      return "Please sign in with a registered account to submit feedback.";
    }
    if (!isVerified) {
      return "Please verify your email before submitting feedback.";
    }
    if (accountStatus !== "active") {
      return "Your account must be active to submit feedback.";
    }
    return null;
  }, [accountStatus, isAuthLoading, isAuthenticated, isVerified]);

  const canUseFeedbackForm = !isAuthLoading && feedbackAccessMessage === null;
  const canSubmit = hasValidFeedbackInput && canUseFeedbackForm;

  const loadRecentFeedback = useCallback(async () => {
    if (!canUseFeedbackForm) {
      setRecentFeedback([]);
      setIsLoadingRecent(false);
      return;
    }

    setIsLoadingRecent(true);
    try {
      const response = await feedbackService.getMyFeedback({ page: 1, limit: 5 });
      setRecentFeedback(response.data?.feedback || []);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.statusCode !== 401 && apiError?.statusCode !== 403) {
        setSubmitError(apiError?.message || "Failed to load recent feedback.");
      }
      setRecentFeedback([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [canUseFeedbackForm]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    void loadRecentFeedback();
  }, [isAuthLoading, loadRecentFeedback]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!canUseFeedbackForm) {
      setSubmitError(
        feedbackAccessMessage || "Only verified active users can submit feedback.",
      );
      return;
    }

    if (!hasValidFeedbackInput || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await feedbackService.createFeedback({
        type,
        title: title.trim(),
        description: description.trim(),
        ...(screenshot ? { screenshot } : {}),
      });

      setSubmitSuccess(
        response.message || "Feedback submitted successfully. Thank you.",
      );
      setTitle("");
      setDescription("");
      setType("general");
      setScreenshot(null);
      await loadRecentFeedback();
    } catch (error) {
      const apiError = error as ApiError;
      setSubmitError(apiError?.message || "Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm text-primary-500 hover:text-[#2F4BDB] mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-14">
            <div className="w-16 h-16 mx-auto mb-6 bg-linear-to-br from-primary-500/10 to-secondary-500/10 rounded-2xl flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-primary-500" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Help Center
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find answers, contact support, or send direct platform feedback.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <MessageCircle className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-sm text-gray-600">
                Chat with our support team in real time for immediate assistance.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Mail className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-sm text-gray-600">
                Send us an email and we usually respond within 24 hours.
              </p>
            </div>
            <div className="bg-[#F0F5FF] rounded-2xl p-8 text-center hover:shadow-lg transition-shadow">
              <Phone className="w-10 h-10 text-primary-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
              <p className="text-sm text-gray-600">
                Call us during business hours for personalized help.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Send feedback</h2>
              <p className="text-sm text-gray-600 mb-5">
                Signed-in users can submit bug reports, feature requests, and complaints directly to our admin team.
              </p>

              {submitError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {submitSuccess}
                </div>
              )}

              {feedbackAccessMessage ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p>{feedbackAccessMessage}</p>
                  {!isAuthenticated && (
                    <Link
                      href="/login?redirect=/help"
                      className="mt-2 inline-flex font-semibold text-amber-900 underline"
                    >
                      Sign in to continue
                    </Link>
                  )}
                  {isAuthenticated && !isVerified && (
                    <Link
                      href="/verify-email"
                      className="mt-2 inline-flex font-semibold text-amber-900 underline"
                    >
                      Verify email
                    </Link>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="feedback-type" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Feedback type
                    </label>
                    <select
                      id="feedback-type"
                      value={type}
                      onChange={(event) => setType(event.target.value as FeedbackType)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    >
                      {FEEDBACK_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="feedback-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Title
                    </label>
                    <input
                      id="feedback-title"
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={180}
                      placeholder="Short summary of your feedback"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="feedback-description" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      id="feedback-description"
                      rows={6}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      maxLength={5000}
                      placeholder="Describe the issue or idea in detail"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="feedback-screenshot" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Screenshot (optional)
                    </label>
                    <input
                      id="feedback-screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setScreenshot(file);
                      }}
                      className="block w-full text-sm text-gray-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isSubmitting ? "Submitting..." : "Submit feedback"}
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Recent submissions</h2>
              <p className="text-sm text-gray-600 mb-4">Your latest feedback tickets and their status.</p>

              {isAuthLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : !canUseFeedbackForm ? (
                <p className="text-sm text-gray-500">
                  Recent feedback is available for verified active users only.
                </p>
              ) : isLoadingRecent ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              ) : recentFeedback.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No feedback found yet. Submit one above to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentFeedback.map((item) => (
                    <div key={item._id} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status] || "bg-gray-100 text-gray-700"}`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{item.feedbackId}</p>
                      <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
