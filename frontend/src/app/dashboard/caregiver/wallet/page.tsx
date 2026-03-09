"use client";

// ============================================
// CAREGIVER WALLET PAGE — Sprint D/E
// ============================================

import WalletPanel from "@/components/wallet/WalletPanel";
import { CaregiverLayout } from "../components";

export default function CaregiverWalletPage() {
  return (
    <CaregiverLayout pageTitle="Wallet">
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
          <p className="text-sm text-slate-500">
            Your earnings, escrow, and payout history.
          </p>
        </div>
        <WalletPanel role="caregiver" />
      </div>
    </CaregiverLayout>
  );
}
