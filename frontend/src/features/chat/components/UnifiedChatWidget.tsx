// ============================================
// UNIFIED CHAT SYSTEM - Best Features Combined
// Modern UI with real-time messaging + FAQ support
// ============================================

"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Bot,
  User,
  ChevronRight,
  Loader2,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthContext } from "@/context/AuthContext";
import { chatService } from "@/modules/chat/services";
import { QAPair } from "./QAChatWidget";

interface UnifiedChatWidgetProps {
  // FAQ support data
  faqData?: QAPair[];
  showFAQ?: boolean;
  
  // styling
  position?: "bottom-right" | "bottom-left";
  accentColor?: "teal" | "blue" | "purple" | "green";
  className?: string;
}

export const UnifiedChatWidget: React.FC<UnifiedChatWidgetProps> = React.memo(({
  faqData = [],
  showFAQ = true,
  position = "bottom-right",
  accentColor = "teal",
  className = "",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthContext();
  
  // widget state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"messages" | "faq">("messages");
  
  // messaging state
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // FAQ state
  const [faqMessages, setFaqMessages] = useState<{ type: "question" | "answer"; content: string; id: string }[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // hide on certain pages - memoize
  const hiddenPaths = useMemo(() => ["/messages", "/login", "/register", "/forgot-password"], []);
  const shouldHide = useMemo(() => 
    hiddenPaths.some((path) => pathname?.startsWith(path)),
    [pathname, hiddenPaths]
  );

  // scroll to bottom - useCallback to prevent recreation
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [faqMessages, scrollToBottom]);

  // Memoize user values for stable dependency array
  const userId = user?._id;
  const userRole = user?.role;

  // fetch messaging data — only when widget is open to avoid global page-load latency
  useEffect(() => {
    const fetchChatData = async () => {
      if (!isAuthenticated) return;
      // Admins don't have chat conversation access - skip silently
      if (userRole === 'admin') return;

      try {
        setIsLoading(true);
        const response = await chatService.getConversations(1, 3);
        if (response.success && response.data) {
          setRecentConversations(response.data.conversations || []);

          const totalUnread = response.data.conversations?.reduce((acc: number, conv: any) => {
            const myUnread = userId && conv.unreadCount ? conv.unreadCount[userId] || 0 : 0;
            return acc + myUnread;
          }, 0) || 0;
          setUnreadCount(totalUnread);
        }
      } catch (error) {
        // Token refresh is handled by the API client; only log unexpected errors.
        // Suppress 401/403 (auth handled upstream) and TypeError (backend unreachable).
        const status = (error as { statusCode?: number })?.statusCode;
        if (status !== 401 && status !== 403 && !(error instanceof TypeError)) {
          console.error("Failed to fetch chat data:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch when widget is open — avoids unnecessary API call on every page load
    if (isOpen && isAuthenticated && userRole !== 'admin') {
      fetchChatData();
      const interval = setInterval(fetchChatData, 30000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [isOpen, isAuthenticated, userId, userRole]);

  // handle FAQ question click - useCallback
  const handleFAQClick = useCallback((qa: QAPair) => {
    const questionMsg = {
      id: `q-${Date.now()}`,
      type: "question" as const,
      content: qa.question,
    };

    setFaqMessages((prev) => [...prev, questionMsg]);

    setTimeout(() => {
      const answerMsg = {
        id: `a-${Date.now()}`,
        type: "answer" as const,
        content: qa.answer,
      };
      setFaqMessages((prev) => [...prev, answerMsg]);
      setAnsweredQuestions((prev) => new Set([...prev, qa.id]));
    }, 400);
  }, []);

  // navigation handlers - useCallback
  const goToMessages = useCallback(() => {
    setIsOpen(false);
    if (!isAuthenticated) {
      router.push("/login?redirect=/messages");
    } else {
      router.push("/messages");
    }
  }, [isAuthenticated, router]);

  const selectConversation = useCallback((conversationId: string) => {
    setIsOpen(false);
    router.push(`/messages?conversation=${conversationId}`);
  }, [router]);

  const getOtherParticipant = useCallback((conv: any) => {
    if (!user) return null;
    return conv.participants?.find((p: any) => p._id !== user._id);
  }, [user]);

  if (shouldHide) return null;

  const accentColors = {
    teal: "from-teal-600 to-teal-700",
    blue: "from-blue-600 to-blue-700",
    purple: "from-purple-600 to-purple-700",
    green: "from-green-600 to-green-700",
  };

  const positionClass = position === "bottom-right" ? "right-4 md:right-6" : "left-4 md:left-6";
  const availableFAQ = faqData.filter((qa) => !answeredQuestions.has(qa.id));

  return (
    <>
      {/* backdrop for mobile */}
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

      {/* chat widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${positionClass} bottom-24 z-50 w-[calc(100%-2rem)] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
          >
            {/* header */}
            <div className={`bg-linear-to-r ${accentColors[accentColor]} text-white px-5 py-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-base">CareConnect Chat</h3>
                  <p className="text-xs text-white/80">Messages & Support</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* tabs */}
            {showFAQ && isAuthenticated && faqData.length > 0 && (
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <button
                  onClick={() => setActiveTab("messages")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === "messages"
                      ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 bg-white dark:bg-gray-800"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <MessageSquare size={16} />
                  Messages
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("faq")}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === "faq"
                      ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 bg-white dark:bg-gray-800"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <HelpCircle size={16} />
                  Help
                </button>
              </div>
            )}

            {/* content */}
            <div className="h-96 overflow-y-auto">
              {/* MESSAGES TAB */}
              {activeTab === "messages" && (
                <div className="p-4">
                  {!isAuthenticated ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Sign in to view your messages
                      </p>
                      <button
                        onClick={() => router.push("/login?redirect=/messages")}
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                      >
                        Sign In
                      </button>
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    </div>
                  ) : recentConversations.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 mb-4">No conversations yet</p>
                      <button
                        onClick={goToMessages}
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
                      >
                        Start Chatting
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentConversations.map((conv) => {
                        const other = getOtherParticipant(conv);
                        const myUnread = conv.unreadCount?.[user?._id || ""] || 0;

                        return (
                          <button
                            key={conv._id}
                            onClick={() => selectConversation(conv._id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                          >
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold shrink-0">
                              {other?.fullName?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {other?.fullName || "Unknown"}
                                </h4>
                                {myUnread > 0 && (
                                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                                    {myUnread}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                {conv.lastMessage?.content || "No messages yet"}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                          </button>
                        );
                      })}

                      <button
                        onClick={goToMessages}
                        className="w-full py-3 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors font-medium text-sm mt-2"
                      >
                        View All Messages ?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ TAB */}
              {activeTab === "faq" && (
                <div className="flex flex-col h-full">
                  {/* chat area */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {faqMessages.length === 0 && (
                      <div className="flex gap-2 items-start">
                        <div className="w-8 h-8 bg-linear-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center">
                          <Bot size={16} className="text-white" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            Hi! I'm here to help. Click a question below to get started.
                          </p>
                        </div>
                      </div>
                    )}

                    {faqMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2 items-start ${
                          msg.type === "question" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            msg.type === "question"
                              ? "bg-linear-to-br from-blue-500 to-blue-600"
                              : "bg-linear-to-br from-teal-500 to-teal-600"
                          }`}
                        >
                          {msg.type === "question" ? (
                            <User size={16} className="text-white" />
                          ) : (
                            <Bot size={16} className="text-white" />
                          )}
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                            msg.type === "question"
                              ? "bg-blue-600 text-white rounded-tr-sm"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* questions */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
                    {availableFAQ.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {availableFAQ.slice(0, 4).map((qa) => (
                          <button
                            key={qa.id}
                            onClick={() => handleFAQClick(qa)}
                            className="w-full text-left px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all text-teal-600 dark:text-teal-400"
                          >
                            {qa.question}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-500 py-2">
                        All questions answered!
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${positionClass} bottom-6 z-50 w-14 h-14 bg-linear-to-r ${accentColors[accentColor]} text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 hover:scale-105`}
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </>
  );
});

UnifiedChatWidget.displayName = 'UnifiedChatWidget';

export default UnifiedChatWidget;
