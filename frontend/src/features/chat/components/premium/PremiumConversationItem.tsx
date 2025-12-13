// ============================================
// PREMIUM CONVERSATION ITEM
// Instagram/WhatsApp-style conversation preview
// ============================================

"use client";

import { memo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import {
  Image as ImageIcon,
  File,
  Mic,
  Pin,
  BellOff,
  CheckCheck,
  Check,
  Clock,
} from "lucide-react";
import { PremiumOnlineStatus } from "./PremiumOnlineStatus";
import type { Conversation, Participant } from "@/modules/chat/services";

// ============================================
// TYPES
// ============================================

interface PremiumConversationItemProps {
  conversation: Conversation;
  otherParticipant: Participant | null;
  isSelected?: boolean;
  isOnline?: boolean;
  unreadCount?: number;
  currentUserId?: string;
  onSelect: (conversation: Conversation) => void;
  onLongPress?: (conversation: Conversation) => void;
  showLabel?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const labelColors: Record<string, { bg: string; text: string }> = {
  inquiry: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  booked: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
  active: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  completed: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-400" },
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const itemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  hover: {
    backgroundColor: "rgba(57, 181, 74, 0.05)",
    transition: { duration: 0.15 },
  },
  tap: { scale: 0.98 },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatTime = (date: string | Date) => {
  const d = new Date(date);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

const getMessagePreview = (lastMessage: Conversation["lastMessage"]) => {
  if (!lastMessage) return "No messages yet";

  switch (lastMessage.messageType) {
    case "image":
      return (
        <span className="flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5" />
          Photo
        </span>
      );
    case "file":
      return (
        <span className="flex items-center gap-1">
          <File className="w-3.5 h-3.5" />
          Document
        </span>
      );
    case "voice":
      return (
        <span className="flex items-center gap-1">
          <Mic className="w-3.5 h-3.5" />
          Voice message
        </span>
      );
    case "system":
      return (
        <span className="italic text-gray-400">{lastMessage.content}</span>
      );
    default:
      return lastMessage.content;
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumConversationItem = memo<PremiumConversationItemProps>(({
  conversation,
  otherParticipant,
  isSelected = false,
  isOnline = false,
  unreadCount = 0,
  currentUserId,
  onSelect,
  onLongPress,
  showLabel = true,
}) => {
  const { lastMessage, isPinned, mutedBy, label, updatedAt } = conversation;
  const isMuted = mutedBy?.includes(currentUserId || "");
  const isOwnLastMessage = lastMessage?.senderId === currentUserId;

  return (
    <motion.button
      variants={itemVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      onClick={() => onSelect(conversation)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.(conversation);
      }}
      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors text-left ${
        isSelected
          ? "bg-[#39B54A]/10 ring-1 ring-[#39B54A]/20"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
      }`}
      aria-selected={isSelected}
      role="option"
    >
      {/* Pinned indicator */}
      {isPinned && (
        <div className="absolute top-2 right-2">
          <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />
        </div>
      )}

      {/* Avatar */}
      <div className="relative shrink-0">
        {otherParticipant?.avatar ? (
          <Image
            src={otherParticipant.avatar}
            alt={otherParticipant.fullName}
            width={52}
            height={52}
            className="rounded-full ring-2 ring-white dark:ring-gray-900 shadow-sm"
          />
        ) : (
          <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-lg font-semibold shadow-sm ${
            isSelected
              ? "bg-linear-to-br from-[#39B54A] to-[#2d913c]"
              : "bg-linear-to-br from-gray-400 to-gray-500"
          }`}>
            {otherParticipant?.fullName?.[0] || "?"}
          </div>
        )}
        <PremiumOnlineStatus isOnline={isOnline} size="md" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          {/* Name + Label */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${
              unreadCount > 0
                ? "text-gray-900 dark:text-white"
                : "text-gray-700 dark:text-gray-200"
            }`}>
              {otherParticipant?.fullName || "Unknown User"}
            </h3>
            {isMuted && (
              <BellOff className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            {showLabel && label && labelColors[label] && (
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${labelColors[label].bg} ${labelColors[label].text}`}>
                {label}
              </span>
            )}
          </div>

          {/* Time */}
          <span className={`text-xs shrink-0 ${
            unreadCount > 0
              ? "text-[#39B54A] font-medium"
              : "text-gray-400"
          }`}>
            {lastMessage?.createdAt ? formatTime(lastMessage.createdAt) : formatTime(updatedAt)}
          </span>
        </div>

        {/* Message Preview */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Read status for own messages */}
            {isOwnLastMessage && lastMessage && (
              <span className="shrink-0">
                {lastMessage.status === "read" ? (
                  <CheckCheck className="w-4 h-4 text-blue-500" />
                ) : lastMessage.status === "delivered" ? (
                  <CheckCheck className="w-4 h-4 text-gray-400" />
                ) : lastMessage.status === "sent" ? (
                  <Check className="w-4 h-4 text-gray-400" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-300" />
                )}
              </span>
            )}

            {/* Message text */}
            <p className={`text-sm truncate ${
              unreadCount > 0
                ? "text-gray-900 dark:text-gray-100 font-medium"
                : "text-gray-500 dark:text-gray-400"
            }`}>
              {getMessagePreview(lastMessage)}
            </p>
          </div>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="shrink-0 min-w-[22px] h-[22px] px-1.5 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </div>
      </div>
    </motion.button>
  );
});

PremiumConversationItem.displayName = "PremiumConversationItem";

export default PremiumConversationItem;

