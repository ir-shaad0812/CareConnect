"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Shield,
  Loader2,
  MapPin,
} from "lucide-react";
import TrustScoreBadge from "@/components/features/location/TrustScoreBadge";

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(
  () => import("@/modules/property/components/LocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-100 bg-gray-100 rounded-xl flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    ),
  }
);

// --- Types --------------------------------------------------------------------

export type DocumentType = "id_proof" | "address_proof" | "certification";

// Location data type from LocationPicker
export interface LocationProofData {
  locationName?: string;
  placeId?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  selectedCoordinates?: {
    lat: number;
    lng: number;
  };
  gpsCoordinates?: {
    lat: number;
    lng: number;
  };
  distanceKm?: number;
  gpsVerified?: boolean;
  trustScore?: number;
  accuracy: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  capturedAt: string;
}

export interface DocumentFile {
  type: DocumentType;
  file: File;
  preview: string | null;   // Object URL for images, null for PDFs
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export interface DocumentRequirement {
  type: DocumentType;
  label: string;
  description: string;
  acceptedFormats: string;
  required: boolean;
  forRoles: ("caregiver" | "careseeker")[];
}

const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    type: "id_proof",
    label: "Government-Issued ID",
    description: "Passport, driver's licence, or national ID card",
    acceptedFormats: ".jpg,.jpeg,.png,.pdf",
    required: false,
    forRoles: ["caregiver", "careseeker"],
  },
  {
    type: "address_proof",
    label: "Proof of Address Document",
    description: "Utility bill or bank statement issued within the last 3 months",
    acceptedFormats: ".jpg,.jpeg,.png,.pdf",
    required: false,
    forRoles: ["caregiver"],
  },
  {
    type: "certification",
    label: "Professional Certification",
    description: "Relevant care or medical qualification certificates",
    acceptedFormats: ".jpg,.jpeg,.png,.pdf",
    required: true,
    forRoles: ["caregiver"],
  },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

