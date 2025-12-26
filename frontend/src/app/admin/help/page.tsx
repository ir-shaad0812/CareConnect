"use client";

import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  HelpCircle,
  Search,
  Users,
  Calendar,
  CreditCard,
  Star,
  MessageCircle,
  Shield,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Zap,
  Lock,
  Bell,
  BarChart2,
  FileText,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string;
  a: string;
}

interface HelpSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  faqs: FaqItem[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "users",
    icon: <Users className="w-5 h-5" />,
    title: "User Management",
    description: "Manage caregivers, care seekers, approvals, and suspensions.",
    color: "bg-blue-50 text-blue-600",
    faqs: [
      {
        q: "How do I approve a new caregiver account?",
        a: "Go to Users → filter by Status: Pending Approval. Click on the user, review their profile, then click 'Approve'. They'll receive an email notification and gain full platform access.",
      },
      {
        q: "How do I suspend a user?",
        a: "Open the user's profile from the Users page. Click the 'Suspend' button. You'll be prompted to enter a reason which is recorded in the audit log and optionally sent to the user.",
      },
      {
        q: "Can I permanently delete a user?",
        a: "Yes. From the user detail panel, click 'Delete User'. This is irreversible — all associated bookings, messages, and documents are removed. Consider suspending instead if you may need to review the account later.",
      },
      {
        q: "How do I change a user's role?",
        a: "From the user detail panel, use the 'Change Role' dropdown. Role changes take effect immediately. Changing a caregiver to admin grants full admin panel access.",
      },
    ],
  },
  {
    id: "bookings",
    icon: <Calendar className="w-5 h-5" />,
    title: "Booking Management",
    description: "View, cancel, and resolve disputed bookings.",
    color: "bg-violet-50 text-violet-600",
    faqs: [
      {
        q: "How do I view all active bookings?",
        a: "Navigate to Bookings in the sidebar. Use the Status filter to select 'In Progress'. You can search by booking number, caregiver name, or care seeker name.",
      },
      {
        q: "How do I resolve a disputed booking?",
        a: "Go to Messages → Disputes tab. Select the booking, review the dispute reason, choose a resolution (full refund, partial refund, no refund, or other), add notes, and click 'Resolve Dispute'. Both parties are notified automatically.",
      },
      {
        q: "Can I cancel a booking on behalf of a user?",
        a: "Yes. Open the booking details from the Bookings page, click 'Cancel Booking (Admin Override)', and provide a reason. This bypasses user-level cancellation policies and is logged as an admin action.",
      },
      {
        q: "What happens to payments when a booking is cancelled by admin?",
        a: "Admin cancellations trigger the refund flow automatically based on platform policy. Full refund is issued if cancelled before the start date; partial refund applies within 24 hours.",
      },
    ],
  },
  {
    id: "payments",
    icon: <CreditCard className="w-5 h-5" />,
    title: "Earnings & Payments",
    description: "Monitor revenue, platform fees, and payment transactions.",
    color: "bg-emerald-50 text-emerald-600",
    faqs: [
      {
        q: "Where can I see total platform revenue?",
        a: "Go to Earnings in the sidebar. The overview shows gross revenue, platform fees collected, and net payouts to caregivers. Use the date range filter to view any time period.",
      },
      {
        q: "How are platform fees calculated?",
        a: "The platform takes a percentage of each completed booking's total amount. The exact fee rate is configured in the backend payment constants. Fees are automatically deducted from the caregiver's payout.",
      },
      {
        q: "How do I track a specific transaction?",
        a: "Use the Earnings page search to look up by booking number, user name, or transaction ID. Each transaction shows its status, amount, gateway (Khalti/Stripe), and timestamps.",
      },
    ],
  },
  {
    id: "reviews",
    icon: <Star className="w-5 h-5" />,
    title: "Reviews & Ratings",
    description: "Moderate reviews, handle reports, and remove inappropriate content.",
    color: "bg-amber-50 text-amber-600",
    faqs: [
      {
        q: "How do I remove an inappropriate review?",
        a: "Go to Reviews in the sidebar. Find the review (use search or filter by status 'reported'). Click 'Moderate' → 'Remove Review'. A reason is logged and the author is notified.",
      },
      {
        q: "Can I hide a review without deleting it?",
        a: "Yes. Set the review status to 'hidden' via the moderation panel. The review is preserved in the database for audit purposes but is no longer visible on public profiles.",
      },
      {
        q: "How are star ratings calculated for caregivers?",
        a: "Ratings are averaged across all verified reviews linked to completed bookings. Ratings from public (non-booking) reviews are weighted separately and displayed with a different badge.",
      },
    ],
  },
  {
    id: "messages",
    icon: <MessageCircle className="w-5 h-5" />,
    title: "Messages & Disputes",
    description: "Monitor chats, handle reported messages, and manage disputes.",
    color: "bg-indigo-50 text-indigo-600",
    faqs: [
      {
        q: "How do I view a specific conversation?",
        a: "Go to Messages → Conversations tab. Hover over any row and click 'View'. The conversation modal loads the last 50 messages. Admin read access is logged.",
      },
      {
        q: "How do I handle a reported message?",
        a: "In Messages → Reports tab, each reported message shows the content, reporter, and reason. Add admin notes, then choose 'Mark Reviewed', 'Take Action', or 'Dismiss'.",
      },
      {
        q: "What does Force Unlock / Restrict Chat do?",
        a: "'Force Unlock' re-opens a conversation that was locked due to a booking dispute or system flag. 'Restrict Chat' closes the conversation and prevents new messages — use this for violations of platform terms.",
      },
    ],
  },
  {
    id: "analytics",
    icon: <BarChart2 className="w-5 h-5" />,
    title: "Analytics",
    description: "Understand platform growth, visitor trends, and caregiver performance.",
    color: "bg-cyan-50 text-cyan-600",
    faqs: [
      {
        q: "Where does the 'Locations' data come from?",
        a: "Location data is derived from verified location proofs submitted by care seekers. Each unique country is counted and displayed as a percentage of total verified care seekers.",
      },
      {
        q: "What does 'Caregiver Profile Visitors' show?",
        a: "This table shows caregivers whose profiles received the most views and profile_click interactions. 'Unique' counts distinct users; 'Searches' counts how many found them via search results.",
      },
      {
        q: "What is 'Proof of Work'?",
        a: "Proof of Work shows the most recent completed bookings with their associated ratings. It's evidence of real care sessions delivered on the platform, useful for showcasing platform activity.",
      },
    ],
  },
  {
    id: "documents",
    icon: <FileText className="w-5 h-5" />,
    title: "Documents",
    description: "Verify or reject caregiver-submitted identity and credential documents.",
    color: "bg-rose-50 text-rose-600",
    faqs: [
      {
        q: "What documents do caregivers submit?",
        a: "Caregivers upload government-issued ID, professional certifications, and background check results. Each document appears in the Documents page with a preview link.",
      },
      {
        q: "How do I verify a document?",
        a: "Open the document from the Documents page. Review the file (PDF or image). Click 'Verify' to approve or 'Reject' with a reason. The caregiver's profile updates automatically.",
      },
      {
        q: "What happens if I reject a document?",
        a: "The caregiver receives a notification with your rejection reason and is prompted to re-upload a corrected document. Their account remains active but the specific verification badge is not granted.",
      },
    ],
  },
  {
    id: "security",
    icon: <Lock className="w-5 h-5" />,
    title: "Security & Settings",
    description: "Admin account security, sessions, and platform-level settings.",
    color: "bg-gray-100 text-gray-600",
    faqs: [
      {
        q: "How do I change my admin password?",
        a: "Go to Settings → Security tab. Enter your current password, then your new password twice. Passwords must be at least 8 characters with a mix of letters and numbers.",
      },
      {
        q: "How do I sign out of all sessions?",
        a: "Currently, logging out invalidates your current token. For a full session sweep, change your password — this invalidates all existing refresh tokens across devices.",
      },
      {
        q: "Are admin actions logged?",
        a: "Yes. All admin actions (approvals, suspensions, document decisions, dispute resolutions) are recorded in the Activity log with timestamps and the acting admin's ID.",
      },
    ],
  },
];

