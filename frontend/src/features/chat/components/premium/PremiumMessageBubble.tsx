// ============================================
// PREMIUM MESSAGE BUBBLE
// WhatsApp/Instagram-style message with rich features
// ============================================

"use client";

import { useState, useCallback, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Clock,
  MoreHorizontal,
  Reply,
  Copy,
  Pin,
  Flag,
  Trash2,
  Download,
  AlertCircle,
  Smile,
} from "lucide-react";
import type { Message } from "@/modules/chat/services";

// ============================================
// TYPES
// ============================================

interface PremiumMessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onReply?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onReport?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  currentUserId?: string;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const bubbleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -10,
    transition: {
      duration: 0.15,
    },
  },
};

const menuVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: -5,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
};

const reactionVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 20,
    },
  },
  exit: { scale: 0, opacity: 0 },
  hover: {
    scale: 1.3,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  },
};

// ============================================
// SUB-COMPONENTS
// ============================================

const MessageStatus = memo(({ status }: { status: string }) => {
  switch (status) {
    case "read":
      return <CheckCheck className="w-4 h-4 text-blue-500" aria-label="Read" />;
    case "delivered":
      return <CheckCheck className="w-4 h-4 text-gray-400" aria-label="Delivered" />;
    case "sent":
      return <Check className="w-4 h-4 text-gray-400" aria-label="Sent" />;
    case "failed":
      return <AlertCircle className="w-4 h-4 text-red-500" aria-label="Failed" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400 animate-pulse" aria-label="Sending" />;
  }
});
MessageStatus.displayName = "MessageStatus";

