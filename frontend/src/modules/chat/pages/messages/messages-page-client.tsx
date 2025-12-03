// ============================================
// MESSAGES PAGE - Orchestrator
// Uses useMessagesPage hook + sub-components
// ============================================

"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  MoreVertical,
  Phone,
  Video,
  Info,
  X,
  ArrowLeft,
  Settings,
  Bell,
  BellOff,
  Ban,
  Loader2,
  Sparkles,
  Archive,
  Pin,
  Tag,
  Download,
} from "lucide-react";
import Link from "next/link";
import { ChatAccessBanner } from "@/modules/chat/components/premium/ChatAccessBanner";
import { useMessagesPage } from "./hooks/useMessagesPage";
import ConversationItem from "./components/ConversationItem";
import MessageBubble from "./components/MessageBubble";
import MessageInput from "./components/MessageInput";

// ============================================
// MESSAGES PAGE COMPONENT
// ============================================

export default function MessagesPageClient() {
  const {
    // Auth
    user,
    isAuthenticated,
    authLoading,

    // State
    conversations,
    selectedConversation,
    newMessage,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    searchQuery,
    showMobileChat,
    showDropdown,
    messageSearchQuery,
    labelFilter,
    showCannedResponses,
    showReactionPicker,
    uploadingImage,
    pinnedMessages,
    showPinnedMessages,
    showReportModal,
    reportReason,
    showExportModal,
    exportFormat,
    isExporting,
    chatAccessStatus,
    isLoadingAccess,

    // Setters
    setSearchQuery,
    setLabelFilter,
    setShowDropdown,
    setMessageSearchQuery,
    setShowCannedResponses,
    setShowReactionPicker,
    setShowPinnedMessages,
    setShowReportModal,
    setReportReason,
    setShowExportModal,
    setExportFormat,

    // Refs
    messagesEndRef,
    inputRef,
    fileInputRef,

    // Constants
    CHAT_LABELS,
    QUICK_REACTIONS,
    CANNED_RESPONSES,

    // Handlers
    handleSelectConversation,
    handleSendMessage,
    handleRetryMessage,
    handleRemoveFailedMessage,
    handlePayNow,
    handleContactSupport,
    handleViewBooking,
    handleKeyPress,
    handleBackToList,
    handleMessageChange,
    handleImageUpload,
    handleInsertCannedResponse,
    handleAddReaction,
    handleRemoveReaction,
    handleTogglePinMessage,
    handleBlockUser,
    handleUnblockUser,
    handleToggleMute,
    handleArchiveConversation,
    handleUnarchiveConversation,
    handleReportMessage,
    handleExportChat,
    executeExport,
    handleStartCall,

    // Derived
    filteredConversations,
    filteredMessages,
    typingInConversation,
    otherParticipant,
    isOtherOnline,
    onlineUsers,
    getOtherParticipant,
    formatMessageTime,
    formatConversationTime,
  } = useMessagesPage();

  // ── Auth loading state ─────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-gray-50 via-white to-[#39B54A]/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-[#39B54A] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading messages...</p>
        </motion.div>
      </div>
    );
  }

  // ── Not authenticated ──────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-gray-50 via-white to-[#39B54A]/5 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="relative inline-block mb-8">
            <div className="w-28 h-28 bg-linear-to-br from-[#39B54A]/10 via-[#39B54A]/5 to-[#39B54A]/10 rounded-3xl flex items-center justify-center">
              <MessageCircle className="w-14 h-14 text-[#39B54A]" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-2xl flex items-center justify-center shadow-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Sign in to view messages
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
            Connect with caregivers and manage your conversations securely
          </p>
          <Link
            href="/login?redirect=/messages"
            className="inline-flex items-center gap-2 px-8 py-4 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-[#39B54A]/20 hover:-translate-y-0.5 transition-all duration-200"
          >
            Sign In to Continue
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────
  return (
    <div className="h-screen bg-linear-to-br from-gray-50 via-white to-[#39B54A]/5">
      <div className="h-full max-w-[1600px] mx-auto flex gap-0">
        {/* ═══════════════════════════════════════════
            SIDEBAR — Conversations List
        ═══════════════════════════════════════════ */}
        <motion.aside
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`w-full md:w-[380px] lg:w-[420px] bg-white/80 backdrop-blur-xl border-r border-gray-200/60 flex flex-col ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Sidebar Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-[#39B54A] to-[#2d913c] bg-clip-text text-transparent">
                  Messages
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  {conversations.length} conversation
                  {conversations.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button className="p-2.5 text-gray-400 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-[#39B54A] transition-colors" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#39B54A]/30 focus:ring-4 focus:ring-[#39B54A]/5 focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Label Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CHAT_LABELS.map((label) => (
                <button
                  key={label.value}
                  onClick={() => setLabelFilter(label.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    labelFilter === label.value
                      ? `${label.bgColor} ${label.textColor} shadow-sm ring-2 ring-${
                          label.value === "all"
                            ? "gray"
                            : label.value === "inquiry"
                              ? "blue"
                              : label.value === "booked"
                                ? "green"
                                : label.value === "active"
                                  ? "green"
                                  : "gray"
                        }-200`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {label.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {isLoadingConversations ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-7 h-7 text-[#39B54A] animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full p-6 text-center"
              >
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-linear-to-br from-[#39B54A]/10 to-[#39B54A]/5 rounded-2xl flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-[#39B54A]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#39B54A] rounded-full flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {searchQuery ? "No results found" : "No conversations yet"}
                </h3>
                <p className="text-sm text-gray-500 mb-5 max-w-[280px]">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Book a caregiver to start your first conversation"}
                </p>
                {!searchQuery && (
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-[#39B54A]/20 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <Search className="w-4 h-4" />
                    Find Caregivers
                  </Link>
                )}
              </motion.div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {filteredConversations.map((conversation, index) => {
                    const other = getOtherParticipant(conversation);
                    const unreadCount =
                      conversation.unreadCount?.[user?._id || ""] || 0;
                    const isSelected =
                      selectedConversation?._id === conversation._id;
                    const isOnline = other
                      ? (onlineUsers?.has(other._id) ?? false)
                      : false;

                    return (
                      <ConversationItem
                        key={conversation._id}
                        conversation={conversation}
                        isSelected={isSelected}
                        other={other}
                        unreadCount={unreadCount}
                        isOnline={isOnline}
                        index={index}
                        onSelect={handleSelectConversation}
                        formatConversationTime={formatConversationTime}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.aside>

        {/* ═══════════════════════════════════════════
            MAIN CHAT AREA
        ═══════════════════════════════════════════ */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`flex-1 flex flex-col bg-white/40 backdrop-blur-sm ${
            showMobileChat ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConversation ? (
            <>
              {/* ────── Chat Header ────── */}
              <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="px-6 py-4 bg-white/90 backdrop-blur-xl border-b border-gray-200/60 flex items-center justify-between sticky top-0 z-20 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {/* Back button (mobile) */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-2 -ml-2 text-gray-600 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar & Info */}
                  <div className="relative">
                    <div
                      className={`w-11 h-11 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
                        isOtherOnline
                          ? "ring-2 ring-green-400 ring-offset-2"
                          : ""
                      }`}
                    >
                      {otherParticipant?.fullName?.charAt(0) || "?"}
                    </div>
                    {isOtherOnline && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"
                      />
                    )}
                  </div>

                  <div>
                    <h2 className="font-bold text-gray-900">
                      {otherParticipant?.fullName || "Unknown User"}
                    </h2>
                    <div className="flex items-center gap-2">
                      {typingInConversation.length > 0 ? (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-[#39B54A] font-medium flex items-center gap-1"
                        >
                          <span className="flex gap-0.5">
                            <span
                              className="w-1 h-1 bg-[#39B54A] rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="w-1 h-1 bg-[#39B54A] rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="w-1 h-1 bg-[#39B54A] rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </span>
                          Typing
                        </motion.p>
                      ) : (
                        <p
                          className={`text-xs font-medium ${
                            isOtherOnline ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {isOtherOnline ? (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                              Online
                            </span>
                          ) : (
                            "Offline"
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message Search */}
                {messageSearchQuery && (
                  <div className="flex-1 max-w-sm mx-4">
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search messages..."
                        value={messageSearchQuery}
                        onChange={(e) => setMessageSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:bg-white focus:border-[#39B54A]/30 focus:ring-2 focus:ring-[#39B54A]/5 focus:outline-none transition-all duration-200"
                      />
                      <button
                        onClick={() => setMessageSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Header Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setMessageSearchQuery(messageSearchQuery ? "" : " ")
                    }
                    className="p-2.5 text-gray-600 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200"
                    title="Search messages"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleStartCall("audio")}
                    disabled={!chatAccessStatus?.canSendMessages}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      chatAccessStatus?.canSendMessages
                        ? "text-gray-600 hover:text-[#39B54A] hover:bg-[#39B54A]/5"
                        : "text-gray-300 cursor-not-allowed"
                    }`}
                    title={
                      chatAccessStatus?.canSendMessages
                        ? "Start audio call"
                        : "Chat must be active to make calls"
                    }
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleStartCall("video")}
                    disabled={!chatAccessStatus?.canSendMessages}
                    className={`p-2.5 rounded-xl transition-all duration-200 ${
                      chatAccessStatus?.canSendMessages
                        ? "text-gray-600 hover:text-[#39B54A] hover:bg-[#39B54A]/5"
                        : "text-gray-300 cursor-not-allowed"
                    }`}
                    title={
                      chatAccessStatus?.canSendMessages
                        ? "Start video call"
                        : "Chat must be active to make calls"
                    }
                  >
                    <Video className="w-5 h-5" />
                  </button>

                  {/* Dropdown menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="p-2.5 text-gray-600 hover:text-[#39B54A] hover:bg-[#39B54A]/5 rounded-xl transition-all duration-200"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-30"
                        >
                          <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
                            <Info className="w-4 h-4 text-gray-400" />
                            View Profile
                          </button>
                          <button
                            onClick={() => {
                              setShowPinnedMessages(!showPinnedMessages);
                              setShowDropdown(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <Pin className="w-4 h-4 text-gray-400" />
                            {showPinnedMessages
                              ? "Hide Pinned"
                              : `Pinned Messages (${pinnedMessages.length})`}
                          </button>
                          <button
                            onClick={handleToggleMute}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            {selectedConversation?.mutedBy?.includes(
                              user?._id || "",
                            ) ? (
                              <>
                                <Bell className="w-4 h-4 text-gray-400" />
                                Unmute Notifications
                              </>
                            ) : (
                              <>
                                <BellOff className="w-4 h-4 text-gray-400" />
                                Mute Notifications
                              </>
                            )}
                          </button>
                          <button
                            onClick={
                              (
                                selectedConversation as typeof selectedConversation & {
                                  status?: string;
                                }
                              )?.status === "archived"
                                ? handleUnarchiveConversation
                                : handleArchiveConversation
                            }
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <Archive className="w-4 h-4 text-gray-400" />
                            {(
                              selectedConversation as typeof selectedConversation & {
                                status?: string;
                              }
                            )?.status === "archived"
                              ? "Restore Chat"
                              : "Archive Chat"}
                          </button>
                          <button
                            onClick={handleExportChat}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                          >
                            <Download className="w-4 h-4 text-gray-400" />
                            Export Chat
                          </button>
                          <div className="h-px bg-gray-100 my-2" />
                          <button
                            onClick={
                              (
                                selectedConversation as typeof selectedConversation & {
                                  isBlocked?: boolean;
                                }
                              )?.isBlocked
                                ? handleUnblockUser
                                : handleBlockUser
                            }
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                            {(
                              selectedConversation as typeof selectedConversation & {
                                isBlocked?: boolean;
                              }
                            )?.isBlocked
                              ? "Unblock User"
                              : "Block User"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.header>

              {/* ────── Chat Access Banner ────── */}
              {chatAccessStatus && !chatAccessStatus.canSendMessages && (
                <ChatAccessBanner
                  accessStatus={chatAccessStatus}
                  onPayNow={handlePayNow}
                  onContactSupport={handleContactSupport}
                  onViewBooking={handleViewBooking}
                  isLoading={isLoadingAccess}
                />
              )}

              {/* ────── Pinned Messages Panel ────── */}
              <AnimatePresence>
                {showPinnedMessages && pinnedMessages.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-amber-50 border-b border-amber-200 overflow-hidden"
                  >
                    <div className="px-6 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                          <Pin className="w-4 h-4" /> Pinned Messages (
                          {pinnedMessages.length})
                        </h4>
                        <button
                          onClick={() => setShowPinnedMessages(false)}
                          className="p-1 text-amber-600 hover:text-amber-800 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {pinnedMessages.map((pm) => (
                          <div
                            key={pm._id}
                            className="flex items-start gap-2 text-sm bg-white/70 px-3 py-2 rounded-lg"
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-medium text-amber-900">
                                {pm.senderId?.fullName || "Unknown"}:{" "}
                              </span>
                              <span className="text-amber-800 truncate">
                                {pm.content}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ────── Report Message Modal ────── */}
              <AnimatePresence>
                {showReportModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => {
                      setShowReportModal(null);
                      setReportReason("");
                    }}
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
                    >
                      <h3 className="text-lg font-bold text-gray-900 mb-3">
                        Report Message
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Please provide a reason for reporting this message.
                      </p>
                      <textarea
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="Describe why you are reporting this message..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:border-[#39B54A]/30 focus:ring-2 focus:ring-[#39B54A]/5 focus:outline-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => {
                            setShowReportModal(null);
                            setReportReason("");
                          }}
                          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() =>
                            showReportModal &&
                            handleReportMessage(showReportModal)
                          }
                          disabled={!reportReason.trim()}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Report
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ────── Messages Area ────── */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-linear-to-b from-transparent to-gray-50/50">
                {isLoadingMessages ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#39B54A] animate-spin" />
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-linear-to-br from-[#39B54A]/10 to-[#39B54A]/5 rounded-3xl flex items-center justify-center">
                        <MessageCircle className="w-12 h-12 text-[#39B54A]" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-10 h-10 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-full flex items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Start the conversation
                    </h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                      Send a message to begin your chat with{" "}
                      {otherParticipant?.fullName}
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredMessages.map((message, index) => {
                      const isOwn = message.senderId._id === user?._id;
                      const showAvatar =
                        index === 0 ||
                        filteredMessages[index - 1]?.senderId._id !==
                          message.senderId._id;

                      return (
                        <MessageBubble
                          key={message._id}
                          message={message}
                          isOwn={isOwn}
                          showAvatar={showAvatar}
                          otherParticipant={otherParticipant}
                          messageSearchQuery={messageSearchQuery}
                          showReactionPicker={showReactionPicker}
                          onToggleReactionPicker={setShowReactionPicker}
                          onReact={handleAddReaction}
                          onRemoveReaction={handleRemoveReaction}
                          onPin={handleTogglePinMessage}
                          onReport={setShowReportModal}
                          onRetry={handleRetryMessage}
                          onRemoveFailed={handleRemoveFailedMessage}
                          currentUserId={user?._id}
                          quickReactions={QUICK_REACTIONS}
                          formatMessageTime={formatMessageTime}
                        />
                      );
                    })}
                  </AnimatePresence>
                )}

                {/* Typing Indicator */}
                <AnimatePresence>
                  {typingInConversation.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-end gap-2.5"
                    >
                      <div className="w-9 h-9 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {otherParticipant?.fullName?.charAt(0) || "?"}
                      </div>
                      <div className="bg-white border border-gray-200 px-5 py-3.5 rounded-2xl rounded-bl-md shadow-sm">
                        <div className="flex gap-1">
                          <motion.span
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0,
                            }}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                          />
                          <motion.span
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0.15,
                            }}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                          />
                          <motion.span
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.6,
                              delay: 0.3,
                            }}
                            className="w-2 h-2 bg-gray-400 rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* ────── Message Input ────── */}
              <MessageInput
                newMessage={newMessage}
                onMessageChange={handleMessageChange}
                isSending={isSending}
                onSendMessage={handleSendMessage}
                onKeyPress={handleKeyPress}
                onImageUpload={handleImageUpload}
                showCannedResponses={showCannedResponses}
                setShowCannedResponses={setShowCannedResponses}
                cannedResponses={CANNED_RESPONSES}
                onInsertCanned={handleInsertCannedResponse}
                inputRef={inputRef}
                fileInputRef={fileInputRef}
                chatAccessStatus={chatAccessStatus}
                uploadingImage={uploadingImage}
              />
            </>
          ) : (
            /* ────── No Conversation Selected ────── */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-linear-to-br from-[#39B54A]/10 via-[#39B54A]/5 to-[#39B54A]/10 rounded-[2.5rem] flex items-center justify-center">
                  <MessageCircle className="w-16 h-16 text-[#39B54A]" />
                </div>
                <motion.div
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="absolute -top-3 -right-3 w-14 h-14 bg-linear-to-br from-[#39B54A] to-[#2d913c] rounded-2xl flex items-center justify-center shadow-xl"
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </motion.div>
              </div>

              <h2 className="text-3xl font-bold bg-linear-to-r from-[#39B54A] to-[#2d913c] bg-clip-text text-transparent mb-3">
                Welcome to Messages
              </h2>
              <p className="text-gray-500 max-w-md mb-8 text-lg">
                Select a conversation from the list to start chatting, or book a
                caregiver to begin a new conversation.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/search"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-linear-to-r from-[#39B54A] to-[#2d913c] text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-[#39B54A]/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Search className="w-5 h-5" />
                  Find Caregivers
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-[#39B54A]/20 hover:bg-[#39B54A]/5 hover:-translate-y-0.5 transition-all duration-200"
                >
                  View Bookings
                </Link>
              </div>
            </motion.div>
          )}
        </motion.main>
      </div>

      {/* ── Export Chat Modal ── */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Export Chat
              </h3>
              <p className="text-gray-600 mb-6">
                Choose the format for your chat export:
              </p>

              <div className="space-y-3 mb-6">
                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    exportFormat === "txt"
                      ? "border-[#39B54A] bg-[#39B54A]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="txt"
                    checked={exportFormat === "txt"}
                    onChange={() => setExportFormat("txt")}
                    className="w-4 h-4 text-[#39B54A] focus:ring-[#39B54A]"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      Text Format (.txt)
                    </div>
                    <div className="text-sm text-gray-500">
                      Human-readable plain text file
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    exportFormat === "json"
                      ? "border-[#39B54A] bg-[#39B54A]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === "json"}
                    onChange={() => setExportFormat("json")}
                    className="w-4 h-4 text-[#39B54A] focus:ring-[#39B54A]"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      JSON Format (.json)
                    </div>
                    <div className="text-sm text-gray-500">
                      Structured data for backup or import
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeExport}
                  disabled={isExporting}
                  className="flex-1 px-4 py-3 bg-[#39B54A] text-white rounded-xl font-semibold hover:bg-[#2d913c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
