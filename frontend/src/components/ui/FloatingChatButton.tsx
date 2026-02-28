// ============================================
// FLOATING CHAT BUTTON - Global Chat Access
// A globally accessible chat button that appears
// on all pages and navigates to the messages page
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/context/AuthContext";
import { chatService } from "@/modules/chat/services";

interface FloatingChatButtonProps {
  className?: string;
}

export function FloatingChatButton({ className = "" }: FloatingChatButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Don't show on messages page or auth pages
  const hiddenPaths = ["/messages", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];
  const shouldHide = hiddenPaths.some(path => pathname?.startsWith(path));

  // Fetch unread count and recent conversations
  useEffect(() => {
    const fetchChatData = async () => {
      if (!isAuthenticated) return;
      
      try {
        setIsLoading(true);
        const response = await chatService.getConversations(1, 3);
        if (response.success && response.data) {
          setRecentConversations(response.data.conversations || []);
          // Calculate total unread
          const userId = user?._id;
          const totalUnread = response.data.conversations?.reduce((acc: number, conv: any) => {
            const myUnread = userId && conv.unreadCount ? conv.unreadCount[userId] || 0 : 0;
            return acc + myUnread;
          }, 0) || 0;
          setUnreadCount(totalUnread);
        }
      } catch (error: unknown) {
        // Token refresh is handled by the API client; only log unexpected errors
        const status = (error as { statusCode?: number })?.statusCode;
        if (status !== 401 && status !== 403) {
          console.error("Failed to fetch chat data:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchChatData();
    // Poll every 30 seconds
    const interval = setInterval(fetchChatData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user?._id]);

  const handleOpenMessages = () => {
    setIsOpen(false);
    router.push("/messages");
  };

  const handleStartNewChat = () => {
    setIsOpen(false);
    if (!isAuthenticated) {
      router.push("/login?redirect=/messages");
    } else {
      router.push("/messages");
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setIsOpen(false);
    router.push(`/messages?conversation=${conversationId}`);
  };

  if (shouldHide) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed bottom-24 right-4 md:right-6 w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 ${className}`}
          >
            {/* Header */}
            <div className="bg-linear-to-r from-violet-600 to-purple-600 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <h3 className="text-lg font-semibold text-white">Messages</h3>
                </div>
                {unreadCount > 0 && (
                  <span className="bg-white text-violet-600 text-xs font-bold px-2 py-1 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {/* Start New Chat */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Start a new chat
                </p>
                <button
                  onClick={handleStartNewChat}
                  className="w-full flex items-center justify-between p-4 bg-violet-50 dark:bg-violet-900/20 border-2 border-violet-200 dark:border-violet-700 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        New Conversation
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        We typically reply in a few minutes
                      </p>
                    </div>
                  </div>
                  <Send className="w-5 h-5 text-violet-600 dark:text-violet-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Recent Conversations */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Recent
                </p>
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : recentConversations.length > 0 ? (
                  <div className="space-y-2">
                    {recentConversations.map((conv) => {
                      const otherParticipant = conv.participants?.find(
                        (p: any) => p._id !== user?._id
                      );
                      const userId = user?._id;
                      const unread = userId && conv.unreadCount ? conv.unreadCount[userId] || 0 : 0;

                      return (
                        <button
                          key={conv._id}
                          onClick={() => handleSelectConversation(conv._id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="relative">
                            <div className="w-10 h-10 bg-linear-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {otherParticipant?.fullName?.charAt(0) || "?"}
                            </div>
                            {unread > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {unread}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {otherParticipant?.fullName || "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {conv.lastMessage?.content || "No messages yet"}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No recent conversations
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={handleOpenMessages}
                className="w-full py-2.5 text-violet-600 dark:text-violet-400 font-medium hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
              >
                View all messages
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-4 md:right-6 z-50 w-14 h-14 bg-linear-to-r from-violet-600 to-purple-600 rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center text-white hover:shadow-xl hover:shadow-violet-500/40 transition-all ${className}`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread Badge */}
        {!isOpen && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>
    </>
  );
}

export default FloatingChatButton;

