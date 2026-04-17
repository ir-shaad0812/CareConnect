// ============================================
// MESSAGE CAREGIVER PAGE
// Start direct conversation with a caregiver
// ============================================

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, MessageCircle, AlertCircle } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import { chatService } from "@/modules/chat/services";

export default function MessageCaregiverPage() {
  const router = useRouter();
  const params = useParams();
  const caregiverId = params.caregiverId as string;
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  
  const [status, setStatus] = useState<"loading" | "error" | "redirecting">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push(`/login?redirect=/message/${caregiverId}`);
      return;
    }

    // Don't allow messaging yourself
    if (user?._id === caregiverId) {
      setStatus("error");
      setError("You cannot start a conversation with yourself");
      return;
    }

    // Start or get direct conversation
    const startConversation = async () => {
      try {
        setStatus("loading");
        
        const response = await chatService.startDirectConversation(caregiverId);
        
        if (response.success && response.data?.conversation) {
          setStatus("redirecting");
          // Redirect to messages page with the conversation selected
          router.replace(`/messages?conversation=${response.data.conversation._id}`);
        } else {
          throw new Error(response.message || "Failed to start conversation");
        }
      } catch (err: unknown) {
        console.error("Failed to start conversation:", err);
        setStatus("error");
        const msg =
          err instanceof Error
            ? err.message
            : (err as { message?: string } | null)?.message;
        setError(msg || "Failed to start conversation. Please try again.");
      }
    };

    startConversation();
  }, [caregiverId, user, isAuthenticated, authLoading, router]);

  // Loading state
  if (status === "loading" || status === "redirecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <Loader2 className="w-8 h-8 animate-spin text-[#39B54A] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {status === "redirecting" ? "Opening Conversation..." : "Starting Conversation..."}
          </h2>
          <p className="text-gray-500">
            Please wait while we connect you
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 max-w-md"
        >
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Start Conversation
          </h2>
          <p className="text-gray-500 mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/messages")}
              className="w-full px-6 py-3 bg-[#39B54A] text-white rounded-xl font-semibold hover:bg-[#2d913c] transition-colors"
            >
              Go to Messages
            </button>
            <button
              onClick={() => router.back()}
              className="w-full px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
