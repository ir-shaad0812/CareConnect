// ============================================
// ENHANCED ADMIN DOCUMENTS VERIFICATION PAGE
// View and verify user documents with zoom
// ============================================

"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import AdminLayout from "@/components/layout/AdminLayout";
import { adminService, AdminDocument } from "@/services";

function getDocumentUrl(document: Pick<AdminDocument, "fileUrl" | "url">): string {
  return document.fileUrl || document.url || "";
}

function isImageDocument(document: Pick<AdminDocument, "fileUrl" | "url" | "mimeType">): boolean {
  const url = getDocumentUrl(document);
  const normalizedUrl = url.split("?")[0].toLowerCase();
  const mimeType = document.mimeType?.toLowerCase() || "";
  return mimeType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(normalizedUrl);
}

function isPdfDocument(document: Pick<AdminDocument, "fileUrl" | "url" | "mimeType">): boolean {
  const url = getDocumentUrl(document);
  const normalizedUrl = url.split("?")[0].toLowerCase();
  const mimeType = document.mimeType?.toLowerCase() || "";
  return mimeType === "application/pdf" || normalizedUrl.endsWith(".pdf");
}

// Document Zoom Modal Component
function DocumentZoomModal({
  document,
  onClose,
  onVerify,
  onReject,
  isLoading,
}: {
  document: AdminDocument;
  onClose: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isLoading: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "+" || e.key === "=") handleZoomIn();
    if (e.key === "-") handleZoomOut();
    if (e.key === "0") handleResetZoom();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const documentUrl = getDocumentUrl(document);
  const isImage = isImageDocument(document);
  const isPdf = isPdfDocument(document);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      verified: "bg-green-100 text-green-700 border-green-200",
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getDocTypeName = (type: string) => {
    const names: Record<string, string> = {
      id_proof: "ID Proof",
      address_proof: "Address Proof",
      certification: "Certification",
      background_check: "Background Check",
    };
    return names[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-gray-900 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h2 className="text-white font-semibold">{document.fileName}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-400 text-sm">{getDocTypeName(document.documentType)}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(document.status)}`}>
                  {document.status}
                </span>
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Zoom Out (-)"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white text-sm px-3 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Zoom In (+)"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Reset Zoom (0)"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href={documentUrl}
              download={document.fileName}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Download"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Viewer */}
        <div
          ref={containerRef}
          className={`flex-1 overflow-hidden bg-gray-950 flex items-center justify-center ${
            zoom > 1 ? "cursor-grab" : "cursor-default"
          } ${isDragging ? "cursor-grabbing" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {isImage ? (
            <div
              className="relative transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                transformOrigin: "center center",
              }}
            >
              <Image
                src={documentUrl}
                alt={document.fileName}
                width={800}
                height={600}
                className="max-w-none object-contain select-none"
                style={{ maxHeight: "calc(100vh - 200px)" }}
                draggable={false}
                priority
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${documentUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=${zoom * 100}`}
              className="w-full h-full bg-white"
              title={document.fileName}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width: `${100 / zoom}%`,
                height: `${100 / zoom}%`,
              }}
            />
          ) : (
            <div className="text-center text-gray-400">
              <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mb-4">Preview not available for this file type</p>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-[#2F4BDB] transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Document
              </a>
            </div>
          )}
        </div>

        {/* Side Panel - Document Details */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto shrink-0">
          <div className="p-6 space-y-6">
            {/* Document Info */}
            <div>
              <h3 className="text-white font-semibold mb-4">Document Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Type</p>
                  <p className="text-white">{getDocTypeName(document.documentType)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Status</p>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusColor(document.status)}`}>
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Submitted</p>
                  <p className="text-white">{new Date(document.createdAt).toLocaleString()}</p>
                </div>
                {document.verifiedAt && (
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider">Verified</p>
                    <p className="text-white">{new Date(document.verifiedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            {document.userId && (
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-4">Submitted By</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-linear-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
                    {document.userId.fullName?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-white font-medium">{document.userId.fullName}</p>
                    <p className="text-gray-400 text-sm">{document.userId.email}</p>
                  </div>
                </div>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  document.userId.role === "caregiver" 
                    ? "bg-blue-900 text-blue-300" 
                    : "bg-orange-900 text-orange-300"
                }`}>
                  {document.userId.role}
                </span>
              </div>
            )}

            {/* Rejection Reason */}
            {document.status === "rejected" && document.rejectionReason && (
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-red-400 font-semibold mb-2">Rejection Reason</h3>
                <p className="text-gray-300 text-sm bg-red-900/30 rounded-lg p-3 border border-red-800">
                  {document.rejectionReason}
                </p>
              </div>
            )}

            {/* Cloudinary URL — for admin visibility & direct access */}
            {documentUrl && (
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Cloudinary URL
                </h3>
                <div className="flex gap-2">
                  <p className="flex-1 text-gray-400 text-xs bg-gray-800 rounded-lg p-2 break-all font-mono leading-relaxed">
                    {documentUrl}
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(documentUrl)}
                    className="p-2 bg-gray-700 hover:bg-blue-700 text-gray-300 hover:text-white rounded-lg transition-colors shrink-0 self-start"
                    title="Copy Cloudinary URL"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full text-center text-xs text-blue-400 hover:text-blue-300 underline block"
                >
                  Open in browser ?
                </a>
              </div>
            )}

            {/* Action Buttons */}
            {document.status === "pending" && (
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-4">Actions</h3>
                
                {!showRejectForm ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => onVerify(document._id)}
                      disabled={isLoading}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span>Processing...</span>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Verify Document
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={isLoading}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject Document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason("");
                        }}
                        className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          onReject(document._id, rejectReason);
                        }}
                        disabled={isLoading || !rejectReason.trim()}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isLoading ? "..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verified Badge */}
            {document.status === "verified" && (
              <div className="pt-4 border-t border-gray-700">
                <div className="bg-green-900/30 border border-green-800 rounded-xl p-4 flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-green-400 font-semibold">Verified</p>
                    <p className="text-gray-400 text-sm">
                      {document.verifiedAt && new Date(document.verifiedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="shrink-0 bg-gray-900 border-t border-gray-700 px-6 py-3">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <span><kbd className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">ESC</kbd> Close</span>
          <span><kbd className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">+</kbd> Zoom In</span>
          <span><kbd className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">-</kbd> Zoom Out</span>
          <span><kbd className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">0</kbd> Reset</span>
          <span><kbd className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">Scroll</kbd> Zoom</span>
          <span><kbd className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">Drag</kbd> Pan (when zoomed)</span>
        </div>
      </div>
    </div>
  );
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<AdminDocument | null>(null);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filters
  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    type: searchParams.get("type") || "",
  });

  const fetchDocuments = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 12,
      };
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;

      const data = await adminService.getDocuments(params);
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    const refreshDocuments = () => {
      if (document.visibilityState === "visible") {
        void fetchDocuments(pagination.page);
      }
    };

    const interval = window.setInterval(refreshDocuments, 15000);
    window.addEventListener("focus", refreshDocuments);
    document.addEventListener("visibilitychange", refreshDocuments);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshDocuments);
      document.removeEventListener("visibilitychange", refreshDocuments);
    };
  }, [fetchDocuments, pagination.page]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    const params = new URLSearchParams();
    if (key === "status" ? value : filters.status) params.set("status", key === "status" ? value : filters.status);
    if (key === "type" ? value : filters.type) params.set("type", key === "type" ? value : filters.type);
    router.push(`/admin/documents?${params.toString()}`);
  };

  const handleVerify = async (documentId: string) => {
    try {
      setActionLoading(true);
      await adminService.verifyDocument(documentId);
      fetchDocuments(pagination.page);
      setShowZoomModal(false);
      setSelectedDoc(null);
    } catch (err) {
      console.error("Error verifying document:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (documentId: string, reason: string) => {
    try {
      setActionLoading(true);
      await adminService.rejectDocument(documentId, reason);
      fetchDocuments(pagination.page);
      setShowZoomModal(false);
      setSelectedDoc(null);
    } catch (err) {
      console.error("Error rejecting document:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      verified: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      rejected: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const getDocTypeName = (type: string) => {
    const names: Record<string, string> = {
      id_proof: "ID Proof",
      address_proof: "Address Proof",
      certification: "Certification",
      background_check: "Background Check",
    };
    return names[type] || type;
  };

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === "pending").length,
    verified: documents.filter((d) => d.status === "verified").length,
    rejected: documents.filter((d) => d.status === "rejected").length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Verification</h1>
            <p className="text-gray-500">Review and verify user documents with zoom functionality</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "grid" ? "bg-white shadow-sm text-primary-500" : "text-gray-600"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === "list" ? "bg-white shadow-sm text-primary-500" : "text-gray-600"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => fetchDocuments(pagination.page)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
              filters.status === "" ? "border-primary-500 shadow-md" : "border-[#E1E6EF] hover:border-[#E1E6EF]"
            }`}
            onClick={() => handleFilterChange("status", "")}
          >
            <p className="text-3xl font-bold text-gray-900">{pagination.total}</p>
            <p className="text-sm text-gray-500">Total Documents</p>
          </div>
          <div
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
              filters.status === "pending" ? "border-yellow-400 shadow-md" : "border-[#E1E6EF] hover:border-yellow-200"
            }`}
            onClick={() => handleFilterChange("status", filters.status === "pending" ? "" : "pending")}
          >
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending Review</p>
          </div>
          <div
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
              filters.status === "verified" ? "border-green-400 shadow-md" : "border-[#E1E6EF] hover:border-green-200"
            }`}
            onClick={() => handleFilterChange("status", filters.status === "verified" ? "" : "verified")}
          >
            <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
            <p className="text-sm text-gray-500">Verified</p>
          </div>
          <div
            className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
              filters.status === "rejected" ? "border-red-400 shadow-md" : "border-[#E1E6EF] hover:border-red-200"
            }`}
            onClick={() => handleFilterChange("status", filters.status === "rejected" ? "" : "rejected")}
          >
            <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-gray-500">Rejected</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-[#E1E6EF]">
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2] focus:border-transparent bg-[#F0F5FF]"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="px-4 py-2.5 border border-[#E1E6EF] rounded-xl focus:ring-2 focus:ring-[#4461F2] focus:border-transparent bg-[#F0F5FF]"
            >
              <option value="">All Types</option>
              <option value="id_proof">ID Proof</option>
              <option value="address_proof">Address Proof</option>
              <option value="certification">Certification</option>
              <option value="background_check">Background Check</option>
            </select>

            {(filters.status || filters.type) && (
              <button
                onClick={() => {
                  setFilters({ status: "", type: "" });
                  router.push("/admin/documents");
                }}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Documents Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E1E6EF] border-t-[#4461F2]"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-[#E1E6EF]">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
            <p className="text-gray-500">There are no documents matching your filters.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#E1E6EF] hover:shadow-lg hover:border-primary-500/30 transition-all duration-300 cursor-pointer group"
                onClick={() => {
                  setSelectedDoc(doc);
                  setShowZoomModal(true);
                }}
              >
                {/* Document Preview */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {isImageDocument(doc) ? (
                    <Image
                      src={getDocumentUrl(doc)}
                      alt={doc.fileName}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
                      <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full shadow-md ${getStatusBadge(doc.status)}`}>
                    {doc.status}
                  </span>

                  {/* Zoom Indicator */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
                      <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Document Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
                      {getDocTypeName(doc.documentType)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 truncate text-sm">{doc.fileName}</p>
                  {doc.userId && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-6 h-6 bg-linear-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {doc.userId.fullName?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <p className="text-xs text-gray-500 truncate flex-1">{doc.userId.fullName}</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions for Pending */}
                {doc.status === "pending" && (
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVerify(doc._id);
                      }}
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                    >
                      ? Verify
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDoc(doc);
                        setShowZoomModal(true);
                      }}
                      className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition font-medium"
                    >
                      ? Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-[#E1E6EF] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#F0F5FF] border-b border-[#E1E6EF]">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr
                    key={doc._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setShowZoomModal(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          {isImageDocument(doc) ? (
                            <Image src={getDocumentUrl(doc)} alt="" width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[200px]">{doc.fileName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                        {getDocTypeName(doc.documentType)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.userId && (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-linear-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {doc.userId.fullName?.charAt(0).toUpperCase() || "?"}
                          </div>
                          <span className="text-sm text-gray-600">{doc.userId.fullName}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-[#E1E6EF]">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} documents
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchDocuments(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = pagination.page <= 3 
                    ? i + 1 
                    : pagination.page >= pagination.pages - 2 
                      ? pagination.pages - 4 + i 
                      : pagination.page - 2 + i;
                  if (pageNum < 1 || pageNum > pagination.pages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchDocuments(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        pagination.page === pageNum
                          ? "bg-primary-500 text-white"
                          : "hover:bg-[#F0F5FF] text-gray-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchDocuments(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-[#E1E6EF] rounded-lg hover:bg-[#F0F5FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zoom Modal */}
      {showZoomModal && selectedDoc && (
        <DocumentZoomModal
          document={selectedDoc}
          onClose={() => {
            setShowZoomModal(false);
            setSelectedDoc(null);
          }}
          onVerify={handleVerify}
          onReject={handleReject}
          isLoading={actionLoading}
        />
      )}
    </AdminLayout>
  );
}

export default function AdminDocumentsPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#E1E6EF] border-t-[#4461F2]"></div>
          </div>
        </AdminLayout>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}
