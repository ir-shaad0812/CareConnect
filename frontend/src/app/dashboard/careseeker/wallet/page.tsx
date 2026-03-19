"use client";

// ============================================
// CARESEEKER WALLET PAGE — Sprint D/E
// ============================================

import WalletPanel from "@/components/wallet/WalletPanel";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function CareseekerWalletPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
          <p className="text-sm text-slate-500">
            Refund credits, payment history, and escrow status.
          </p>
        </div>
        <WalletPanel role="careseeker" />
      </div>
    </DashboardLayout>
  );
}
