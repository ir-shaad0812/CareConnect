// ============================================
// ConversationItem — Sidebar conversation row
// Memoized presentational component
// ============================================

"use client";

import React from "react";
import { motion } from "framer-motion";
import { type Conversation, type Participant } from "@/modules/chat/services";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  other: Participant | null;
  unreadCount: number;
  isOnline: boolean;
  index: number;
  onSelect: (conversation: Conversation) => void;
  formatConversationTime: (date: string) => string;
}

const ConversationItem = React.memo(function ConversationItem({
  conversation,
  isSelected,
  other,
  unreadCount,
  isOnline,
  index,
  onSelect,
  formatConversationTime,
}: ConversationItemProps) {
  return (
    <motion.button
      key={conversation._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect(conversation)}
      className={`w-full p-4 flex items-start gap-3.5 rounded-xl transition-all duration-200 text-left group relative overflow-hidden ${
        isSelected
          ? "bg-linear-to-r from-[#39B54A]/5 to-[#39B54A]/10 shadow-sm ring-2 ring-[#39B54A]/20"
          : "hover:bg-gray-50 active:scale-[0.98]"
      }`}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className={`absolute inset-0 bg-linear-to-r from-[#39B54A]/5 to-[#39B54A]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          isSelected ? "opacity-100" : ""
        }`}
      />

      {/* Avatar */}
      <div className="relative shrink-0 z-10">
        <div
          className={`w-14 h-14 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
            isOnline ? "ring-2 ring-green-400 ring-offset-2" : ""
          }`}
        >
          {other?.fullName?.charAt(0) || "?"}
        </div>
        {isOnline && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-3 border-white rounded-full shadow-sm"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-start justify-between mb-1.5">
          <h4
            className={`font-semibold truncate pr-2 ${
              unreadCount > 0 ? "text-gray-900" : "text-gray-700"
            }`}
          >
            {other?.fullName || "Unknown User"}
          </h4>
          <span
            className={`text-xs shrink-0 ${
              unreadCount > 0 ? "text-[#39B54A] font-medium" : "text-gray-400"
            }`}
          >
            {conversation.lastMessage?.createdAt
              ? formatConversationTime(conversation.lastMessage.createdAt)
              : ""}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <p
              className={`text-sm truncate ${
                unreadCount > 0
                  ? "text-gray-700 font-medium"
                  : "text-gray-500"
              }`}
            >
              {conversation.lastMessage?.content || "No messages yet"}
            </p>

            {/* Label Badge */}
            {(conversation as Conversation & { label?: string }).label && (
              <span
                className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                  (conversation as Conversation & { label?: string }).label === "inquiry"
                    ? "bg-blue-100 text-blue-700"
                    : (conversation as Conversation & { label?: string }).label === "booked"
                    ? "bg-green-100 text-green-700"
                    : (conversation as Conversation & { label?: string }).label === "active"
                    ? "bg-[#39B54A]/10 text-[#2d913c]"
                    : (conversation as Conversation & { label?: string }).label === "completed"
                    ? "bg-gray-100 text-gray-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {(() => {
                  const lbl = (conversation as Conversation & { label?: string }).label;
                  return lbl ? lbl.charAt(0).toUpperCase() + lbl.slice(1) : null;
                })()}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="shrink-0 min-w-[22px] h-5.5 px-2 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </div>
      </div>
    </motion.button>
  );
});

export default ConversationItem;
