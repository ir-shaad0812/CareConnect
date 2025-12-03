"use client";

// ============================================
// useMessagesPage — Custom hook
// Encapsulates ALL state, effects, and callbacks
// for the Messages page.  The component tree is
// purely presentational and just consumes what
// this hook returns.
// ============================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import { useAuthContext } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  chatService,
  type Conversation,
  type Message,
  type ChatAccessStatus,
  type OptimisticMessage,
} from "@/modules/chat/services";
import { useVideoCall } from "@/modules/chat/components/video/VideoCallProvider";

// ── Module-level constants (exported so components can import
//    directly without going through the hook return value) ──
export const CHAT_LABELS = [
  {
    value: "all",
    label: "All",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
  {
    value: "inquiry",
    label: "Inquiry",
    color: "blue",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
  },
  {
    value: "booked",
    label: "Booked",
    color: "green",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
  },
  {
    value: "active",
    label: "Active",
    color: "green",
    bgColor: "bg-[#39B54A]/10",
    textColor: "text-[#2d913c]",
  },
  {
    value: "completed",
    label: "Completed",
    color: "gray",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
  },
] as const;

export const QUICK_REACTIONS = ["👍", "❤️", "😊", "👏", "🙏", "🎉"] as const;

export const CANNED_RESPONSES = [
  "Thank you for your inquiry! I'd be happy to help.",
  "I'm available during the times you mentioned.",
  "Could you please provide more details about your needs?",
  "I have experience with similar care requirements.",
  "Let me know if you have any questions!",
  "Looking forward to working with you.",
] as const;

// ── Hook ──────────────────────────────────────────────────────
export function useMessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get("conversation");

  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage: socketSendMessage,
    subscribeChatStatus,
    startTyping,
    stopTyping,
    checkOnlineStatus,
    onlineUsers,
    typingUsers,
    onNewMessage,
    onMessagesRead,
    onMessageFailed,
    onChatStatusChange,
  } = useSocket();
  const { startCall: startVideoCall } = useVideoCall();

  // ── Core chat state ─────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Feature states ─────────────────────────────────────────
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(
    null
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  // ── Export states ───────────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"txt" | "json">("txt");
  const [isExporting, setIsExporting] = useState(false);

  // ── Chat access control ────────────────────────────────────
  const [chatAccessStatus, setChatAccessStatus] =
    useState<ChatAccessStatus | null>(null);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);

  // ── Message search state ───────────────────────────────────
  const [searchedMessages, setSearchedMessages] = useState<Message[] | null>(
    null
  );

  // ── Refs ───────────────────────────────────────────────────
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Utility helpers ────────────────────────────────────────
  const formatMessageTime = useCallback((date: string): string => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
    return format(d, "MMM d, h:mm a");
  }, []);

  const formatConversationTime = useCallback((date: string): string => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d");
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const getOtherParticipant = useCallback(
    (conversation: Conversation) => {
      if (!user) return null;
      return (
        conversation.participants?.find((p) => p._id !== user._id) ?? null
      );
    },
    [user]
  );

  const markTempMessageFailed = useCallback((tempId?: string) => {
    if (!tempId) return;
    setOptimisticMessages((prev) =>
      prev.map((m) =>
        m.tempId === tempId ? { ...m, status: "failed" as const } : m
      )
    );
  }, []);

  const scheduleOptimisticTimeout = useCallback((tempId: string) => {
    window.setTimeout(() => {
      setOptimisticMessages((prev) =>
        prev.map((m) => {
          if (m.tempId !== tempId || m.status !== "sending") return m;

          const createdAtMs = new Date(m.createdAt).getTime();
          if (!Number.isFinite(createdAtMs)) {
            return { ...m, status: "failed" as const };
          }

          if (Date.now() - createdAtMs >= 15000) {
            return { ...m, status: "failed" as const };
          }

          return m;
        })
      );
    }, 15000);
  }, []);

  const syncConversationWithMessage = useCallback(
    (message: Message) => {
      setConversations((prev) =>
        prev
          .map((c) => {
            if (c._id !== message.conversationId) return c;

            const isOwnMessage = message.senderId?._id === user?._id;
            return {
              ...c,
              lastMessage: {
                content: message.content,
                senderId: message.senderId._id,
                messageType: message.messageType,
                createdAt: message.createdAt,
              },
              unreadCount:
                selectedConversation?._id !== message.conversationId &&
                !isOwnMessage
                  ? {
                      ...c.unreadCount,
                      [user?._id || ""]:
                        (c.unreadCount?.[user?._id || ""] || 0) + 1,
                    }
                  : c.unreadCount,
              updatedAt: message.createdAt,
            };
          })
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
      );
    },
    [selectedConversation?._id, user?._id]
  );

  const upsertServerMessage = useCallback(
    (serverMessage: Message, tempId?: string) => {
      if (tempId) {
        setOptimisticMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      }

      setMessages((prev) => {
        if (prev.some((m) => m._id === serverMessage._id)) return prev;
        return [...prev, serverMessage];
      });

      syncConversationWithMessage(serverMessage);
      scrollToBottom();
    },
    [syncConversationWithMessage, scrollToBottom]
  );

  // ── API loaders ────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const response = await chatService.getConversations();
      if (response.success && response.data) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      const msg =
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : String(error);
      console.error("Failed to load conversations:", msg);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      const response = await chatService.getMessages(conversationId, {
        page: 1,
        limit: 50,
      });
      if (response.success && response.data) {
        setMessages(response.data.messages?.reverse() || []);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const loadChatAccessStatus = useCallback(async (conversationId: string) => {
    try {
      setIsLoadingAccess(true);
      const response = await chatService.getChatAccessStatus(conversationId);
      if (response.success && response.data?.accessStatus) {
        setChatAccessStatus(response.data.accessStatus);
      }
    } catch (error) {
      console.error("Failed to load chat access status:", error);
      setChatAccessStatus(null);
    } finally {
      setIsLoadingAccess(false);
    }
  }, []);

  // Defined before handleSelectConversation so it can be safely
  // referenced in that callback's closure.
  const loadPinnedMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await chatService.getPinnedMessages(conversationId);
      if (response.success) {
        setPinnedMessages(response.data?.messages || []);
      }
    } catch {
      setPinnedMessages([]);
    }
  }, []);

  // ── Conversation selection ─────────────────────────────────
  const handleSelectConversation = useCallback(
    async (conversation: Conversation) => {
      if (selectedConversation) {
        leaveConversation(selectedConversation._id);
      }

      setSelectedConversation(conversation);
      setShowMobileChat(true);
      setMessages([]);
      setOptimisticMessages([]);
      setChatAccessStatus(null);

      router.push(`/messages?conversation=${conversation._id}`, {
        scroll: false,
      });

      joinConversation(conversation._id);
      subscribeChatStatus(conversation._id);

      await Promise.all([
        loadMessages(conversation._id),
        loadChatAccessStatus(conversation._id),
      ]);

      await loadPinnedMessages(conversation._id);

      try {
        await chatService.markAsRead(conversation._id);
        setConversations((prev) =>
          prev.map((c) =>
            c._id === conversation._id
              ? {
                  ...c,
                  unreadCount: {
                    ...c.unreadCount,
                    [user?._id || ""]: 0,
                  },
                }
              : c
          )
        );
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    },
    [
      selectedConversation,
      leaveConversation,
      subscribeChatStatus,
      joinConversation,
      loadMessages,
      loadChatAccessStatus,
      loadPinnedMessages,
      router,
      user?._id,
    ]
  );

  // ── Message send / retry / remove ─────────────────────────
  const handleSendMessage = useCallback(async () => {
    if (!selectedConversation || !newMessage.trim() || isSending) return;

    if (chatAccessStatus && !chatAccessStatus.canSendMessages) {
      console.warn("Cannot send message: Chat access restricted");
      return;
    }

    const messageContent = newMessage.trim();
    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const optimisticMessage: OptimisticMessage = {
      _id: tempId,
      tempId,
      conversationId: selectedConversation._id,
      senderId: {
        _id: user?._id || "",
        fullName: user?.fullName || "You",
        ...(user?.avatar ? { avatar: user.avatar } : {}),
      },
      content: messageContent,
      messageType: "text",
      status: "sending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setIsSending(true);
    scrollToBottom();

    try {
      if (socket?.connected && isConnected) {
        scheduleOptimisticTimeout(tempId);
        socketSendMessage(
          selectedConversation._id,
          messageContent,
          "text",
          [],
          tempId
        );
        return;
      }

      const response = await chatService.sendMessage(selectedConversation._id, {
        content: messageContent,
        messageType: "text",
      });

      if (response.success && response.data?.message) {
        upsertServerMessage(response.data.message, tempId);
      } else {
        throw new Error(response.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      markTempMessageFailed(tempId);
    } finally {
      setIsSending(false);
    }
  }, [
    selectedConversation,
    newMessage,
    isSending,
    chatAccessStatus,
    user,
    socket,
    isConnected,
    socketSendMessage,
    scrollToBottom,
    upsertServerMessage,
    markTempMessageFailed,
    scheduleOptimisticTimeout,
  ]);

  const handleRetryMessage = useCallback(
    async (tempId: string) => {
      const failedMessage = optimisticMessages.find(
        (m) => m.tempId === tempId
      );
      if (!failedMessage || !selectedConversation) return;

      setOptimisticMessages((prev) =>
        prev.map((m) =>
          m.tempId === tempId ? { ...m, status: "sending" as const } : m
        )
      );

      const normalizedType =
        failedMessage.messageType === "system"
          ? "text"
          : failedMessage.messageType;

      try {
        if (socket?.connected && isConnected) {
          scheduleOptimisticTimeout(tempId);
          socketSendMessage(
            selectedConversation._id,
            failedMessage.content,
            normalizedType,
            failedMessage.attachments || [],
            tempId
          );
          return;
        }

        const response = await chatService.sendMessage(selectedConversation._id, {
          content: failedMessage.content,
          messageType: normalizedType,
          ...(failedMessage.attachments
            ? { attachments: failedMessage.attachments }
            : {}),
        });

        if (response.success && response.data?.message) {
          upsertServerMessage(response.data.message, tempId);
        } else {
          throw new Error(response.message || "Failed to retry message");
        }
      } catch (error) {
        console.error("Failed to retry message:", error);
        markTempMessageFailed(tempId);
      }
    },
    [
      optimisticMessages,
      selectedConversation,
      socket,
      isConnected,
      socketSendMessage,
      upsertServerMessage,
      markTempMessageFailed,
      scheduleOptimisticTimeout,
    ]
  );

  const handleRemoveFailedMessage = useCallback((tempId: string) => {
    setOptimisticMessages((prev) => prev.filter((m) => m.tempId !== tempId));
  }, []);

  // ── Chat access handlers ───────────────────────────────────
  const handlePayNow = useCallback(() => {
    if (chatAccessStatus?.booking?.bookingId) {
      router.push(
        `/booking/${chatAccessStatus.booking.bookingId}/payment`
      );
    }
  }, [chatAccessStatus, router]);

  const handleContactSupport = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      (window as { Tawk_API?: { toggle?: () => void } }).Tawk_API?.toggle
    ) {
      (
        window as { Tawk_API?: { toggle?: () => void } }
      ).Tawk_API?.toggle?.();
    } else {
      router.push("/support");
    }
  }, [router]);

  const handleViewBooking = useCallback(() => {
    if (chatAccessStatus?.booking?.bookingId) {
      router.push(
        `/dashboard/bookings/${chatAccessStatus.booking.bookingId}`
      );
    }
  }, [chatAccessStatus, router]);

  // ── Input handlers ─────────────────────────────────────────
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  /** Combined handler: updates newMessage + fires typing events */
  const handleMessageChange = useCallback(
    (value: string) => {
      setNewMessage(value);
      if (!selectedConversation) return;
      if (value) {
        startTyping(selectedConversation._id);
      } else {
        stopTyping(selectedConversation._id);
      }
    },
    [selectedConversation, startTyping, stopTyping]
  );

  const handleBackToList = useCallback(() => {
    setShowMobileChat(false);
    if (selectedConversation) {
      leaveConversation(selectedConversation._id);
    }
    setSelectedConversation(null);
    router.push("/messages", { scroll: false });
  }, [selectedConversation, leaveConversation, router]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedConversation) return;

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Please upload a valid image file (JPEG, PNG, GIF, WebP)");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      let tempId: string | undefined;
      setUploadingImage(true);
      try {
        const uploadResult = await chatService.uploadAttachment(file);

        if (uploadResult?.data?.url || uploadResult?.url) {
          const fileUrl = uploadResult?.data?.url || uploadResult?.url;
          tempId = `temp_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 11)}`;
          const attachment: {
            type: "image";
            url: string;
            name: string;
            size: number;
            mimeType: string;
          } = {
            type: "image",
            url: String(fileUrl),
            name: file.name,
            size: file.size,
            mimeType: file.type,
          };

          const optimisticImage: OptimisticMessage = {
            _id: tempId,
            tempId,
            conversationId: selectedConversation._id,
            senderId: {
              _id: user?._id || "",
              fullName: user?.fullName || "You",
              ...(user?.avatar ? { avatar: user.avatar } : {}),
            },
            content: file.name,
            messageType: "image",
            attachments: [attachment],
            status: "sending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setOptimisticMessages((prev) => [...prev, optimisticImage]);
          scrollToBottom();
          if (socket?.connected && isConnected) {
            scheduleOptimisticTimeout(tempId);
            socketSendMessage(
              selectedConversation._id,
              file.name,
              "image",
              [attachment],
              tempId
            );
          } else {
            const response = await chatService.sendMessage(selectedConversation._id, {
              content: file.name,
              messageType: "image",
              attachments: [attachment],
            });

            if (response.success && response.data?.message) {
              upsertServerMessage(response.data.message, tempId);
            } else {
              throw new Error(response.message || "Failed to send image message");
            }
          }
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
        if (tempId) {
          markTempMessageFailed(tempId);
        } else {
          alert("Failed to upload image. Please try again.");
        }
      } finally {
        setUploadingImage(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [
      selectedConversation,
      user,
      socket,
      isConnected,
      socketSendMessage,
      scrollToBottom,
      upsertServerMessage,
      markTempMessageFailed,
      scheduleOptimisticTimeout,
    ]
  );

  const handleInsertCannedResponse = useCallback((text: string) => {
    setNewMessage((prev) => (prev ? `${prev}\n${text}` : text));
    setShowCannedResponses(false);
    inputRef.current?.focus();
  }, []);

  // ── Reaction handlers ──────────────────────────────────────
  const handleAddReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const response = await chatService.addReaction(messageId, emoji);
        if (response.success && response.data?.message) {
          const updatedReactions = response.data.message.reactions || [];
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === messageId
                ? { ...msg, reactions: updatedReactions }
                : msg
            )
          );
        }
      } catch (error) {
        console.error("Failed to add reaction:", error);
      }
      setShowReactionPicker(null);
    },
    []
  );

  const handleRemoveReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await chatService.removeReaction(messageId, emoji);
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  reactions: (msg.reactions || []).filter(
                    (r) =>
                      !(r.emoji === emoji && r.userId === user?._id)
                  ),
                }
              : msg
          )
        );
      } catch (error) {
        console.error("Failed to remove reaction:", error);
      }
    },
    [user?._id]
  );

  // ── Pin handler ────────────────────────────────────────────
  const handleTogglePinMessage = useCallback(
    async (messageId: string) => {
      try {
        const response = await chatService.togglePinMessage(messageId);
        if (response.success && response.data?.message) {
          const updatedPinned = response.data.message.pinned;
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg._id !== messageId) return msg;
              if (updatedPinned) return { ...msg, pinned: updatedPinned };
              const rest = { ...msg };
              delete rest.pinned;
              return rest;
            })
          );
          if (selectedConversation) {
            const pinnedRes = await chatService.getPinnedMessages(
              selectedConversation._id
            );
            if (pinnedRes.success) {
              setPinnedMessages(pinnedRes.data?.messages || []);
            }
          }
        }
      } catch (error) {
        console.error("Failed to toggle pin:", error);
      }
    },
    [selectedConversation]
  );

  // ── Block / unblock / mute / archive / unarchive ───────────
  const handleBlockUser = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await chatService.blockUser(selectedConversation._id, "Blocked by user");
      setSelectedConversation((prev) =>
        prev
          ? {
              ...prev,
              isBlocked: true,
              ...(user?._id ? { blockedBy: user._id } : {}),
            }
          : null
      );
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to block user:", error);
    }
  }, [selectedConversation, user?._id]);

  const handleUnblockUser = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await chatService.unblockUser(selectedConversation._id);
      setSelectedConversation((prev) => {
        if (!prev) return null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { blockedBy, ...rest } = prev as Conversation & {
          blockedBy?: string;
        };
        return { ...rest, isBlocked: false };
      });
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to unblock user:", error);
    }
  }, [selectedConversation]);

  const handleToggleMute = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await chatService.toggleMuteConversation(selectedConversation._id);
      const isMuted = selectedConversation.mutedBy?.includes(
        user?._id || ""
      );
      setSelectedConversation((prev) => {
        if (!prev) return null;
        const mutedBy = prev.mutedBy || [];
        return {
          ...prev,
          mutedBy: isMuted
            ? mutedBy.filter((id) => id !== user?._id)
            : [...mutedBy, user?._id || ""],
        };
      });
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  }, [selectedConversation, user?._id]);

  const handleArchiveConversation = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await chatService.archiveConversation(selectedConversation._id);
      setConversations((prev) =>
        prev.filter((c) => c._id !== selectedConversation._id)
      );
      setSelectedConversation(null);
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to archive conversation:", error);
    }
  }, [selectedConversation]);

  const handleUnarchiveConversation = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      const response = (await chatService.unarchiveConversation(
        selectedConversation._id
      )) as {
        success: boolean;
        data?: { conversation?: Conversation };
      };
      if (response.success && response.data?.conversation) {
        const conv = response.data.conversation;
        setSelectedConversation(conv);
        setConversations((prev) =>
          prev.map((c) => (c._id === selectedConversation._id ? conv : c))
        );
      }
      setShowDropdown(false);
    } catch (error) {
      console.error("Failed to unarchive conversation:", error);
    }
  }, [selectedConversation]);

  // ── Report handler ─────────────────────────────────────────
  const handleReportMessage = useCallback(
    async (messageId: string) => {
      if (!reportReason.trim()) return;
      try {
        await chatService.reportMessage(messageId, reportReason);
        setShowReportModal(null);
        setReportReason("");
        alert("Message reported successfully. Our team will review it.");
      } catch (error) {
        console.error("Failed to report message:", error);
      }
    },
    [reportReason]
  );

  // ── Export handlers ────────────────────────────────────────
  const handleExportChat = useCallback(async () => {
    if (!selectedConversation) return;
    setShowExportModal(true);
  }, [selectedConversation]);

  const executeExport = useCallback(async () => {
    if (!selectedConversation) return;

    setIsExporting(true);
    try {
      await chatService.downloadChatExport(
        selectedConversation._id,
        exportFormat
      );
      setShowExportModal(false);
    } catch (error) {
      console.error("Export failed:", error);
      // Fallback: client-side export
      const exportOther = selectedConversation.participants.find(
        (p) => p._id !== user?._id
      );
      const conversationName = exportOther?.fullName || "Chat";

      if (exportFormat === "json") {
        const exportData = {
          conversationId: selectedConversation._id,
          exportedAt: new Date().toISOString(),
          participants: selectedConversation.participants.map((p) => ({
            id: p._id,
            name: p.fullName,
          })),
          messageCount: messages.length,
          messages: messages.map((m) => ({
            id: m._id,
            sender: m.senderId.fullName,
            content: m.content,
            timestamp: m.createdAt,
          })),
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_${conversationName.replace(/\s+/g, "_")}_${format(
          new Date(),
          "yyyy-MM-dd"
        )}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        let chatText = `CareConnect Chat Export\n`;
        chatText += `Conversation: ${conversationName}\n`;
        chatText += `Exported: ${format(new Date(), "PPpp")}\n`;
        chatText += `Total Messages: ${messages.length}\n`;
        chatText += `${"=".repeat(50)}\n\n`;

        messages.forEach((msg) => {
          const senderName =
            msg.senderId._id === user?._id ? "You" : msg.senderId.fullName;
          const timestamp = format(new Date(msg.createdAt), "PPp");
          chatText += `[${timestamp}] ${senderName}:\n${msg.content}\n\n`;
        });

        const blob = new Blob([chatText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chat_${conversationName.replace(/\s+/g, "_")}_${format(
          new Date(),
          "yyyy-MM-dd"
        )}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
  }, [selectedConversation, exportFormat, messages, user?._id]);

  // ── Video / audio call handlers ────────────────────────────
  const handleStartCall = useCallback(
    async (type: "audio" | "video") => {
      if (!selectedConversation) return;

      if (!chatAccessStatus?.canSendMessages) {
        alert(
          "Chat must be active to make calls. Please complete payment or contact support."
        );
        return;
      }

      const recipient = getOtherParticipant(selectedConversation);
      if (!recipient) {
        alert("Unable to determine who to call in this conversation.");
        return;
      }

      try {
        await startVideoCall(
          selectedConversation._id,
          recipient._id,
          recipient.fullName,
          type
        );
      } catch (error: unknown) {
        console.error("Failed to start call:", error);
        const msg =
          error instanceof Error
            ? error.message
            : (error as { message?: string } | null)?.message;
        alert(
          msg ||
            `Failed to start ${type} call. Video calling may not be configured.`
        );
      }
    },
    [selectedConversation, chatAccessStatus, getOtherParticipant, startVideoCall]
  );

  // ── Socket effects ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: unknown) => {
      const typedPayload = payload as
        | Message
        | { message: Message; tempId?: string };
      const message =
        (typedPayload as { message?: Message }).message ||
        (typedPayload as Message);
      const tempId = (typedPayload as { tempId?: string }).tempId;

      if (
        selectedConversation &&
        message.conversationId === selectedConversation._id
      ) {
        upsertServerMessage(message, tempId);
        return;
      }

      syncConversationWithMessage(message);
    };

    const handleMessagesRead = (payload: unknown) => {
      const data = payload as {
        conversationId: string;
        userId: string;
        readAt?: string;
      };
      if (
        !selectedConversation ||
        data.conversationId !== selectedConversation._id
      )
        return;

      setMessages((prev) =>
        prev.map((msg) => {
          const isOwnOutgoing = msg.senderId?._id === user?._id;
          if (!isOwnOutgoing || msg.messageType === "system") return msg;
          return {
            ...msg,
            status: "read",
            readAt: data.readAt || new Date().toISOString(),
          };
        })
      );
    };

    const handleMessageDelivered = (payload: unknown) => {
      const data = payload as { conversationId: string; userId: string };
      if (
        !selectedConversation ||
        data.conversationId !== selectedConversation._id
      )
        return;

      setMessages((prev) =>
        prev.map((msg) => {
          const isOwnOutgoing = msg.senderId?._id === user?._id;
          if (!isOwnOutgoing || msg.messageType === "system") return msg;
          if (msg.status === "read") return msg;
          return {
            ...msg,
            status: "delivered",
            deliveredAt: new Date().toISOString(),
          };
        })
      );
    };

    const handleMessageFailedSocket = (payload: unknown) => {
      const data = payload as {
        tempId?: string;
        conversationId?: string;
        errorCode?: string;
      };
      markTempMessageFailed(data.tempId);

      if (
        selectedConversation &&
        data.conversationId === selectedConversation._id &&
        ["CHAT_LOCKED", "CHAT_RESTRICTED", "CHAT_CLOSED"].includes(
          data.errorCode || ""
        )
      ) {
        loadChatAccessStatus(selectedConversation._id);
      }
    };

    const handleChatStatusChangeSocket = (payload: unknown) => {
      const data = payload as { conversationId: string };
      if (
        selectedConversation &&
        data.conversationId === selectedConversation._id
      ) {
        loadChatAccessStatus(selectedConversation._id);
      }
      loadConversations();
    };

    const handleReactionUpdate = (data: {
      messageId: string;
      reactions: Message["reactions"];
    }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== data.messageId) return msg;
          if (data.reactions) return { ...msg, reactions: data.reactions };
          const rest = { ...msg };
          delete rest.reactions;
          return rest;
        })
      );
    };

    const handlePinUpdate = (data: {
      messageId: string;
      pinned: Message["pinned"];
    }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== data.messageId) return msg;
          if (data.pinned) return { ...msg, pinned: data.pinned };
          const rest = { ...msg };
          delete rest.pinned;
          return rest;
        })
      );
    };

    const offNewMessage = onNewMessage(handleNewMessage);
    const offMessagesRead = onMessagesRead(handleMessagesRead);
    const offMessageFailed = onMessageFailed(handleMessageFailedSocket);
    const offChatStatusChange = onChatStatusChange(
      handleChatStatusChangeSocket
    );

    socket.on("message_delivered", handleMessageDelivered);
    socket.on("reaction_updated", handleReactionUpdate);
    socket.on("message_pinned", handlePinUpdate);

    return () => {
      offNewMessage();
      offMessagesRead();
      offMessageFailed();
      offChatStatusChange();
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("reaction_updated", handleReactionUpdate);
      socket.off("message_pinned", handlePinUpdate);
    };
  }, [
    socket,
    selectedConversation,
    user?._id,
    scrollToBottom,
    loadChatAccessStatus,
    loadConversations,
    onNewMessage,
    onMessagesRead,
    onMessageFailed,
    onChatStatusChange,
    upsertServerMessage,
    markTempMessageFailed,
    syncConversationWithMessage,
  ]);

  // Fetch a snapshot of online statuses once conversations are loaded.
  useEffect(() => {
    if (!isConnected || !user?._id) return;

    const userIds = new Set<string>();

    conversations.forEach((conversation) => {
      conversation.participants?.forEach((participant) => {
        if (participant._id && participant._id !== user._id) {
          userIds.add(participant._id);
        }
      });
    });

    if (selectedConversation) {
      selectedConversation.participants?.forEach((participant) => {
        if (participant._id && participant._id !== user._id) {
          userIds.add(participant._id);
        }
      });
    }

    if (userIds.size > 0) {
      checkOnlineStatus(Array.from(userIds));
    }
  }, [isConnected, conversations, selectedConversation, user?._id, checkOnlineStatus]);

  // Refresh access status while conversation is open so booking window expiry
  // automatically flips UI to read-only without requiring a manual refresh.
  useEffect(() => {
    if (!selectedConversation?._id) return;

    const refreshAccessStatus = () => {
      loadChatAccessStatus(selectedConversation._id);
    };

    const intervalId = window.setInterval(refreshAccessStatus, 20000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAccessStatus();
      }
    };

    window.addEventListener("focus", refreshAccessStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshAccessStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedConversation?._id, loadChatAccessStatus]);

  // Load conversations on mount / after auth resolves
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      loadConversations();
    }
  }, [isAuthenticated, authLoading, loadConversations]);

  // Auto-select conversation from URL param
  useEffect(() => {
    if (
      !conversationIdParam ||
      selectedConversation ||
      isLoadingConversations
    )
      return;

    const selectConversationFromParam = async () => {
      const existing = conversations.find(
        (c) => c._id === conversationIdParam
      );
      if (existing) {
        handleSelectConversation(existing);
        return;
      }

      if (conversations.length > 0) {
        try {
          const response = await chatService.getConversationById(
            conversationIdParam
          );
          if (response.success && response.data?.conversation) {
            const newConv = response.data.conversation;
            setConversations((prev) => {
              const exists = prev.some((c) => c._id === newConv._id);
              if (exists) return prev;
              return [newConv, ...prev];
            });
            handleSelectConversation(newConv);
          }
        } catch (error) {
          console.error("Failed to fetch conversation:", error);
        }
      }
    };

    selectConversationFromParam();
  }, [
    conversationIdParam,
    conversations,
    selectedConversation,
    isLoadingConversations,
    handleSelectConversation,
  ]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Debounced message search via backend
  useEffect(() => {
    if (!messageSearchQuery.trim() || !selectedConversation) {
      setSearchedMessages(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await chatService.searchMessages(
          selectedConversation._id,
          messageSearchQuery.trim()
        );
        if (response.success) {
          setSearchedMessages(response.data?.messages || []);
        }
      } catch {
        setSearchedMessages(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [messageSearchQuery, selectedConversation]);

  // ── Derived values ─────────────────────────────────────────
  const filteredConversations = conversations.filter((conv) => {
    if (searchQuery) {
      const other = getOtherParticipant(conv);
      if (
        !other?.fullName
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
        return false;
    }
    if (labelFilter !== "all") {
      if ((conv as Conversation & { label?: string }).label !== labelFilter)
        return false;
    }
    return true;
  });

  const baseMessages =
    searchedMessages !== null ? searchedMessages : messages;
  const filteredMessages = [
    ...baseMessages,
    ...optimisticMessages,
  ] as (Message | OptimisticMessage)[];

  const typingInConversation = selectedConversation
    ? (typingUsers?.filter(
        (t) =>
          t.conversationId === selectedConversation._id &&
          t.userId !== user?._id
      ) ?? [])
    : [];

  const otherParticipant = selectedConversation
    ? getOtherParticipant(selectedConversation)
    : null;

  const isOtherOnline = otherParticipant
    ? (onlineUsers?.has(otherParticipant._id) ?? false)
    : false;

  // ── Return everything the UI needs ────────────────────────
  return {
    // ── Auth (kept here so MessagesPageClient can use for guards) ──
    user,
    isAuthenticated,
    authLoading,

    // ── State values ──────────────────────────────────────────
    conversations,
    selectedConversation,
    messages,
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
    optimisticMessages,

    // ── Setters exposed for UI-only changes ───────────────────
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

    // ── Refs ──────────────────────────────────────────────────
    messagesEndRef,
    inputRef,
    fileInputRef,

    // ── Constants ─────────────────────────────────────────────
    CHAT_LABELS,
    QUICK_REACTIONS,
    CANNED_RESPONSES,

    // ── Handlers ─────────────────────────────────────────────
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

    // ── Derived values ────────────────────────────────────────
    filteredConversations,
    filteredMessages,
    typingInConversation,
    otherParticipant,
    isOtherOnline,

    // ── Socket state (needed in sub-components) ───────────────
    onlineUsers,
    getOtherParticipant,

    // ── Utilities ─────────────────────────────────────────────
    formatMessageTime,
    formatConversationTime,
  } as const;
}
