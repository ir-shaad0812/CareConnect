// ============================================
// DOCUMENT API SERVICE
// Document upload and management API calls
// ============================================

import { apiClient } from "./client";
import { API_CONFIG, AUTH_CONFIG } from "@/lib/constants";
import type { ApiResponse } from "@/types";

export type DocumentType =
  | "id_proof"
  | "address_proof"
  | "certification"
  | "background_check";
export type DocumentStatus = "pending" | "verified" | "rejected";

export interface Document {
  _id: string;
  userId: string;
  type?: DocumentType;
  documentType: DocumentType;
  fileName: string;
  originalName?: string;
  fileUrl: string;
  size?: number;
  fileSize?: number;
  mimeType?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadData {
  documentType: DocumentType;
  file: File;
}

class DocumentService {
  /**
   * Upload a document
   */
  async uploadDocument(
    data: DocumentUploadData,
  ): Promise<ApiResponse<{ document: Document }>> {
    const formData = new FormData();
    formData.append("document", data.file);
    // Send both field names for full backend compatibility
    formData.append("type", data.documentType);
    formData.append("documentType", data.documentType);

    const response = await fetch(`${API_CONFIG.BASE_URL}/documents`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${localStorage.getItem(AUTH_CONFIG.TOKEN_KEY) ?? ""}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw {
        message: result.message || "Upload failed",
        statusCode: response.status,
      };
    }

    return { success: true, data: result.data };
  }

  /**
   * Get user's documents
   */
  async getMyDocuments(): Promise<ApiResponse<{ documents: Document[] }>> {
    return apiClient.get<{ documents: Document[] }>("/documents");
  }

  /**
   * Get document by ID
   */
  async getDocumentById(
    documentId: string,
  ): Promise<ApiResponse<{ document: Document }>> {
    return apiClient.get<{ document: Document }>(`/documents/${documentId}`);
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/documents/${documentId}`);
  }

  /**
   * Get pending documents (Admin)
   */
  async getPendingDocuments(): Promise<ApiResponse<{ documents: Document[] }>> {
    return apiClient.get<{ documents: Document[] }>("/documents/admin/pending");
  }
}

export const documentService = new DocumentService();
export default documentService;