const QUICK_LINKS = [
  { label: "Pending Approvals",   href: "/admin/users?status=pending_approval", icon: <Users className="w-4 h-4" /> },
  { label: "Active Disputes",     href: "/admin/messages?tab=disputes",         icon: <MessageCircle className="w-4 h-4" /> },
  { label: "Pending Documents",   href: "/admin/documents?status=pending",      icon: <FileText className="w-4 h-4" /> },
  { label: "Dashboard Analytics", href: "/admin/analytics",                     icon: <BarChart2 className="w-4 h-4" /> },
  { label: "Activity Log",        href: "/admin/activity",                      icon: <Zap className="w-4 h-4" /> },
  { label: "Platform Settings",   href: "/admin/settings",                      icon: <Shield className="w-4 h-4" /> },
];

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

function FaqAccordion({ faq }: { faq: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-gray-50/60 transition-colors"
      >
        <span className="text-sm font-medium text-gray-900 pr-4">{faq.q}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 bg-gray-50/40 border-t border-gray-100">
          <p className="text-sm text-gray-600 leading-relaxed pt-3">{faq.a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminHelpPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const query = search.toLowerCase().trim();

  const filteredSections = HELP_SECTIONS.map((section) => ({
    ...section,
    faqs: section.faqs.filter(
      (f) =>
        !query ||
        f.q.toLowerCase().includes(query) ||
        f.a.toLowerCase().includes(query)
    ),
  })).filter((s) => !query || s.faqs.length > 0);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-4">
            <HelpCircle className="w-7 h-7 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="text-gray-500 mt-2 max-w-lg mx-auto text-sm">
            Everything you need to manage the CareConnect platform. Search for answers or
            browse by category.
          </p>

          {/* Search */}
          <div className="relative mt-6 max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search help articles…"
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-50 focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Quick Links */}
        {!query && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-primary-500" />
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Quick Links
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {QUICK_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:text-primary-600 transition-all group"
                >
                  <span className="text-gray-400 group-hover:text-primary-500 transition-colors">
                    {link.icon}
                  </span>
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Section navigation pills (hidden during search) */}
        {!query && (
          <div className="flex flex-wrap gap-2">
            {HELP_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  setActiveSection(activeSection === s.id ? null : s.id)
                }
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  activeSection === s.id
                    ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600"
                }`}
              >
                <span>{s.icon}</span>
                {s.title}
              </button>
            ))}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-6">
          {filteredSections
            .filter((s) => !activeSection || s.id === activeSection || !!query)
            .map((section) => (
              <div
                key={section.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
              >
                {/* Section header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-50">
                  <div className={`p-2.5 rounded-xl ${section.color}`}>{section.icon}</div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{section.title}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>
                  </div>
                </div>

                {/* FAQs */}
                <div className="p-5 space-y-3">
                  {section.faqs.map((faq, i) => (
                    <FaqAccordion key={i} faq={faq} />
                  ))}
                </div>
              </div>
            ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No results for "{search}"</p>
              <p className="text-sm text-gray-400 mt-1">
                Try different keywords or browse the categories above
              </p>
              <button
                onClick={() => setSearch("")}
                className="mt-4 text-sm text-primary-500 hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>

        {/* Contact footer */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white text-center">
          <Bell className="w-8 h-8 mx-auto mb-3 opacity-80" />
          <h3 className="font-semibold text-lg">Still need help?</h3>
          <p className="text-primary-100 text-sm mt-1 max-w-sm mx-auto">
            Check the Activity log for recent platform events, or review the backend API logs
            for technical issues.
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <a
              href="/admin/activity"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary-600 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Activity Log
            </a>
            <a
              href="/admin/analytics"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-400/30 text-white border border-white/20 rounded-xl text-sm font-semibold hover:bg-primary-400/50 transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              Analytics
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
