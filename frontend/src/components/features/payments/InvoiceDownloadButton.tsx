"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { paymentService } from "@/services/api/payment.service";

interface InvoiceDownloadButtonProps {
  transactionId: string;
  transactionNumber?: string;
  variant?: "button" | "icon" | "link";
  className?: string;
}

export function InvoiceDownloadButton({
  transactionId,
  transactionNumber,
  variant = "button",
  className = "",
}: InvoiceDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    setDownloading(true);
    setError("");

    try {
      const blobUrl = await paymentService.downloadInvoicePDF(transactionId);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `invoice-${transactionNumber || transactionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleDownload}
        disabled={downloading}
        title="Download Invoice PDF"
        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 ${className}`}
      >
        {downloading ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#4461F2] rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </button>
    );
  }

  if (variant === "link") {
    return (
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`text-sm text-primary-500 hover:underline disabled:opacity-50 ${className}`}
      >
        {downloading ? "Downloading..." : "Download PDF"}
        {error && <span className="text-red-500 ml-2">{error}</span>}
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white border border-[#E1E6EF] rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 ${className}`}
    >
      {downloading ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-300 border-t-[#4461F2] rounded-full animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Invoice
        </>
      )}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </motion.button>
  );
}

export default InvoiceDownloadButton;
