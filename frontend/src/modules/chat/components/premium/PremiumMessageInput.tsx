// ============================================
// PREMIUM MESSAGE INPUT
// WhatsApp-style input with emoji, attachments, voice
// ============================================

"use client";

import React, { useState, useRef, useCallback, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Mic,
  X,
  FileText,
  Loader2,
  StopCircle,
} from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

// ============================================
// TYPES
// ============================================

interface Attachment {
  file: File;
  preview?: string;
  type: "image" | "file";
}

interface PremiumMessageInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
  isBlocked?: boolean;
  placeholder?: string;
  replyTo?: { content: string; senderName: string } | null;
  onCancelReply?: () => void;
  darkMode?: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const attachmentPreviewVariants = {
  initial: { opacity: 0, scale: 0.8, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.8, y: 20 },
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
};

const emojiPickerVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumMessageInput = memo<PremiumMessageInputProps>(({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  isBlocked = false,
  placeholder = "Type a message...",
  replyTo,
  onCancelReply,
  darkMode = false,
}) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }

    return undefined;
  }, [showEmojiPicker]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingStart?.();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop?.();
    }, 2000);
  }, [isTyping, onTypingStart, onTypingStop]);

  // Handle message change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();
  }, [handleTyping]);

  // Handle emoji select
  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const files = Array.from(e.target.files || []);
    const maxSize = type === "image" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;

    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is ${type === "image" ? "5MB" : "10MB"}.`);
        return false;
      }
      return true;
    });

    const newAttachments: Attachment[] = validFiles.map((file) => ({
      file,
      type,
      ...(type === "image" ? { preview: URL.createObjectURL(file) } : {}),
    }));

    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
    setShowAttachmentMenu(false);
    e.target.value = "";
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const newAttachments = [...prev];
      const removed = newAttachments.splice(index, 1)[0];
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newAttachments;
    });
  }, []);

  // Handle send
  const handleSend = useCallback(async () => {
    if ((!message.trim() && attachments.length === 0) || disabled || isSending) {
      return;
    }

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    onTypingStop?.();

    setIsSending(true);
    try {
      await onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage("");
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setIsSending(false);
    }
  }, [message, attachments, disabled, isSending, onSendMessage, onTypingStop]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Blocked state
  if (isBlocked) {
    return (
      <div className="flex items-center justify-center px-4 py-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You have blocked this user. Unblock to send messages.
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      {/* Reply Preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-1 h-10 bg-[#39B54A] rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#39B54A]">
                  Replying to {replyTo.senderName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {replyTo.content}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancelReply}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachment Previews */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 overflow-x-auto"
          >
            {attachments.map((attachment, index) => (
              <motion.div
                key={index}
                variants={attachmentPreviewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative group shrink-0"
              >
                {attachment.type === "image" ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img
                      src={attachment.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 max-w-25 truncate">
                      {attachment.file.name}
                    </span>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md"
                  aria-label="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Emoji Button */}
        <div className="relative" ref={emojiPickerRef}>
          <motion.button
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-full transition-colors ${
              showEmojiPicker
                ? "text-[#39B54A] bg-[#39B54A]/10"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            aria-label="Open emoji picker"
            aria-expanded={showEmojiPicker}
          >
            <Smile className="w-5 h-5" />
          </motion.button>

          {/* Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                variants={emojiPickerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="absolute bottom-full left-0 mb-2 z-50"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={darkMode ? Theme.DARK : Theme.LIGHT}
                  width={320}
                  height={400}
                  previewConfig={{ showPreview: false }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Attachment Button */}
        <div className="relative">
          <motion.button
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className={`p-2.5 rounded-full transition-colors ${
              showAttachmentMenu
                ? "text-[#39B54A] bg-[#39B54A]/10"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            aria-label="Attach file"
            aria-expanded={showAttachmentMenu}
          >
            <Paperclip className="w-5 h-5" />
          </motion.button>

          {/* Attachment Menu */}
          <AnimatePresence>
            {showAttachmentMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAttachmentMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                >
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Photos</p>
                      <p className="text-xs text-gray-500">Share images</p>
                    </div>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Documents</p>
                      <p className="text-xs text-gray-500">Share files</p>
                    </div>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e, "image")}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e, "file")}
        />

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-0 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-[#39B54A]/30 focus:outline-none transition-all max-h-37.5 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: "44px" }}
            aria-label="Message input"
          />
        </div>

        {/* Send / Voice Button */}
        <motion.button
          variants={buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          onClick={message.trim() || attachments.length > 0 ? handleSend : undefined}
          disabled={disabled || isSending}
          className={`p-3 rounded-full transition-all ${
            message.trim() || attachments.length > 0
              ? "bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white shadow-lg shadow-[#39B54A]/20"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={message.trim() || attachments.length > 0 ? "Send message" : "Record voice"}
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : message.trim() || attachments.length > 0 ? (
            <Send className="w-5 h-5" />
          ) : isRecording ? (
            <StopCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
});

PremiumMessageInput.displayName = "PremiumMessageInput";

export default PremiumMessageInput;
