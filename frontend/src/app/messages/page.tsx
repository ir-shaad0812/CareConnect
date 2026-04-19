// ============================================
// MESSAGES PAGE - Main chat interface
// ============================================

import { MessagesPageClient } from "@/modules/chat/pages/messages";

export const metadata = {
  title: "Messages | CareConnect",
  description: "Chat with your caregivers and care seekers",
};

export default function MessagesPage() {
  return <MessagesPageClient />;
}
