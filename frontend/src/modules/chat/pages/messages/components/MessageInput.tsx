// ============================================
// MessageInput — Bottom input bar
// Memoized presentational component
// ============================================

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, Smile, Zap, X, Loader2 } from "lucide-react";
import { type ChatAccessStatus } from "@/modules/chat/services";

interface MessageInputProps {
  newMessage: string;
  onMessageChange: (value: string) => void;
  isSending: boolean;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showCannedResponses: boolean;
  setShowCannedResponses: (value: boolean) => void;
  cannedResponses: readonly string[];
  onInsertCanned: (text: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  chatAccessStatus: ChatAccessStatus | null;
  uploadingImage: boolean;
}

const MessageInput = React.memo(function MessageInput({
  newMessage,
  onMessageChange,
  isSending,
  onSendMessage,
  onKeyPress,
  onImageUpload,
  showCannedResponses,
  setShowCannedResponses,
  cannedResponses,
  onInsertCanned,
  inputRef,
  fileInputRef,
  chatAccessStatus,
  uploadingImage,
}: MessageInputProps) {
  const isRestricted = !!(
    chatAccessStatus && !chatAccessStatus.canSendMessages
  );

  const inputPlaceholder = isRestricted
    ? chatAccessStatus?.status === "locked"
      ? "Complete payment to send messages..."
      : chatAccessStatus?.status === "closed"
        ? "This chat is read-only"
        : "Chat restricted"
    : "Type your message...";

  return (
    <div className="p-4 bg-white/90 backdrop-blur-xl border-t border-gray-200/60">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
      />

      {/* Canned Responses Dropdown */}
      <AnimatePresence>
        {showCannedResponses && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 p-3 bg-white rounded-2xl shadow-xl border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Zap className="w-4 h-4 text-[#39B54A]" />
                Quick Responses
              </div>
              <button
                onClick={() => setShowCannedResponses(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {cannedResponses.map((response, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02, x: 4 }}
                  onClick={() => onInsertCanned(response)}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-[#39B54A]/5 hover:text-[#2d913c] rounded-xl transition-all duration-200"
                >
                  {response}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-2.5">
        {/* Image upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || isRestricted}
          className="p-3 text-gray-500 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload image"
        >
          {uploadingImage ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5" />
          )}
        </button>

        {/* Quick responses button */}
        <button
          onClick={() => setShowCannedResponses(!showCannedResponses)}
          disabled={isRestricted}
          className="p-3 text-gray-500 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Quick responses"
        >
          <Zap className="w-5 h-5" />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={onKeyPress}
            disabled={isRestricted}
            placeholder={inputPlaceholder}
            rows={1}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#39B54A]/30 focus:ring-4 focus:ring-[#39B54A]/5 focus:outline-none resize-none transition-all duration-200 text-[15px] disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{ minHeight: "52px", maxHeight: "120px" }}
          />
        </div>

        {/* Emoji placeholder button */}
        <button
          disabled={isRestricted}
          className="p-3 text-gray-500 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Send button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSendMessage}
          disabled={!newMessage.trim() || isSending || isRestricted}
          className="p-3.5 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white rounded-2xl hover:shadow-lg hover:shadow-[#39B54A]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
});

export default MessageInput;
