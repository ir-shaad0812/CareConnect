// ============================================
// SEO METADATA - Production-Ready SEO Configuration
// ============================================

import { Metadata } from 'next';

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  noindex?: boolean;
}

const siteConfig = {
  name: 'CareConnect',
  description: 'Find trusted caregivers for your loved ones. Connect with verified care professionals for elderly care, child care, and special needs assistance.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://careconnect.com',
  ogImage: '/og-image.jpg',
  twitterHandle: '@careconnect',
};

export function generateSEOMetadata({
  title,
  description,
  path = '',
  image,
  type = 'website',
  keywords = [],
  noindex = false,
}: SEOProps): Metadata {
  const url = `${siteConfig.url}${path}`;
  const ogImage = image || siteConfig.ogImage;

  const defaultKeywords = [
    'caregiver',
    'elderly care',
    'child care',
    'home care',
    'healthcare',
    'caregiving services',
    'professional caregivers',
  ];

  return {
    title: `${title} | ${siteConfig.name}`,
    description,
    keywords: [...defaultKeywords, ...keywords].join(', '),
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url,
      siteName: siteConfig.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteConfig.name}`,
      description,
      creator: siteConfig.twitterHandle,
      images: [ogImage],
    },
    // Verification codes for search engines
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      // yandex: 'your-yandex-verification-code',
      // bing: 'your-bing-verification-code',
    },
    // App-specific metadata
    applicationName: siteConfig.name,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: siteConfig.name,
    },
    formatDetection: {
      telephone: false,
    },
  };
}

// Common page metadata presets
export const SEOPresets = {
  home: generateSEOMetadata({
    title: 'Find Trusted Caregivers',
    description: 'Connect with verified professional caregivers for your loved ones. Background-checked caregivers for elderly care, child care, disability support, and more.',
    keywords: ['find caregiver', 'hire caregiver', 'care services'],
  }),
  
  search: generateSEOMetadata({
    title: 'Search Caregivers',
    description: 'Search and find qualified caregivers in your area. Filter by services, experience, rates, and availability to find the perfect match for your care needs.',
    path: '/caregivers',
    keywords: ['caregiver search', 'find caregivers near me', 'hire caregiver'],
  }),
  
  about: generateSEOMetadata({
    title: 'About Us',
    description: 'Learn about CareConnect\'s mission to connect families with trusted professional caregivers. Safe, reliable, and compassionate care services.',
    path: '/about',
  }),
  
  howItWorks: generateSEOMetadata({
    title: 'How It Works',
    description: 'Learn how CareConnect makes it easy to find and hire trusted caregivers. Simple steps to connect with verified care professionals.',
    path: '/how-it-works',
  }),
};

export default generateSEOMetadata;
