"use client";

/**
 * OnboardingWizard — Profile completion wizard (Complete Profile)
 *
 * Handles both:
 *   • Local users  (email verified → Personal Info → Documents → Agreement)
 *   • OAuth users  (Google → Personal Info → Role → Documents → Agreement)
 *
 * Steps (local):  1 Personal Info  →  2 Documents  →  3 Agreement
 * Steps (OAuth):  1 Personal Info  →  2 Role  →  3 Documents  →  4 Agreement
 *
 * Submits multipart/form-data to POST /api/auth/onboarding/complete
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import RegisterStepper from "@/components/features/auth/RegisterStepper";
import StepPersonalDetails, {
  type PersonalDetailsData,
  type PersonalDetailsErrors,
  validatePersonalDetails,
} from "@/components/features/auth/steps/StepPersonalDetails";
import StepRoleSelection, {
  type UserRole,
} from "@/components/features/auth/steps/StepRoleSelection";
import StepDocumentUpload, {
  type DocumentFile,
  type LocationProofData,
} from "@/components/features/auth/steps/StepDocumentUpload";
import { StepAgreement, type AgreementData } from "@/components/features/auth/steps/StepAgreement";

import { authService } from "@/modules/auth/services/auth.service";
import { API_CONFIG } from "@/config";
import { getPostAuthRoute } from "@/lib/auth-routing";
import type { User } from "@/types";

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: "easeOut" },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  }),
};

const INITIAL_PERSONAL: PersonalDetailsData = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  password: "",
  confirmPassword: "",
};

function extractMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  if (err && typeof err === "object" && "message" in err)
    return String((err as { message: unknown }).message) || fallback;
  return fallback;
}

export function OnboardingWizard() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOAuth, setIsOAuth] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [personal, setPersonal] = useState<PersonalDetailsData>(INITIAL_PERSONAL);
  const [personalErrors, setPersonalErrors] = useState<PersonalDetailsErrors>({});
  const [role, setRole] = useState<UserRole | "">("");
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [locationProof, setLocationProof] = useState<LocationProofData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const bootstrapSession = useCallback(async () => {
    setIsBootstrapping(true);
    setBootstrapError(null);

    try {
      const response = await authService.getMeWithRefresh();
      const user = response.data?.user;

      if (!user) {
        router.replace("/login?reason=session_required");
        return;
      }

      const redirectTarget = getPostAuthRoute(user);
      if (redirectTarget !== "/onboarding") {
        router.replace(redirectTarget);
        return;
      }

      authService.updateStoredUser(user);
      setCurrentUser(user);

      const userIsOAuth = user.authProvider === "google";
      setIsOAuth(userIsOAuth);

      setPersonal((prev) => ({
        ...prev,
        fullName: user.fullName || prev.fullName,
        email: user.email || prev.email,
        phone: (user.phone as string | undefined) || prev.phone,
        gender: (user.gender as PersonalDetailsData["gender"]) || prev.gender,
      }));

      if (user.role === "caregiver" || user.role === "careseeker") {
        setRole(user.role);
      }

      const hasPhone = typeof user.phone === "string" && user.phone.trim().length > 0;
      const hasGender = typeof user.gender === "string" && user.gender.length > 0;
      const hasAge = typeof user.age === "number" && Number.isFinite(user.age) && user.age >= 18;
      const hasRequiredPersonalFields = hasPhone && hasGender && hasAge;

      // Start on the first incomplete onboarding step.
      setStep(hasRequiredPersonalFields ? 2 : 1);
    } catch {
      setBootstrapError("Unable to load your session. Please log in again.");
    } finally {
      setIsBootstrapping(false);
    }
  }, [router]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  // Steps config — Agreement is always the LAST step
  const needsRoleStep = !currentUser?.role;

  const steps = needsRoleStep
    ? [
        { id: 1, label: "Personal Info" },
        { id: 2, label: "Role" },
        { id: 3, label: "Documents" },
        { id: 4, label: "Agreement" },
      ]
    : [
        { id: 1, label: "Personal Info" },
        { id: 2, label: "Documents" },
        { id: 3, label: "Agreement" },
      ];

  const totalSteps = steps.length;

  const goNext = () => {
    setDirection(1);
    setStep((s) => s + 1);
    setGlobalError(null);
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
    setGlobalError(null);
  };

  const handlePersonalNext = () => {
    const errs = validatePersonalDetails(personal, {
      requireAddress: false,
      requirePassword: false,
    });
    if (Object.keys(errs).length > 0) {
      setPersonalErrors(errs);
      return;
    }
    setPersonalErrors({});
    goNext();
  };

  const handlePersonalChange = (field: keyof PersonalDetailsData, value: string) => {
    setPersonal((prev) => ({ ...prev, [field]: value }));
    if (personalErrors[field]) {
      setPersonalErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Called from StepDocumentUpload — advances to Agreement
  const handleDocumentsSubmit = () => {
    const effectiveRole = role || currentUser?.role;
    if (effectiveRole === "careseeker") {
      const ok =
        !!locationProof &&
        Number.isFinite(locationProof.coordinates?.lat) &&
        Number.isFinite(locationProof.coordinates?.lng) &&
        typeof locationProof.address === "string" &&
        locationProof.address.trim().length > 0;

      if (!ok) {
        setGlobalError("Live location verification is required for Care Seekers.");
        return;
      }
    }
    setGlobalError(null);
    goNext();
  };

  // Final submit — called from StepAgreement
  const handleFinalSubmit = async (agreement: AgreementData) => {
    const effectiveRole = role || currentUser?.role;

    if (!effectiveRole) {
      setGlobalError("Please select your role to continue.");
      return;
    }

    const profilePhone =
      typeof currentUser?.phone === "string" ? currentUser.phone.trim() : "";
    const normalizedPhone = personal.phone.trim() || profilePhone;
    const normalizedGender =
      personal.gender ||
      ((typeof currentUser?.gender === "string" ? currentUser.gender : "") as
        | PersonalDetailsData["gender"]
        | "");
    const hasProfileAge =
      typeof currentUser?.age === "number" &&
      Number.isFinite(currentUser.age) &&
      currentUser.age >= 18;

    const validationErrors: PersonalDetailsErrors = {};
    if (!normalizedPhone || !/^\+?[\d\s\-()]{10,}$/.test(normalizedPhone)) {
      validationErrors.phone = "Please enter a valid phone number (min 10 digits)";
    }
    if (!normalizedGender) {
      validationErrors.gender = "Please select your gender";
    }
    if (!personal.dateOfBirth && !hasProfileAge) {
      validationErrors.dateOfBirth = "Date of birth is required";
    }

    if (Object.keys(validationErrors).length > 0) {
      setPersonalErrors(validationErrors);
      setDirection(-1);
      setStep(1);
      setGlobalError("Please complete your personal details before submitting.");
      return;
    }

    setIsSubmitting(true);
    setPersonalErrors({});
    setGlobalError(null);

    try {
      const formData = new FormData();

      formData.append("phone", normalizedPhone);
      if (personal.dateOfBirth) formData.append("dateOfBirth", personal.dateOfBirth);
      formData.append("gender", normalizedGender);
      if (personal.address.trim()) formData.append("address", personal.address.trim());
      if (role) formData.append("role", role);

      // Agreement fields
      formData.append("agreementAccepted", "true");
      formData.append("agreementAcceptedAt", agreement.acceptedAt);
      formData.append("agreementVersion", agreement.version);

      documents.forEach((doc) => {
        if (doc.status !== "error") {
          formData.append("documents", doc.file, doc.file.name);
          formData.append("documentTypes", doc.type);
        }
      });

      if (locationProof) {
        formData.append("locationProof", JSON.stringify(locationProof));
      }

      const res = await fetch(`${API_CONFIG.BASE_URL}/auth/onboarding/complete`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const json = (await res.json()) as {
        data?: { user?: User };
        message?: string;
        success?: boolean;
      };

      if (!res.ok) {
        throw new Error((json as { message?: string }).message ?? "Profile submission failed. Please try again.");
      }

      const updatedUser = json.data?.user;
      if (updatedUser) {
        authService.updateStoredUser(updatedUser);
      }

      const routeUser =
        updatedUser ??
        (currentUser
          ? { ...currentUser, isProfileComplete: true }
          : null);

      if (routeUser) {
        router.push(getPostAuthRoute(routeUser));
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setGlobalError(extractMsg(err, "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Which panel to render
  const showPersonal = step === 1;
  const showRole = needsRoleStep && step === 2;
  const showDocs = needsRoleStep ? step === 3 : step === 2;
  const showAgreement = step === totalSteps;
  const effectiveRole = (role || currentUser?.role || "") as UserRole | "";

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-[#39B54A] border-t-transparent animate-spin" />
          </div>
          <p className="text-gray-600 font-medium">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Session Error</h2>
          <p className="text-gray-600 mb-6">{bootstrapError}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-3 bg-[#39B54A] text-white rounded-xl font-semibold hover:bg-primary-600 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#39B54A]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#39B54A]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-240 bg-white rounded-2xl shadow-2xl flex flex-col lg:flex-row overflow-hidden min-h-150">
        {/* Left panel */}
        <div className="lg:w-[36%] bg-linear-to-br from-[#39B54A] via-primary-600 to-primary-700 p-8 flex flex-col relative overflow-hidden">
          <div className="relative z-10 mb-8">
            <Logo variant="white" showText href="/home" />
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-white mb-1">
              {currentUser?.fullName ? `Welcome, ${currentUser.fullName.split(" ")[0]}!` : "Complete Your Profile"}
            </h2>
            <p className="text-white/75 text-sm leading-relaxed mb-8">
              {isOAuth
                ? "Connect with the care community by completing your profile."
                : "A few more details to activate your account."}
            </p>

            <div className="space-y-3">
              {steps.map((s, i) => {
                const done = step > s.id;
                const active = step === s.id;
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                        done
                          ? "bg-white text-[#39B54A]"
                          : active
                          ? "bg-white/30 text-white border-2 border-white"
                          : "bg-white/15 text-white/50"
                      }`}
                    >
                      {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        done ? "text-white" : active ? "text-white" : "text-white/50"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute top-8 right-8 w-20 h-20 rounded-full bg-white/20 blur-xl pointer-events-none" />
          <div className="absolute bottom-16 left-4 w-14 h-14 rounded-full bg-white/15 blur-lg pointer-events-none" />
        </div>

        {/* Right panel */}
        <div className="lg:w-[64%] flex flex-col p-8 overflow-y-auto bg-[#FAFBFF]">
          <div className="mb-6">
            <RegisterStepper steps={steps} current={step} />
          </div>

          <AnimatePresence>
            {globalError && (
              <motion.div
                key="global-error"
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-start gap-2 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{globalError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {showPersonal && (
                  <StepPersonalDetails
                    data={personal}
                    errors={personalErrors}
                    onChange={handlePersonalChange}
                    onNext={handlePersonalNext}
                    isOAuthOnboarding={isOAuth}
                  />
                )}

                {showRole && (
                  <StepRoleSelection
                    selectedRole={role}
                    onSelect={(r) => setRole(r)}
                    onNext={goNext}
                    onBack={goBack}
                    nextLabel="Continue →"
                  />
                )}

                {showDocs && effectiveRole !== "" && (
                  <StepDocumentUpload
                    role={effectiveRole}
                    documents={documents}
                    onDocumentsChange={setDocuments}
                    locationProof={locationProof}
                    onLocationProofChange={setLocationProof}
                    onBack={goBack}
                    onSubmit={handleDocumentsSubmit}
                    isSubmitting={false}
                  />
                )}

                {showDocs && effectiveRole === "" && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                    <p className="text-gray-600 font-medium">Role not selected yet.</p>
                    <button type="button" onClick={goBack} className="mt-4 text-sm text-[#39B54A] underline">
                      Go back to select your role
                    </button>
                  </div>
                )}

                {showAgreement && effectiveRole !== "" && (
                  <StepAgreement
                    role={effectiveRole as "caregiver" | "careseeker"}
                    userName={currentUser?.fullName || personal.fullName || "User"}
                    onBack={goBack}
                    onSubmit={handleFinalSubmit}
                    isSubmitting={isSubmitting}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
