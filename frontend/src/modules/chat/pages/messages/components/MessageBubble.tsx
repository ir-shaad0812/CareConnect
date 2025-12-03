// ============================================
// MessageBubble — Single message bubble
// Memoized presentational component
// ============================================

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  Pin,
  Ban,
  Check,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { type Message, type OptimisticMessage, type Participant } from "@/modules/chat/services";

interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
  hasOwn: boolean;
}

interface MessageBubbleProps {
  message: Message | OptimisticMessage;
  isOwn: boolean;
  showAvatar: boolean;
  otherParticipant: Participant | null;
  messageSearchQuery: string;
  showReactionPicker: string | null;
  onToggleReactionPicker: (messageId: string | null) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onPin: (messageId: string) => void;
  onReport: (messageId: string) => void;
  onRetry: (tempId: string) => void;
  onRemoveFailed: (tempId: string) => void;
  currentUserId: string | undefined;
  quickReactions: readonly string[];
  formatMessageTime: (date: string) => string;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  isOwn,
  showAvatar,
  otherParticipant,
  messageSearchQuery,
  showReactionPicker,
  onToggleReactionPicker,
  onReact,
  onRemoveReaction,
  onPin,
  onReport,
  onRetry,
  onRemoveFailed,
  currentUserId,
  quickReactions,
  formatMessageTime,
}: MessageBubbleProps) {
  const isOptimistic = "tempId" in message;
  const optimistic = isOptimistic ? (message as OptimisticMessage) : null;

  // Build grouped reactions
  const reactionGroups: ReactionGroup[] = [];
  if (message.reactions && message.reactions.length > 0) {
    for (const reaction of message.reactions) {
      const existing = reactionGroups.find((r) => r.emoji === reaction.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(reaction.userName);
        if (reaction.userId === currentUserId) existing.hasOwn = true;
      } else {
        reactionGroups.push({
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.userName],
          hasOwn: reaction.userId === currentUserId,
        });
      }
    }
  }

  const isPinned = !isOptimistic && (message as Message).pinned?.isPinned;

  const renderContent = () => {
    const text = message.content;
    if (
      messageSearchQuery &&
      text.toLowerCase().includes(messageSearchQuery.toLowerCase())
    ) {
      return (
        <>
          {text
            .split(new RegExp(`(${messageSearchQuery})`, "gi"))
            .map((part: string, i: number) =>
              part.toLowerCase() === messageSearchQuery.toLowerCase() ? (
                <mark
                  key={i}
                  className="bg-yellow-300 text-gray-900 rounded px-0.5"
                >
                  {part}
                </mark>
              ) : (
                <React.Fragment key={i}>{part}</React.Fragment>
              )
            )}
        </>
      );
    }
    return text;
  };

  const renderStatusIcon = () => {
    if (!isOwn) return null;

    if (optimistic?.status === "sending") {
      return <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />;
    }
    if (optimistic?.status === "failed") {
      return (
        <span className="text-red-500 text-[10px] font-medium">Failed</span>
      );
    }

    const status = (message as Message).status;
    if (status === "read") {
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
    }
    return <Check className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <motion.div
      key={message._id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-end gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      {/* Other user's avatar */}
      {!isOwn && (
        <div className={`shrink-0 ${showAvatar ? "" : "invisible"}`}>
          <div className="w-9 h-9 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md">
            {otherParticipant?.fullName?.charAt(0) || "?"}
          </div>
        </div>
      )}

      {/* Bubble + meta */}
      <div
        className={`max-w-[70%] lg:max-w-[60%] ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
        {/* Bubble */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`group relative px-4 py-3 rounded-2xl shadow-sm ${
            isOwn
              ? "bg-linear-to-br from-[#39B54A] to-[#2d913c] text-white rounded-br-md"
              : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
          }`}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {renderContent()}
          </p>

          {/* Action buttons — visible on hover */}
          <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-sm transition-all duration-200">
            <button
              onClick={() =>
                onToggleReactionPicker(
                  showReactionPicker === message._id ? null : message._id
                )
              }
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="React"
            >
              <Smile className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => onPin(message._id)}
              className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
              title={isPinned ? "Unpin" : "Pin"}
            >
              <Pin
                className={`w-4 h-4 ${
                  isPinned ? "text-amber-600" : "text-gray-600"
                }`}
              />
            </button>
            {!isOwn && (
              <button
                onClick={() => onReport(message._id)}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                title="Report"
              >
                <Ban className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Reaction picker */}
          <AnimatePresence>
            {showReactionPicker === message._id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 right-0 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex gap-1"
              >
                {quickReactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(message._id, emoji)}
                    className="p-2 text-2xl hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Reaction groups */}
        {reactionGroups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1 mt-1.5 flex-wrap ${
              isOwn ? "justify-end" : ""
            }`}
          >
            {reactionGroups.map((group) => (
              <button
                key={group.emoji}
                onClick={() =>
                  group.hasOwn
                    ? onRemoveReaction(message._id, group.emoji)
                    : onReact(message._id, group.emoji)
                }
                className={`px-2 py-1 rounded-lg flex items-center gap-1 text-xs transition-colors ${
                  group.hasOwn
                    ? "bg-[#39B54A]/10 ring-1 ring-[#39B54A]/30"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
                title={group.users.join(", ")}
              >
                <span>{group.emoji}</span>
                <span className="font-semibold text-gray-600">
                  {group.count}
                </span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Timestamp & status */}
        <div
          className={`flex items-center gap-1.5 mt-1.5 px-1 ${
            isOwn ? "justify-end" : ""
          }`}
        >
          {isPinned && <Pin className="w-3 h-3 text-amber-500" />}
          <span className="text-[11px] text-gray-400 font-medium">
            {formatMessageTime(message.createdAt)}
          </span>
          {isOwn && <span className="text-xs">{renderStatusIcon()}</span>}
        </div>

        {/* Failed message actions */}
        {optimistic?.status === "failed" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-2 justify-end"
          >
            <button
              onClick={() => onRetry(optimistic.tempId)}
              className="text-xs text-[#39B54A] hover:text-[#2d913c] font-medium flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </button>
            <button
              onClick={() => onRemoveFailed(optimistic.tempId)}
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Remove
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export default MessageBubble;