const ReactionBadge = memo(({ 
  reaction, 
  count, 
  isOwn,
  onClick 
}: { 
  reaction: string; 
  count: number; 
  isOwn: boolean;
  onClick: () => void;
}) => (
  <motion.button
    variants={reactionVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    whileHover="hover"
    onClick={onClick}
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
      isOwn
        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`}
    aria-label={`${reaction} reaction, ${count} ${count === 1 ? "person" : "people"}`}
  >
    <span>{reaction}</span>
    {count > 1 && <span>{count}</span>}
  </motion.button>
));
ReactionBadge.displayName = "ReactionBadge";

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumMessageBubble = memo<PremiumMessageBubbleProps>(({
  message,
  isOwn,
  showAvatar = true,
  showTimestamp = true,
  isFirst = true,
  isLast = true,
  onReply,
  onReact,
  onRemoveReaction,
  onPin,
  onReport,
  onDelete,
  onCopy,
  currentUserId,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  const {
    content,
    messageType,
    status,
    createdAt,
    senderId,
    attachments,
    reactions,
    pinned,
  } = message;

  const formattedTime = format(new Date(createdAt), "h:mm a");

  // Group reactions by emoji
  const groupedReactions = reactions?.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, hasUserReacted: false };
    }
    acc[r.emoji].count++;
    if (r.userId === currentUserId) {
      acc[r.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasUserReacted: boolean }>) || {};

  // Quick reactions
  const quickReactions = ["👍", "❤️", "😊", "😂", "😮", "🙏"];

  // Handle reaction click
  const handleReaction = useCallback((emoji: string) => {
    if (groupedReactions[emoji]?.hasUserReacted) {
      onRemoveReaction?.(message._id, emoji);
    } else {
      onReact?.(message._id, emoji);
    }
    setShowReactionPicker(false);
  }, [message._id, groupedReactions, onReact, onRemoveReaction]);

  // Handle copy
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
    onCopy?.(content);
    setShowMenu(false);
  }, [content, onCopy]);

  // Render system message
  if (messageType === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
        role="status"
        aria-live="polite"
      >
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-4 py-2 rounded-full shadow-sm">
          {content}
        </div>
      </motion.div>
    );
  }

  // Bubble corner styles
  const getBubbleCorners = () => {
    if (isOwn) {
      return `${isFirst ? "rounded-tr-3xl" : "rounded-tr-lg"} ${isLast ? "rounded-br-md" : "rounded-br-lg"} rounded-tl-3xl rounded-bl-3xl`;
    }
    return `${isFirst ? "rounded-tl-3xl" : "rounded-tl-lg"} ${isLast ? "rounded-bl-md" : "rounded-bl-lg"} rounded-tr-3xl rounded-br-3xl`;
  };

  return (
    <motion.div
      variants={bubbleVariants}
      initial="initial"
      animate="animate"
      layout
      className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""} ${
        !showAvatar ? (isOwn ? "mr-10" : "ml-10") : ""
      }`}
      onMouseLeave={() => {
        setShowMenu(false);
        setShowReactionPicker(false);
      }}
    >
      {/* Avatar */}
      {showAvatar && (
        <div className="shrink-0 self-end">
          {typeof senderId === "object" && senderId.avatar ? (
            <Image
              src={senderId.avatar}
              alt={senderId.fullName}
              width={32}
              height={32}
              className="rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm ${
              isOwn
                ? "bg-linear-to-br from-blue-500 to-blue-600"
                : "bg-linear-to-br from-[#39B54A] to-[#2d913c]"
            }`}>
              {typeof senderId === "object" ? senderId.fullName?.[0] : "U"}
            </div>
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`relative max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Pinned indicator */}
        {pinned?.isPinned && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1 text-xs text-amber-600 mb-1 ${isOwn ? "justify-end" : ""}`}
          >
            <Pin className="w-3 h-3" />
            <span>Pinned</span>
          </motion.div>
        )}

        {/* Message bubble */}
        <div
          className={`relative px-4 py-2.5 ${getBubbleCorners()} shadow-sm transition-shadow hover:shadow-md ${
            isOwn
              ? "bg-linear-to-br from-blue-500 to-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700"
          }`}
        >
          {/* Image attachment */}
          {messageType === "image" && attachments?.[0] && (
            <div className="relative mb-2 rounded-xl overflow-hidden">
              {isImageLoading && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
              )}
              <Image
                src={attachments[0].url}
                alt={attachments[0].name || "Image"}
                width={280}
                height={200}
                className="object-cover rounded-xl"
                onLoadingComplete={() => setIsImageLoading(false)}
              />
            </div>
          )}

          {/* File attachment */}
          {messageType === "file" && attachments?.[0] && (
            <a
              href={attachments[0].url}
              download={attachments[0].name}
              className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors ${
                isOwn ? "bg-blue-600/50 hover:bg-blue-600/70" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <Download className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{attachments[0].name}</p>
                {attachments[0].size && (
                  <p className={`text-xs ${isOwn ? "text-blue-200" : "text-gray-500"}`}>
                    {(attachments[0].size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </a>
          )}

          {/* Text content */}
          {content && messageType === "text" && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word">
              {content}
            </p>
          )}

          {/* Timestamp and status */}
          {showTimestamp && (
            <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? "justify-end" : ""}`}>
              <span className={`text-[10px] ${isOwn ? "text-blue-200" : "text-gray-400"}`}>
                {formattedTime}
              </span>
              {isOwn && <MessageStatus status={status} />}
            </div>
          )}

          {/* Hover actions */}
          <AnimatePresence>
            {(showMenu || showReactionPicker) && (
              <motion.div
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className={`absolute ${isOwn ? "left-0 -translate-x-full pl-2" : "right-0 translate-x-full pr-2"} top-0 flex items-start gap-1 z-10`}
              >
                {/* Quick reaction picker */}
                {showReactionPicker && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5"
                  >
                    {quickReactions.map((emoji) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(emoji)}
                        className="w-7 h-7 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        aria-label={`React with ${emoji}`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons on hover */}
          <div
            className={`absolute ${isOwn ? "left-0 -translate-x-full pl-2" : "right-0 translate-x-full pr-2"} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Add reaction"
            >
              <Smile className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onReply?.(message)}
              className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Reply"
            >
              <Reply className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(groupedReactions).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}
          >
            <AnimatePresence>
              {Object.entries(groupedReactions).map(([emoji, { count, hasUserReacted }]) => (
                <ReactionBadge
                  key={emoji}
                  reaction={emoji}
                  count={count}
                  isOwn={hasUserReacted}
                  onClick={() => handleReaction(emoji)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`absolute z-20 ${isOwn ? "right-0" : "left-0"} top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[160px]`}
            >
              <button
                onClick={() => onReply?.(message)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Reply className="w-4 h-4" />
                Reply
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={() => {
                  onPin?.(message._id);
                  setShowMenu(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Pin className="w-4 h-4" />
                {pinned?.isPinned ? "Unpin" : "Pin"}
              </button>
              {!isOwn && (
                <button
                  onClick={() => {
                    onReport?.(message._id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Report
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => {
                    onDelete?.(message._id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

PremiumMessageBubble.displayName = "PremiumMessageBubble";

export default PremiumMessageBubble;

