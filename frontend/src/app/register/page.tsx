"use client";

import { RegisterForm } from "@/components";
import { AuthPageGuard } from "@/modules/auth/components";

/**
 * /register
 * Full-screen registration wizard with no top navbar.
 * Animated background blobs match the login page aesthetic.
 */
export default function RegisterPage() {
  return (
    <AuthPageGuard>
      <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Premium background effects */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#39B54A]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#39B54A]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-100/20 rounded-full blur-3xl pointer-events-none" />

        {/* Floating CC badges with green gradient */}
        <div className="hidden lg:flex absolute top-[10%] left-[3%] w-9 h-9 rounded-full bg-linear-to-br from-[#39B54A] to-[#2d913c] items-center justify-center text-white font-bold text-[10px] shadow-lg shadow-[#39B54A]/25 animate-bounce" style={{ animationDuration: "3s" }}>
          CC
        </div>
        <div className="hidden lg:flex absolute bottom-[18%] left-[2%] w-8 h-8 rounded-full bg-linear-to-br from-[#39B54A] to-[#2d913c] items-center justify-center text-white font-bold text-[9px] shadow-lg shadow-[#39B54A]/25 animate-bounce" style={{ animationDuration: "3.4s", animationDelay: "1.5s" }}>
          CC
        </div>
        <div className="hidden lg:flex absolute top-[45%] right-[3%] w-8 h-8 rounded-full bg-linear-to-br from-[#39B54A] to-[#2d913c] items-center justify-center text-white font-bold text-[9px] shadow-lg shadow-[#39B54A]/25 animate-bounce" style={{ animationDuration: "3.7s", animationDelay: "0.8s" }}>
          CC
        </div>

        <RegisterForm />
      </div>
    </AuthPageGuard>
  );
}
