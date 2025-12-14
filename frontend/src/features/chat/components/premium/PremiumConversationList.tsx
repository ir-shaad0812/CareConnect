// ============================================
// PREMIUM CONVERSATION LIST
// WhatsApp/Messenger-style conversation sidebar
// ============================================

"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  MessageCircle, 
  Settings,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { PremiumConversationItem } from "./PremiumConversationItem";
import type { Conversation, Participant } from "@/modules/chat/services";

// ============================================
// TYPES
// ============================================

interface PremiumConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  isLoading?: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onArchiveConversation?: (conversationId: string) => void;
  onMuteConversation?: (conversationId: string) => void;
  onPinConversation?: (conversationId: string) => void;
  onlineUsers?: Set<string>;
  currentUserId?: string;
  className?: string;
}

type FilterType = "all" | "unread" | "archived" | "inquiry" | "booked" | "active";

// ============================================
// CONSTANTS
// ============================================

const FILTER_OPTIONS: { value: FilterType; label: string; icon?: React.ReactNode }[] = [
  { value: "all", label: "All Chats" },
  { value: "unread", label: "Unread" },
  { value: "inquiry", label: "Inquiries" },
  { value: "booked", label: "Booked" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

// ============================================
// ANIMATION VARIANTS
// ============================================

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumConversationList = memo<PremiumConversationListProps>(({
  conversations,
  selectedConversationId,
  isLoading = false,
  onSelectConversation,
  onArchiveConversation: _onArchiveConversation,
  onMuteConversation: _onMuteConversation,
  onPinConversation: _onPinConversation,
  onlineUsers = new Set(),
  currentUserId,
  className = "",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Get other participant helper
  const getOtherParticipant = useCallback((conversation: Conversation): Participant | null => {
    if (!currentUserId) return conversation.participants?.[0] || null;
    return conversation.participants?.find(p => p._id !== currentUserId) || null;
  }, [currentUserId]);

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let result = [...conversations];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(conv => {
        const other = getOtherParticipant(conv);
        return (
          other?.fullName?.toLowerCase().includes(query) ||
          conv.lastMessage?.content?.toLowerCase().includes(query)
        );
      });
    }

    // Apply category filter
    switch (activeFilter) {
      case "unread":
        result = result.filter(conv => {
          const unread = currentUserId ? conv.unreadCount?.[currentUserId] : 0;
          return unread && unread > 0;
        });
        break;
      case "archived":
        result = result.filter(conv => conv.status === "archived");
        break;
      case "inquiry":
      case "booked":
      case "active":
        result = result.filter(conv => conv.label === activeFilter);
        break;
      default:
        // "all" - exclude archived
        result = result.filter(conv => conv.status !== "archived");
    }

    // Sort: pinned first, then by last message time
    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [conversations, searchQuery, activeFilter, currentUserId, getOtherParticipant]);

  // Count unread conversations
  const unreadCount = useMemo(() => {
    return conversations.filter(conv => {
      const unread = currentUserId ? conv.unreadCount?.[currentUserId] : 0;
      return unread && unread > 0;
    }).length;
  }, [conversations, currentUserId]);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Messages
            </h1>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2.5 py-0.5 text-xs font-bold text-white bg-[#39B54A] rounded-full"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? "bg-[#39B54A]/10 text-[#39B54A]" 
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#39B54A]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-3">
                {FILTER_OPTIONS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                      activeFilter === filter.value
                        ? "bg-[#39B54A] text-white shadow-sm"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading skeleton
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? "No results found" : "No conversations yet"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {searchQuery 
                ? `We couldn't find any messages matching "${searchQuery}"`
                : "Start a conversation with a caregiver or care seeker"}
            </p>
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="py-2"
          >
            {filteredConversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const unreadCount = currentUserId 
                ? conversation.unreadCount?.[currentUserId] || 0 
                : 0;
              
              return (
                <motion.div key={conversation._id} variants={itemVariants}>
                  <PremiumConversationItem
                    conversation={conversation}
                    otherParticipant={otherParticipant}
                    isSelected={selectedConversationId === conversation._id}
                    isOnline={otherParticipant ? onlineUsers.has(otherParticipant._id) : false}
                    unreadCount={unreadCount}
                    {...(currentUserId ? { currentUserId } : {})}
                    onSelect={onSelectConversation}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
});

PremiumConversationList.displayName = "PremiumConversationList";

export default PremiumConversationList;

