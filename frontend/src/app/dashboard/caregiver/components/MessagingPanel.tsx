"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  ArrowRight,
  Search,
} from "lucide-react";
import { useCaregiverConversations } from "@/hooks/useDashboardData";
import { useSocket } from "@/context/SocketContext";
import SafeAvatar from "./SafeAvatar";

const timeAgo = (dateStr: string) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function MessagingPanel() {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: loading } = useCaregiverConversations(6);
  const {
    isConnected: chatSocketConnected,
    checkOnlineStatus,
    isUserOnline,
    onNewMessage,
    onMessagesRead,
    onUserOnlineStatus,
  } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");

  const participantIds = useMemo(
    () =>
      Array.from(
        new Set(
          conversations
            .map((conversation) => conversation.participant?._id)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [conversations],
  );

  useEffect(() => {
    if (!chatSocketConnected || participantIds.length === 0) return;
    checkOnlineStatus(participantIds);
  }, [chatSocketConnected, participantIds, checkOnlineStatus]);

  useEffect(() => {
    const refreshConversations = () => {
      void queryClient.invalidateQueries({
        queryKey: ["caregiver", "conversations"],
      });
    };

    const handlePresenceUpdate = () => {
      if (participantIds.length > 0) {
        checkOnlineStatus(participantIds);
      }
    };

    const unsubscribeNewMessage = onNewMessage(refreshConversations);
    const unsubscribeMessagesRead = onMessagesRead(refreshConversations);
    const unsubscribeOnlineStatus = onUserOnlineStatus(handlePresenceUpdate);

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessagesRead();
      unsubscribeOnlineStatus();
    };
  }, [
    checkOnlineStatus,
    onMessagesRead,
    onNewMessage,
    onUserOnlineStatus,
    participantIds,
    queryClient,
  ]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const filteredConversations = searchQuery
    ? conversations.filter(c =>
        (c.participant?.fullName || `${c.participant?.firstName || ""} ${c.participant?.lastName || ""}`.trim())
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : conversations;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100/80">
          <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-gray-200" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-200 rounded w-28 mb-1.5" />
                <div className="h-3 bg-gray-100 rounded w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.25 }}
      className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-[#39B54A]" />
          <h3 className="text-base font-semibold text-gray-900">Messages</h3>
          {totalUnread > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 rounded-full">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              chatSocketConnected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                chatSocketConnected ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {chatSocketConnected ? "Live" : "Syncing"}
          </span>
          <Link
            href="/messages"
            className="flex items-center gap-1.5 text-xs font-medium text-[#39B54A] hover:text-primary-600 transition-colors"
          >
            View All
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#39B54A]/30 border border-transparent focus:border-[#39B54A]/30"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="px-3 py-3 space-y-0.5 max-h-96 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchQuery ? "No conversations match your search" : "No conversations yet"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const participantId = conv.participant?._id;
            const participantOnline = participantId
              ? isUserOnline(participantId)
              : false;
            const presenceText = !chatSocketConnected
              ? "Syncing"
              : participantOnline
                ? "Online"
                : "Offline";
            const presenceTextColor = !chatSocketConnected
              ? "text-amber-600"
              : participantOnline
                ? "text-emerald-600"
                : "text-gray-400";

            return (
              <Link
                key={conv._id}
                href="/messages"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="relative shrink-0">
                  <SafeAvatar
                    src={conv.participant?.avatar ?? null}
                    name={conv.participant?.fullName || conv.participant?.firstName || "User"}
                    size={40}
                    wrapperClassName="rounded-xl"
                    fallbackClassName="bg-gray-100 text-gray-600 font-bold text-sm rounded-xl"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                      !chatSocketConnected
                        ? "bg-amber-500"
                        : participantOnline
                          ? "bg-emerald-500"
                          : "bg-gray-300"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {conv.participant?.fullName || `${conv.participant?.firstName || ""} ${conv.participant?.lastName || ""}`.trim() || "User"}
                      </p>
                      <span
                        className={`shrink-0 text-[10px] font-medium ${presenceTextColor}`}
                      >
                        {presenceText}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {timeAgo(conv.lastMessage?.createdAt || conv.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage?.content || "No messages yet"}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="shrink-0 w-5 h-5 bg-[#39B54A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </Link>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
