"use client";

import { LoginForm, Navbar } from "@/components";
import { AuthPageGuard } from "@/modules/auth/components";

export default function LoginPage() {
  return (
    <AuthPageGuard>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Navbar */}
        <Navbar />

        {/* Login Form */}
        <div className="flex-1">
          <LoginForm />
        </div>
      </div>
    </AuthPageGuard>
  );
}
