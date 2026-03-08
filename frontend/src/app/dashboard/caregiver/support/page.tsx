"use client";

import Link from "next/link";
import { Bell, HelpCircle, MessageSquare, ArrowRight } from "lucide-react";
import CaregiverLayout from "../components/CaregiverLayout";

const supportLinks = [
  {
    title: "Messages",
    description: "Talk to care seekers and respond to active booking questions.",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Notice Board",
    description: "View platform announcements, task reminders, and updates.",
    href: "/notices",
    icon: Bell,
  },
  {
    title: "Help Center",
    description: "Read FAQs and contact support for account or booking issues.",
    href: "/help",
    icon: HelpCircle,
  },
];

export default function CaregiverSupportPage() {
  return (
    <CaregiverLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quick access to caregiver support resources and communication tools.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {supportLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Icon size={18} />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  Open
                  <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </CaregiverLayout>
  );
}
