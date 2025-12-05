// ============================================
// WALLET API SERVICE — Sprint D
// ============================================

import { apiClient } from "./client";
import type { ApiResponse } from "@/types";

export interface Wallet {
  _id: string;
  ownerId: string;
  ownerType: "careseeker" | "caregiver" | "platform";
  balance: number;
  pendingBalance: number;
  currency: string;
  lifetime: {
    credited: number;
    debited: number;
    released: number;
    refunded: number;
  };
  lastActivityAt?: string;
}

export type LedgerOp =
  | "payment.captured"
  | "slot.released"
  | "commission.taken"
  | "refund.issued"
  | "payout.requested"
  | "payout.completed"
  | "adjustment";

export interface LedgerEntry {
  _id: string;
  op: LedgerOp;
  fromWallet: string;
  toWallet: string;
  amount: number;
  currency: string;
  bookingId?: string;
  slotId?: string;
  transactionId?: string;
  description?: string;
  createdAt: string;
}

export interface PayoutRequest {
  _id: string;
  caregiverId: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "rejected";
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

class WalletService {
  async getMyWallet(): Promise<ApiResponse<Wallet>> {
    return apiClient.get<Wallet>("/wallet");
  }

  async getMyLedger(params: { limit?: number; skip?: number } = {}): Promise<
    ApiResponse<{ entries: LedgerEntry[] }>
  > {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", String(params.limit));
    if (params.skip) q.set("skip", String(params.skip));
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return apiClient.get<{ entries: LedgerEntry[] }>(`/wallet/ledger${suffix}`);
  }

  async requestPayout(amount: number): Promise<ApiResponse<{ request: PayoutRequest; entry: LedgerEntry }>> {
    return apiClient.post<{ request: PayoutRequest; entry: LedgerEntry }>("/wallet/payout", { amount });
  }

  async getMyPayoutRequests(params: { limit?: number; skip?: number } = {}): Promise<
    ApiResponse<{ requests: PayoutRequest[]; total: number }>
  > {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", String(params.limit));
    if (params.skip) q.set("skip", String(params.skip));
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return apiClient.get<{ requests: PayoutRequest[]; total: number }>(`/wallet/payout-requests${suffix}`);
  }
}

export const walletService = new WalletService();