interface Props {
  role: "caregiver" | "careseeker";
  documents: DocumentFile[];
  onDocumentsChange: (docs: DocumentFile[]) => void;
  locationProof: LocationProofData | null;
  onLocationProofChange: (location: LocationProofData | null) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

// --- Helpers ------------------------------------------------------------------

function buildPreview(file: File): string | null {
  if (file.type.startsWith("image/")) return URL.createObjectURL(file);
  return null;
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Accepted: JPG, PNG, PDF";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum size is 5 MB";
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Sub-Components -----------------------------------------------------------

interface UploadZoneProps {
  requirement: DocumentRequirement;
  current: DocumentFile | undefined;
  onAdd: (file: File) => void;
  onRemove: () => void;
}

function UploadZone({ requirement, current, onAdd, onRemove }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputId = `doc-upload-${requirement.type}`;

  const handleFile = useCallback(
    (file: File) => {
      const errMsg = validateFile(file);
      if (errMsg) {
        // still call onAdd so parent can set error state
        onAdd(Object.assign(file, { _validationError: errMsg }));
      } else {
        onAdd(file);
      }
    },
    [onAdd]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // -- Uploaded state --------------------------------------------------------
  if (current) {
    const isImage = current.file.type.startsWith("image/");
    const statusColors = {
      pending: "border-yellow-300 bg-yellow-50",
      uploading: "border-blue-300 bg-blue-50",
      success: "border-green-300 bg-green-50",
      error: "border-red-300 bg-red-50",
    };

    return (
      <div className={`rounded-xl border-2 p-4 transition-colors ${statusColors[current.status]}`}>
        <div className="flex items-start gap-3">
          {/* Preview */}
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0 flex items-center justify-center">
            {isImage && current.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.preview} alt="doc preview" className="w-full h-full object-cover" />
            ) : (
              <FileText className="w-7 h-7 text-gray-400" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{current.file.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(current.file.size)}</p>
            <div className="flex items-center gap-1 mt-1">
              {current.status === "uploading" && (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                  <span className="text-xs text-blue-600">Uploading…</span>
                </>
              )}
              {current.status === "success" && (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-600">Uploaded</span>
                </>
              )}
              {current.status === "error" && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs text-red-600">{current.errorMessage || "Error"}</span>
                </>
              )}
              {current.status === "pending" && (
                <span className="text-xs text-yellow-600">Ready to submit</span>
              )}
            </div>
          </div>

          {/* Remove */}
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-full hover:bg-white/60 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // -- Empty / drop zone state -------------------------------------------------
  return (
    <label
      htmlFor={inputId}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${
        isDragging
          ? "border-primary-500 bg-primary-500/5 scale-[1.01]"
          : "border-gray-200 hover:border-primary-500/50 hover:bg-gray-50"
      }`}
    >
      <input
        id={inputId}
        type="file"
        accept={requirement.acceptedFormats}
        className="sr-only"
        onChange={handleChange}
      />
      <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
        <Upload className="w-5 h-5 text-primary-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          <span className="text-primary-500">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or PDF · Max 5 MB</p>
      </div>
    </label>
  );
}

// --- Main Component -----------------------------------------------------------

export default function StepDocumentUpload({
  role,
  documents,
  onDocumentsChange,
  locationProof,
  onLocationProofChange,
  onBack,
  onSubmit,
  isSubmitting,
}: Props) {
  const documentRequirements = DOCUMENT_REQUIREMENTS.filter((r) =>
    r.forRoles.includes(role)
  );

  const requiredDocTypes: DocumentType[] =
    role === "caregiver"
      ? ["id_proof", "address_proof", "certification"]
      : ["id_proof"];

  const allDocumentsUploaded = requiredDocTypes.every((type) =>
    documents.some((d) => d.type === type && d.status !== "error")
  );

  // Live location capture is required for both roles.
  const locationProofRequired = true;
  const locationProofProvided = !!locationProof;

  // All requirements met
  const allRequiredUploaded = allDocumentsUploaded && locationProofProvided;

  // Calculate total requirements for progress
  const totalRequirements =
    requiredDocTypes.length + (locationProofRequired ? 1 : 0);
  const completedRequiredDocs = requiredDocTypes.filter((type) =>
    documents.some((d) => d.type === type && d.status !== "error")
  ).length;
  const completedRequirements =
    completedRequiredDocs +
    (locationProofProvided && locationProofRequired ? 1 : 0);

  const hasAddressProofDoc = documents.some(
    (d) => d.type === "address_proof" && d.status !== "error"
  );

  const hasIdProofDoc = documents.some(
    (d) => d.type === "id_proof" && d.status !== "error"
  );

  const trustScore =
    (locationProof ? 20 : 0) +
    (locationProof?.gpsVerified ? 40 : 0) +
    ((role === "caregiver" ? hasAddressProofDoc : hasIdProofDoc) ? 40 : 0);

  const handleAdd = (type: DocumentType, file: File) => {
    const validationError = (file as File & { _validationError?: string })._validationError;
    const preview = buildPreview(file);
    const newDoc: DocumentFile = {
      type,
      file,
      preview,
      status: validationError ? "error" : "pending",
      ...(validationError !== undefined ? { errorMessage: validationError } : {}),
    };
    onDocumentsChange([...documents.filter((d) => d.type !== type), newDoc]);
  };

  const handleRemove = (type: DocumentType) => {
    const removed = documents.find((d) => d.type === type);
    if (removed?.preview) URL.revokeObjectURL(removed.preview);
    onDocumentsChange(documents.filter((d) => d.type !== type));
  };

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-gray-900">Document Verification</h2>
        <p className="text-sm text-gray-500 mt-1">
          Complete identity and location checks to unlock a higher trust profile from day one.
        </p>
      </motion.div>

      {/* Security note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
        <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Your documents are encrypted and stored securely. They are only used for identity verification
          and are never shared with third parties.
        </p>
      </div>

      {/* Document upload areas */}
      <AnimatePresence mode="popLayout">
        {documentRequirements.map((req, i) => {
          const current = documents.find((d) => d.type === req.type);
          return (
            <motion.div
              key={req.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="space-y-1.5"
            >
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-1.5">
                  {req.type === "id_proof" ? (
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-800">{req.label}</span>
                  {requiredDocTypes.includes(req.type) && (
                    <span className="text-xs text-red-500 font-medium">*</span>
                  )}
                </div>
                {current?.status === "success" && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{req.description}</p>
              <UploadZone
                requirement={req}
                current={current}
                onAdd={(file) => handleAdd(req.type, file)}
                onRemove={() => handleRemove(req.type)}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Live location capture */}
      {locationProofRequired && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: documentRequirements.length * 0.07 }}
          className="space-y-1.5"
        >
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-800">
                Live Location Verification
              </span>
              <span className="text-xs text-red-500 font-medium">*</span>
            </div>
            {locationProof && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Location Captured
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Capture your current location and refine it on the map. This improves profile trust and verification reliability.
          </p>
          <LocationPicker
            onLocationSelect={onLocationProofChange}
            initialLocation={locationProof}
          />
        </motion.div>
      )}

      <div className="rounded-xl border border-blue-100 bg-linear-to-br from-white via-blue-50 to-indigo-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-800">Trust Score</p>
          <TrustScoreBadge score={trustScore} />
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <p>+20 Address selected on map/search</p>
          <p>+40 GPS matches selected location</p>
          <p>
            +40 {role === "caregiver" ? "Address document uploaded" : "ID proof uploaded"}
          </p>
        </div>
        {role === "careseeker" && (
          <p className="mt-2 text-xs text-gray-500">
            For care seekers, live GPS-backed location proof replaces address document upload.
          </p>
        )}
        {locationProof && typeof locationProof.distanceKm === "number" && (
          <p className="mt-2 text-xs text-gray-700">
            Distance between selected address and GPS: {locationProof.distanceKm.toFixed(2)} km
          </p>
        )}
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary-500 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(completedRequirements / totalRequirements) * 100}%`,
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <span className="text-xs text-gray-500 shrink-0">
          {completedRequirements} / {totalRequirements} completed
        </span>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
        >
          Back
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onSubmit}
          disabled={!allRequiredUploaded || isSubmitting}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all shadow-md ${
            allRequiredUploaded && !isSubmitting
              ? "bg-primary-500 text-white shadow-primary-500/25 hover:bg-primary-600"
              : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create Account"
          )}
        </motion.button>
      </div>
    </div>
  );
}
