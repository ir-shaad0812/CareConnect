// ============================================
// CHAT COMPONENTS - Premium Export Index  
// Single, unified chat system with production-grade UI
// ============================================

// Re-export all premium components as the authoritative chat UI
export * from "./premium";

// Core premium components with explicit names
export { PremiumMessageBubble as MessageBubble } from "./premium/PremiumMessageBubble";
export { PremiumChatHeader as ChatHeader } from "./premium/PremiumChatHeader";
export { PremiumMessageInput as MessageInput } from "./premium/PremiumMessageInput";
export { PremiumConversationItem as ConversationItem } from "./premium/PremiumConversationItem";
export { PremiumTypingIndicator as TypingIndicator } from "./premium/PremiumTypingIndicator";
export { PremiumReactionPicker as ReactionPicker } from "./premium/PremiumReactionPicker";
export { PremiumCallOverlay as CallOverlay } from "./premium/PremiumCallOverlay";
export { PremiumOnlineStatus as OnlineStatus } from "./premium/PremiumOnlineStatus";
export { PremiumMessageStatus as MessageStatus } from "./premium/PremiumMessageStatus";
