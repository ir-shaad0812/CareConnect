"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Banknote,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Lightbulb,
  Zap,
  TrendingUp,
  Award,
} from "lucide-react";
import { authService } from "@/modules/auth/services";
import { userService } from "@/modules/user/services";
import { useAuthContext } from "@/context/AuthContext";
import { extractStatusCode } from "@/types/errors.types";
import { CaregiverLayout } from "../components";

interface RatesData {
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  serviceRadius: number;
}

export default function RatesPage() {
  const router = useRouter();
  const { user: authUser, isLoading: isAuthLoading } = useAuthContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const [rates, setRates] = useState<RatesData>({
    hourlyRate: 0,
    dailyRate: 0,
    weeklyRate: 0,
    monthlyRate: 0,
    serviceRadius: 25,
  });

  const suggestedDailyRate = rates.hourlyRate * 8;
  const suggestedWeeklyRate = rates.hourlyRate * 40;
  const suggestedMonthlyRate = rates.hourlyRate * 160;

  const fetchRates = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await userService.getProfile();

      if (response.success && response.data) {
        const user = response.data.user;

        setRates({
          hourlyRate: user.hourlyRate || 0,
          dailyRate: (user as { dailyRate?: number }).dailyRate || 0,
          weeklyRate: (user as { weeklyRate?: number }).weeklyRate || 0,
          monthlyRate: (user as { monthlyRate?: number }).monthlyRate || 0,
          serviceRadius: (user as { serviceRadius?: number }).serviceRadius || 25,
        });
      }
    } catch (err) {
      const statusCode = extractStatusCode(err);
      if (statusCode === 401) {
        router.replace("/login?redirect=/dashboard/caregiver/rates");
        return;
      }

      if (statusCode === 403) {
        if (authUser?.role === "caregiver") {
          router.replace("/dashboard/pending");
          return;
        }

        const fallbackRoute = authService.getDashboardPathForRole(authUser?.role);
        router.replace(fallbackRoute || "/dashboard");
        return;
      }

      console.error("Error fetching rates:", err);
      setError("Failed to load rates");
    } finally {
      setIsLoading(false);
    }
  }, [router, authUser?.role]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!authUser) {
        setIsLoading(false);
      return;
    }

    if (authUser.role && authUser.role !== "caregiver") {
        setIsLoading(false);
      return;
    }

    void fetchRates();
  }, [isAuthLoading, authUser?._id, authUser?.role, router, fetchRates]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError("");

      await userService.updateRates({
        hourlyRate: rates.hourlyRate,
        dailyRate: rates.dailyRate,
        weeklyRate: rates.weeklyRate,
        monthlyRate: rates.monthlyRate,
      });

      setSuccessMessage("Rates updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error saving rates:", err);
      setError("Failed to save rates");
    } finally {
      setIsSaving(false);
    }
  };

  const applySuggestedRates = () => {
    setRates((prev) => ({
      ...prev,
      dailyRate: suggestedDailyRate,
      weeklyRate: suggestedWeeklyRate,
      monthlyRate: suggestedMonthlyRate,
    }));
  };

  if (isLoading) {
    return (
      <CaregiverLayout pageTitle="Rates">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
              <div className="absolute inset-0 rounded-full border-[3px] border-[#39B54A] border-t-transparent animate-spin" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Loading rates...</p>
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  const rateFields = [
    {
      key: "hourlyRate" as const,
      label: "Hourly Rate",
      suffix: "/hour",
      desc: "This is your base rate for hourly services",
      required: true,
      step: "0.50",
      suggested: null as number | null,
    },
    {
      key: "dailyRate" as const,
      label: "Daily Rate",
      suffix: "/day",
      desc: "Typically 8 hours of work",
      required: false,
      step: "1",
      suggested: rates.hourlyRate > 0 ? suggestedDailyRate : null,
    },
    {
      key: "weeklyRate" as const,
      label: "Weekly Rate",
      suffix: "/week",
      desc: "For weekly arrangements (typically 40 hours)",
      required: false,
      step: "10",
      suggested: rates.hourlyRate > 0 ? suggestedWeeklyRate : null,
    },
    {
      key: "monthlyRate" as const,
      label: "Monthly Rate",
      suffix: "/month",
      desc: "For long-term arrangements",
      required: false,
      step: "50",
      suggested: rates.hourlyRate > 0 ? suggestedMonthlyRate : null,
    },
  ];

  return (
    <CaregiverLayout pageTitle="Rates">
      <div className="space-y-6 max-w-3xl">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manage Your Rates</h1>
            <p className="text-sm text-gray-500 mt-1">
              Set competitive rates to attract more clients
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#39B54A] text-white rounded-xl text-sm font-medium hover:bg-[#2d913c] transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? "Saving..." : "Save Rates"}
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-[#39B54A]/10 border border-[#39B54A]/20 rounded-xl text-[#39B54A]"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600"
          >
            <AlertCircle size={18} />
            <span className="text-sm font-medium">{error}</span>
          </motion.div>
        )}

        {/* Rates Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-100/80"
        >
          <div className="flex items-center gap-2 mb-6">
            <Banknote size={18} className="text-[#39B54A]" />
            <h2 className="text-base font-semibold text-gray-900">Service Rates (NPR)</h2>
          </div>

          <div className="space-y-5">
            {rateFields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.suggested !== null && (
                    <span className="text-xs text-[#39B54A] font-medium">
                      Suggested: Rs. {field.suggested.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    Rs.
                  </span>
                  <input
                    type="number"
                    value={rates[field.key] || ""}
                    onChange={(e) =>
                      setRates({ ...rates, [field.key]: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full pl-10 pr-16 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#39B54A]/20 focus:border-[#39B54A] outline-none bg-gray-50/50"
                    placeholder="0.00"
                    min="0"
                    step={field.step}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                    {field.suffix}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">{field.desc}</p>
              </div>
            ))}

            {rates.hourlyRate > 0 && (
              <button
                onClick={applySuggestedRates}
                className="w-full py-3 border-2 border-dashed border-[#39B54A]/40 text-[#39B54A] rounded-xl hover:bg-[#39B54A]/5 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                Apply Suggested Rates Based on Hourly
              </button>
            )}
          </div>
        </motion.div>

        {/* Service Area Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl p-6 border border-gray-100/80"
        >
          <div className="flex items-center gap-2 mb-6">
            <MapPin size={18} className="text-[#39B54A]" />
            <h2 className="text-base font-semibold text-gray-900">Service Area</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Service Radius</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="100"
                value={rates.serviceRadius}
                onChange={(e) =>
                  setRates({ ...rates, serviceRadius: parseInt(e.target.value) })
                }
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#39B54A]"
              />
              <div className="flex items-center gap-2 min-w-24">
                <input
                  type="number"
                  value={rates.serviceRadius}
                  onChange={(e) =>
                    setRates({ ...rates, serviceRadius: parseInt(e.target.value) || 1 })
                  }
                  className="w-16 px-3 py-2 border border-gray-200 rounded-lg text-center text-sm"
                  min="1"
                  max="100"
                />
                <span className="text-sm text-gray-500">km</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              You&apos;ll appear in search results for families within {rates.serviceRadius}km of
              your location
            </p>
          </div>
        </motion.div>

        {/* Nepal Market Price Ranges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="bg-white rounded-xl p-6 border border-gray-100/80"
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-[#39B54A]" />
            <h2 className="text-base font-semibold text-gray-900">Nepal Market Price Ranges</h2>
            <span className="ml-auto text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">2025 averages</span>
          </div>

          <div className="space-y-4">
            {[
              { label: "Hourly Rate", min: 500, max: 2500, current: rates.hourlyRate, unit: "/hr", tiers: [{ label: "Budget", range: "Rs. 500–800", color: "bg-blue-400" }, { label: "Standard", range: "Rs. 800–1,500", color: "bg-[#39B54A]" }, { label: "Premium", range: "Rs. 1,500–2,500+", color: "bg-purple-500" }] },
              { label: "Daily Rate", min: 2000, max: 15000, current: rates.dailyRate, unit: "/day", tiers: [{ label: "Budget", range: "Rs. 2k–5k", color: "bg-blue-400" }, { label: "Standard", range: "Rs. 5k–10k", color: "bg-[#39B54A]" }, { label: "Premium", range: "Rs. 10k–15k+", color: "bg-purple-500" }] },
              { label: "Weekly Rate", min: 8000, max: 60000, current: rates.weeklyRate, unit: "/wk", tiers: [{ label: "Budget", range: "Rs. 8k–20k", color: "bg-blue-400" }, { label: "Standard", range: "Rs. 20k–40k", color: "bg-[#39B54A]" }, { label: "Premium", range: "Rs. 40k–60k+", color: "bg-purple-500" }] },
              { label: "Monthly Rate", min: 20000, max: 180000, current: rates.monthlyRate, unit: "/mo", tiers: [{ label: "Budget", range: "Rs. 20k–60k", color: "bg-blue-400" }, { label: "Standard", range: "Rs. 60k–120k", color: "bg-[#39B54A]" }, { label: "Premium", range: "Rs. 120k–180k+", color: "bg-purple-500" }] },
            ].map((item) => {
              const pct = item.current > 0
                ? Math.min(100, Math.max(2, ((item.current - item.min) / (item.max - item.min)) * 100))
                : 0;
              const tier = item.current <= 0 ? null
                : item.current < item.min + (item.max - item.min) * 0.33 ? item.tiers[0]
                : item.current < item.min + (item.max - item.min) * 0.66 ? item.tiers[1]
                : item.tiers[2];

              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {tier && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${tier.color}`}>{tier.label}</span>
                      )}
                      <span className="text-sm font-bold text-gray-900">
                        {item.current > 0 ? `Rs. ${item.current.toLocaleString("en-NP")}${item.unit}` : <span className="text-gray-400 font-normal text-xs">Not set</span>}
                      </span>
                    </div>
                  </div>
                  {/* Range bar */}
                  <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="h-full bg-blue-400/30 flex-1 rounded-l-full" />
                      <div className="h-full bg-[#39B54A]/30 flex-1" />
                      <div className="h-full bg-purple-500/30 flex-1 rounded-r-full" />
                    </div>
                    {item.current > 0 && (
                      <div
                        className="absolute top-0 h-full w-1 bg-gray-800 rounded-full shadow-sm"
                        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between mt-1">
                    {item.tiers.map((t) => (
                      <span key={t.label} className="text-xs text-gray-400">{t.range}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Rate Tips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-linear-to-br from-[#39B54A]/5 to-white rounded-xl p-6 border border-[#39B54A]/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={18} className="text-[#39B54A]" />
            <h3 className="text-sm font-semibold text-gray-900">Rate Tips</h3>
          </div>
          <ul className="space-y-3">
            {[
              {
                icon: TrendingUp,
                text: 'Average hourly rate for caregivers in Nepal: Rs. 800–2,000/hour',
              },
              {
                icon: Award,
                text: "Specialized care (medical, special needs) typically commands 20-30% higher rates",
              },
              {
                icon: Banknote,
                text: "Offer discounts for longer commitments to attract more bookings",
              },
              {
                icon: CheckCircle2,
                text: "Complete your profile and add certifications to justify higher rates",
              },
            ].map((tip, i) => {
              const Icon = tip.icon;
              return (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <Icon size={15} className="text-[#39B54A] mt-0.5 shrink-0" />
                  <span>{tip.text}</span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      </div>
    </CaregiverLayout>
  );
}
