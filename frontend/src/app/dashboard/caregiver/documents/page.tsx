"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Trash2,
  RefreshCw,
  Info,
  FileBadge,
  FileCheck,
  X,
  Plus,
  ShieldCheck,
} from "lucide-react";
import CaregiverLayout from "../components/CaregiverLayout";
import { useAuthContext } from "@/context/AuthContext";
import { documentService } from "@/services";
import type {
  Document as CareDocument,
  DocumentType,
} from "@/services/api/document.service";

// ─── Document type definitions ────────────────────────────────────────────────

const DOC_TYPES: {
  value: DocumentType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "id_proof",
    label: "ID Proof",
    description: "National ID, Passport, or Driver's License",
    icon: FileBadge,
  },
  {
    value: "address_proof",
    label: "Address Proof",
    description: "Utility bill or bank statement (last 3 months)",
    icon: FileText,
  },
  {
    value: "certification",
    label: "Certification",
    description: "Care-related certifications or training records",
    icon: FileCheck,
  },
  {
    value: "background_check",
    label: "Background Check",
    description: "Police clearance or DBS certificate",
    icon: ShieldCheck,
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pending: {
    label: "Under Review",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  verified: {
    label: "Verified",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preSelectedType?: DocumentType | undefined;
}

function UploadModal({
  onClose,
  onSuccess,
  preSelectedType,
}: UploadModalProps) {
  const [selectedType, setSelectedType] = useState<DocumentType | "">(
    preSelectedType ?? "",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, or PDF files are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10 MB.");
      return;
    }
    setError(null);
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedType || !selectedFile) {
      setError("Please select a document type and file.");
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      await documentService.uploadDocument({
        documentType: selectedType,
        file: selectedFile,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upload Document</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Select a type and upload your file for admin review
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Document Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DOC_TYPES.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedType(value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedType === value
                      ? "border-[#39B54A] bg-[#39B54A]/5"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mb-1.5 ${
                      selectedType === value
                        ? "text-[#39B54A]"
                        : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-xs font-semibold leading-tight ${
                      selectedType === value
                        ? "text-[#39B54A]"
                        : "text-gray-700"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                    {description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-[#39B54A] bg-[#39B54A]/5 scale-[1.01]"
                  : selectedFile
                    ? "border-[#39B54A] bg-[#39B54A]/5"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleInputChange}
                className="hidden"
              />

              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="mx-auto max-h-32 object-contain rounded-lg mb-3"
                />
              ) : selectedFile ? (
                <div className="w-14 h-14 bg-[#39B54A]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7 text-[#39B54A]" />
                </div>
              ) : (
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-7 h-7 text-gray-300" />
                </div>
              )}

              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-gray-800 truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <p className="text-xs text-[#39B54A] mt-1 font-medium">
                    Click to change file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Click to select or drag & drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, WebP, PDF — max 10 MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm overflow-hidden"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedType || !selectedFile}
            className="flex-1 py-2.5 bg-[#39B54A] hover:bg-[#2d913c] disabled:bg-gray-200 disabled:cursor-not-allowed text-white disabled:text-gray-400 rounded-xl font-semibold transition text-sm flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Document
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: CareDocument;
  onDelete: (id: string) => Promise<void>;
  onReupload: (type: DocumentType) => void;
  isDeleting: boolean;
}

function DocumentCard({
  doc,
  onDelete,
  onReupload,
  isDeleting,
}: DocumentCardProps) {
  const statusKey = doc.status in STATUS_CONFIG ? doc.status : "pending";
  const status = STATUS_CONFIG[statusKey];
  const StatusIcon = status.icon;
  const effectiveType = (doc.documentType ??
    (doc as unknown as { type?: string }).type) as DocumentType | undefined;
  const docTypeDef = DOC_TYPES.find((t) => t.value === effectiveType);
  const DocIcon = docTypeDef?.icon ?? FileText;
  const fileUrl = doc.fileUrl ?? (doc as unknown as { url?: string }).url;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all ${
        isDeleting ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
          <DocIcon className="w-5 h-5 text-gray-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                {docTypeDef?.label ?? "Document"}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {doc.originalName ?? doc.fileName}
              </p>
            </div>
            {/* Status Badge */}
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
            <span>{formatFileSize(doc.size ?? doc.fileSize)}</span>
            <span>·</span>
            <span>Uploaded {formatDate(doc.createdAt)}</span>
            {doc.verifiedAt && (
              <>
                <span>·</span>
                <span className="text-green-500">
                  Verified {formatDate(doc.verifiedAt)}
                </span>
              </>
            )}
          </div>

          {/* Rejection reason */}
          {doc.status === "rejected" && doc.rejectionReason && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-semibold text-red-700 mb-1">
                Rejection reason:
              </p>
              <p className="text-xs text-red-600 leading-relaxed">
                {doc.rejectionReason}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-xl flex items-center justify-center gap-1.5 hover:bg-gray-50 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            View File
          </a>
        ) : null}

        {doc.status === "rejected" && effectiveType && (
          <button
            onClick={() => onReupload(effectiveType)}
            className="flex-1 py-2 text-xs font-medium text-[#39B54A] border border-[#39B54A] rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#39B54A]/5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-upload
          </button>
        )}

        <button
          onClick={() => void onDelete(doc._id)}
          disabled={isDeleting}
          className="p-2 text-gray-400 border border-gray-200 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition disabled:opacity-50"
          title="Delete document"
        >
          {isDeleting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}

function StatCard({
  label,
  value,
  color,
  bg,
  icon: Icon,
  active,
  onClick,
}: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`${bg} border-2 rounded-2xl p-4 text-center transition-all hover:shadow-md w-full ${
        active ? "border-current shadow-md scale-[1.02]" : "border-gray-200"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 ${bg}`}
      >
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CaregiverDocumentsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const [documents, setDocuments] = useState<CareDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [reuploadType, setReuploadType] = useState<DocumentType | undefined>(
    undefined,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const loadedForUserRef = useRef<string | null>(null);

  // ── Load Documents ──────────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await documentService.getMyDocuments();
      const docs = res.data?.documents ?? [];
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    if (user.role !== "caregiver") {
      setIsLoading(false);
      return;
    }

    const currentUserId = user._id ?? null;
    if (loadedForUserRef.current === currentUserId) {
      return;
    }

    loadedForUserRef.current = currentUserId;
    void loadDocuments();
  }, [isAuthLoading, user, router, loadDocuments]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (documentId: string) => {
    if (
      !window.confirm(
        "Delete this document? This cannot be undone and you may need to re-upload for verification.",
      )
    )
      return;
    setDeletingId(documentId);
    try {
      await documentService.deleteDocument(documentId);
      setDocuments((prev) => prev.filter((d) => d._id !== documentId));
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Delete failed. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleReupload = (type: DocumentType) => {
    setReuploadType(type);
    setShowUpload(true);
  };

  const openUpload = () => {
    setReuploadType(undefined);
    setShowUpload(true);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = {
    total: documents.length,
    verified: documents.filter((d) => d.status === "verified").length,
    pending: documents.filter((d) => d.status === "pending").length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

  const statCards = [
    {
      label: "Total",
      value: stats.total,
      color: "text-gray-700",
      bg: "bg-white",
      icon: FileText,
      filter: "all",
    },
    {
      label: "Verified",
      value: stats.verified,
      color: "text-green-600",
      bg: "bg-green-50",
      icon: CheckCircle2,
      filter: "verified",
    },
    {
      label: "Under Review",
      value: stats.pending,
      color: "text-amber-600",
      bg: "bg-amber-50",
      icon: Clock,
      filter: "pending",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      color: "text-red-600",
      bg: "bg-red-50",
      icon: XCircle,
      filter: "rejected",
    },
  ];

  // ── Filtered documents ──────────────────────────────────────────────────────
  const filteredDocs =
    statusFilter === "all"
      ? documents
      : documents.filter((d) => d.status === statusFilter);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <CaregiverLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload and manage your verification documents. Admin reviews each
              submission within 1–3 business days.
            </p>
          </div>
          <button
            onClick={openUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#39B54A] hover:bg-[#2d913c] text-white rounded-xl font-semibold text-sm transition shadow-sm hover:shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map((s) => (
            <StatCard
              key={s.filter}
              label={s.label}
              value={s.value}
              color={s.color}
              bg={s.bg}
              icon={s.icon}
              active={statusFilter === s.filter}
              onClick={() =>
                setStatusFilter(statusFilter === s.filter ? "all" : s.filter)
              }
            />
          ))}
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700 leading-relaxed">
            <span className="font-semibold">Required documents:</span> ID Proof,
            Address Proof, and at least one Certification are required to
            complete your caregiver verification.
          </p>
        </div>

        {/* Active filter indicator */}
        {statusFilter !== "all" && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {filteredDocs.length}
              </span>{" "}
              {statusFilter} document{filteredDocs.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setStatusFilter("all")}
              className="text-xs text-[#39B54A] hover:underline font-medium"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-11 h-11 bg-gray-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <div className="flex-1 h-8 bg-gray-100 rounded-xl" />
                  <div className="w-8 h-8 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Failed to Load Documents
            </h3>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => void loadDocuments()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#39B54A] text-white rounded-xl text-sm font-medium hover:bg-[#2d913c] transition"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {statusFilter === "all"
                ? "No documents uploaded yet"
                : `No ${statusFilter} documents`}
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              {statusFilter === "all"
                ? "Upload your ID proof, certifications, and other required documents to complete your verification and start accepting bookings."
                : `You have no documents with "${statusFilter}" status.`}
            </p>
            {statusFilter === "all" ? (
              <button
                onClick={openUpload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#39B54A] text-white rounded-xl text-sm font-semibold hover:bg-[#2d913c] transition"
              >
                <Upload className="w-4 h-4" />
                Upload First Document
              </button>
            ) : (
              <button
                onClick={() => setStatusFilter("all")}
                className="text-sm text-[#39B54A] hover:underline font-medium"
              >
                View all documents
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc._id}
                  doc={doc}
                  onDelete={handleDelete}
                  onReupload={handleReupload}
                  isDeleting={deletingId === doc._id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            key="upload-modal"
            onClose={() => {
              setShowUpload(false);
              setReuploadType(undefined);
            }}
            onSuccess={() => void loadDocuments()}
            {...(reuploadType !== undefined
              ? { preSelectedType: reuploadType }
              : {})}
          />
        )}
      </AnimatePresence>
    </CaregiverLayout>
  );
}
