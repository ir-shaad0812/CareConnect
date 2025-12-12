// ============================================
// PREMIUM CHAT HEADER
// Instagram/WhatsApp-style header with call buttons
// ============================================

"use client";

import { useState, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Search,
  Bell,
  BellOff,
  Archive,
  Download,
  Flag,
  Info,
  X,
  UserX,
  UserCheck,
} from "lucide-react";
import { PremiumOnlineStatus } from "./PremiumOnlineStatus";
import type { Conversation, Participant } from "@/modules/chat/services";

// ============================================
// TYPES
// ============================================

interface PremiumChatHeaderProps {
  conversation: Conversation;
  otherParticipant: Participant | null;
  isOnline?: boolean;
  isMuted?: boolean;
  isBlocked?: boolean;
  isTyping?: boolean;
  onBack?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onToggleMute?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onArchive?: () => void;
  onExport?: () => void;
  onReport?: () => void;
  onViewProfile?: () => void;
  showBackButton?: boolean;
  callingEnabled?: boolean;
}

// ============================================
// ANIMATION VARIANTS
// ============================================

const menuVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -5 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 500, damping: 30 },
  },
};

const callButtonVariants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.1,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  },
  tap: { scale: 0.95 },
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumChatHeader = memo<PremiumChatHeaderProps>(({
  conversation: _conversation,
  otherParticipant,
  isOnline = false,
  isMuted = false,
  isBlocked = false,
  isTyping = false,
  onBack,
  onVoiceCall,
  onVideoCall,
  onSearch,
  onToggleMute,
  onBlock,
  onUnblock,
  onArchive,
  onExport,
  onReport,
  onViewProfile,
  showBackButton = true,
  callingEnabled = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  const handleMenuAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60 z-20"
    >
      {/* Left Section - Back button + User info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Back Button */}
        {showBackButton && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        )}

        {/* User Avatar + Info */}
        <button
          onClick={onViewProfile}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-1.5 -m-1.5 transition-colors"
          aria-label={`View ${otherParticipant?.fullName || "user"}'s profile`}
        >
          {/* Avatar with online indicator */}
          <div className="relative shrink-0">
            {otherParticipant?.avatar ? (
              <Image
                src={otherParticipant.avatar}
                alt={otherParticipant.fullName}
                width={44}
                height={44}
                className="rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-linear-to-br from-[#39B54A] to-[#2d913c] flex items-center justify-center text-white font-semibold shadow-sm">
                {otherParticipant?.fullName?.[0] || "?"}
              </div>
            )}
            <PremiumOnlineStatus isOnline={isOnline} size="md" />
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                {otherParticipant?.fullName || "Unknown User"}
              </h2>
              {isMuted && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="p-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                >
                  <BellOff className="w-3 h-3 text-gray-400" />
                </motion.span>
              )}
              {isBlocked && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full"
                >
                  Blocked
                </motion.span>
              )}
            </div>
            <AnimatePresence mode="wait">
              {isTyping ? (
                <motion.p
                  key="typing"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="text-xs text-[#39B54A] font-medium"
                >
                  typing...
                </motion.p>
              ) : (
                <motion.p
                  key="status"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`text-xs capitalize ${
                    isOnline
                      ? "text-[#39B54A] font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {isOnline ? "Online" : otherParticipant?.role || "Offline"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </button>
      </div>

      {/* Right Section - Action buttons */}
      <div className="flex items-center gap-1">
        {/* Call Buttons (only if not blocked and calling enabled) */}
        {!isBlocked && callingEnabled && (
          <>
            <motion.button
              variants={callButtonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={onVoiceCall}
              className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-[#39B54A] hover:bg-[#39B54A]/10 rounded-xl transition-colors"
              aria-label="Start voice call"
            >
              <Phone className="w-5 h-5" />
            </motion.button>
            <motion.button
              variants={callButtonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              onClick={onVideoCall}
              className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-[#39B54A] hover:bg-[#39B54A]/10 rounded-xl transition-colors"
              aria-label="Start video call"
            >
              <Video className="w-5 h-5" />
            </motion.button>
          </>
        )}

        {/* Search Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSearchBar(!showSearchBar)}
          className={`p-2.5 rounded-xl transition-colors ${
            showSearchBar
              ? "text-[#39B54A] bg-[#39B54A]/10"
              : "text-gray-600 dark:text-gray-400 hover:text-[#39B54A] hover:bg-[#39B54A]/5"
          }`}
          aria-label="Search messages"
          aria-expanded={showSearchBar}
        >
          {showSearchBar ? (
            <X className="w-5 h-5" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </motion.button>

        {/* More Options */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2.5 rounded-xl transition-colors ${
              showMenu
                ? "text-[#39B54A] bg-[#39B54A]/10"
                : "text-gray-600 dark:text-gray-400 hover:text-[#39B54A] hover:bg-[#39B54A]/5"
            }`}
            aria-label="More options"
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <MoreVertical className="w-5 h-5" />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  variants={menuVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-40"
                  role="menu"
                >
                  {/* View Profile */}
                  <button
                    onClick={() => handleMenuAction(onViewProfile || (() => {}))}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="menuitem"
                  >
                    <Info className="w-4 h-4" />
                    View Profile
                  </button>

                  {/* Search Messages */}
                  <button
                    onClick={() => {
                      setShowSearchBar(true);
                      setShowMenu(false);
                      onSearch?.();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="menuitem"
                  >
                    <Search className="w-4 h-4" />
                    Search Messages
                  </button>

                  <div className="border-t border-gray-100 dark:border-gray-700" />

                  {/* Mute/Unmute */}
                  <button
                    onClick={() => handleMenuAction(onToggleMute || (() => {}))}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="menuitem"
                  >
                    {isMuted ? (
                      <>
                        <Bell className="w-4 h-4" />
                        Unmute Notifications
                      </>
                    ) : (
                      <>
                        <BellOff className="w-4 h-4" />
                        Mute Notifications
                      </>
                    )}
                  </button>

                  {/* Archive */}
                  <button
                    onClick={() => handleMenuAction(onArchive || (() => {}))}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="menuitem"
                  >
                    <Archive className="w-4 h-4" />
                    Archive Chat
                  </button>

                  {/* Export */}
                  <button
                    onClick={() => handleMenuAction(onExport || (() => {}))}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    role="menuitem"
                  >
                    <Download className="w-4 h-4" />
                    Export Chat
                  </button>

                  <div className="border-t border-gray-100 dark:border-gray-700" />

                  {/* Block/Unblock */}
                  {isBlocked ? (
                    <button
                      onClick={() => handleMenuAction(onUnblock || (() => {}))}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      role="menuitem"
                    >
                      <UserCheck className="w-4 h-4" />
                      Unblock User
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMenuAction(onBlock || (() => {}))}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      role="menuitem"
                    >
                      <UserX className="w-4 h-4" />
                      Block User
                    </button>
                  )}

                  {/* Report */}
                  <button
                    onClick={() => handleMenuAction(onReport || (() => {}))}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    role="menuitem"
                  >
                    <Flag className="w-4 h-4" />
                    Report User
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Bar Overlay */}
      <AnimatePresence>
        {showSearchBar && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute inset-x-0 top-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 shadow-lg"
          >
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search in conversation..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#39B54A]/30 focus:outline-none transition-all"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
});

PremiumChatHeader.displayName = "PremiumChatHeader";

export default PremiumChatHeader;

