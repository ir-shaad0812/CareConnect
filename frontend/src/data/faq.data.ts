// sample Q&A data for CareConnect support widget
import { QAPair } from "@/modules/chat/components/QAChatWidget";

export const careConnectFAQ: QAPair[] = [
  // getting started
  {
    id: "1",
    question: "How do I find a caregiver?",
    answer: "You can browse available caregivers by clicking 'Find Caregivers' in the navigation menu. Use filters to narrow your search by location, availability, skills, and hourly rate.",
    category: "Getting Started",
  },
  {
    id: "2",
    question: "How do I create an account?",
    answer: "Click the 'Sign Up' button in the top right corner. You can register with email or use your Google account for quick signup. Complete your profile to get started.",
    category: "Getting Started",
  },
  {
    id: "3",
    question: "What information do I need to provide?",
    answer: "Basic information includes your name, email, phone number, and address. For caregivers, you'll also need to add certifications, experience, and availability.",
    category: "Getting Started",
  },
  
  // bookings
  {
    id: "4",
    question: "How do I book a caregiver?",
    answer: "Once you find a caregiver you like, click 'Book Now' on their profile. Select your preferred date, time, and service type, then confirm your booking. You'll receive instant confirmation.",
    category: "Bookings",
  },
  {
    id: "5",
    question: "Can I cancel or reschedule a booking?",
    answer: "Yes! Go to 'My Bookings' in your dashboard. You can cancel up to 24 hours before the appointment for a full refund, or reschedule anytime based on caregiver availability.",
    category: "Bookings",
  },
  {
    id: "6",
    question: "What if a caregiver cancels?",
    answer: "If a caregiver cancels, you'll be notified immediately and receive a full refund. We'll also help you find a replacement caregiver quickly.",
    category: "Bookings",
  },
  
  // payments
  {
    id: "7",
    question: "How does payment work?",
    answer: "Payments are processed securely through our platform. You pay upfront when booking. Funds are held and released to the caregiver after the service is completed.",
    category: "Payments",
  },
  {
    id: "8",
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, Amex), debit cards, and digital wallets like Apple Pay and Google Pay.",
    category: "Payments",
  },
  {
    id: "9",
    question: "When do I get charged?",
    answer: "You're charged immediately upon booking confirmation. If you cancel within 24 hours, you'll receive a full refund within 3-5 business days.",
    category: "Payments",
  },
  
  // safety & trust
  {
    id: "10",
    question: "Are caregivers background-checked?",
    answer: "Yes! All caregivers undergo comprehensive background checks including criminal records, identity verification, and professional reference checks before joining our platform.",
    category: "Safety & Trust",
  },
  {
    id: "11",
    question: "What if I have an issue with a caregiver?",
    answer: "Contact our support team immediately through the 'Contact Support' button or email support@careconnect.com. We take all concerns seriously and will investigate promptly.",
    category: "Safety & Trust",
  },
  {
    id: "12",
    question: "Is my personal information secure?",
    answer: "Absolutely. We use bank-level encryption to protect your data. Your information is never shared with third parties without your consent.",
    category: "Safety & Trust",
  },
  
  // for caregivers
  {
    id: "13",
    question: "How do I become a caregiver?",
    answer: "Click 'Join as Caregiver' and complete your profile. You'll need to provide certifications, experience details, and pass our background check. Approval typically takes 2-3 business days.",
    category: "For Caregivers",
  },
  {
    id: "14",
    question: "How do I get paid as a caregiver?",
    answer: "Payments are transferred to your bank account weekly. Set up direct deposit in your account settings. You can track your earnings in the dashboard.",
    category: "For Caregivers",
  },
  {
    id: "15",
    question: "Can I set my own rates?",
    answer: "Yes! You have full control over your hourly rates. We provide market insights to help you stay competitive while earning fairly for your skills and experience.",
    category: "For Caregivers",
  },
  
  // account & profile
  {
    id: "16",
    question: "How do I update my profile?",
    answer: "Click your profile picture in the top right, then select 'Profile Settings'. You can update your information, photo, availability, and preferences anytime.",
    category: "Account",
  },
  {
    id: "17",
    question: "I forgot my password. What do I do?",
    answer: "Click 'Forgot Password' on the login page. Enter your email and we'll send you a secure reset link. Follow the instructions to create a new password.",
    category: "Account",
  },
  {
    id: "18",
    question: "Can I delete my account?",
    answer: "Yes, but we're sad to see you go! Go to Account Settings → Privacy & Security → Delete Account. Note: This action is permanent and cannot be undone.",
    category: "Account",
  },
];
