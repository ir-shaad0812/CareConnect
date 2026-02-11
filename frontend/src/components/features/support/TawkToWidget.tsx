// ============================================
// TAWK.TO WIDGET COMPONENT
// Customer support chat widget integration
// ============================================

"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Headphones,
  HelpCircle,
  CreditCard,
  Calendar,
  Unlock,
  Flag,
  ChevronRight,
  Loader2,
} from "lucide-react";
import env from "@/config/env";
import { AUTH_CONFIG } from "@/lib/constants";

// ============================================
// TYPES
// ============================================

interface TawkToConfig {
  propertyId: string;
  widgetId: string;
  enabled: boolean;
  visitor?: {
    name: string;
    email: string;
    hash: string | null;
  };
  attributes?: Record<string, string>;
}

interface SupportLink {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface TawkToWidgetProps {
  position?: "bottom-right" | "bottom-left";
  offset?: { x: number; y: number };
  showQuickLinks?: boolean;
  conversationId?: string;
}

// Declare tawk.to global types
declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      onStatusChange?: (status: string) => void;
      onChatStarted?: () => void;
      onChatEnded?: () => void;
      toggle?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      hideWidget?: () => void;
      showWidget?: () => void;
      setAttributes?: (attributes: Record<string, string>, callback?: (error?: Error) => void) => void;
      visitor?: {
        name?: string;
        email?: string;
        hash?: string;
      };
    };
    Tawk_LoadStart?: Date;
  }
}

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<string, React.ElementType> = {
  "credit-card": CreditCard,
  calendar: Calendar,
  unlock: Unlock,
  flag: Flag,
  "help-circle": HelpCircle,
};

// ============================================
// QUICK HELP PANEL
// ============================================

const QuickHelpPanel = memo<{
  links: SupportLink[];
  onSelect: (linkId: string) => void;
  onClose: () => void;
}>(({ links, onSelect, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="absolute bottom-20 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#39B54A] to-[#2d913c] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Headphones className="w-5 h-5" />
          <span className="font-semibold">How can we help?</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Links */}
      <div className="p-2 max-h-80 overflow-y-auto">
        {links.map((link) => {
          const Icon = iconMap[link.icon] || HelpCircle;
          return (
            <motion.button
              key={link.id}
              whileHover={{ x: 4 }}
              onClick={() => onSelect(link.id)}
              className="w-full p-3 flex items-center gap-3 rounded-xl hover:bg-gray-50 transition-colors text-left group"
            >
              <div className="p-2 bg-[#39B54A]/10 rounded-lg group-hover:bg-[#39B54A]/20 transition-colors">
                <Icon className="w-5 h-5 text-[#39B54A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{link.title}</p>
                <p className="text-xs text-gray-500 truncate">{link.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#39B54A] transition-colors" />
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => onSelect("live_chat")}
          className="w-full py-2.5 bg-[#39B54A] hover:bg-[#2d913c] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Start Live Chat
        </button>
      </div>
    </motion.div>
  );
});

QuickHelpPanel.displayName = "QuickHelpPanel";

// ============================================
// MAIN COMPONENT
// ============================================

export const TawkToWidget = memo<TawkToWidgetProps>(({
  position = "bottom-right",
  offset = { x: 20, y: 20 },
  showQuickLinks = true,
  conversationId,
}) => {
  const [config, setConfig] = useState<TawkToConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [supportLinks, setSupportLinks] = useState<SupportLink[]>([]);
  const [tawkLoaded, setTawkLoaded] = useState(false);
  const scriptLoadedRef = useRef(false);
  const apiBaseUrl = env.API_URL;

  // Fetch widget configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Add auth token if available
        const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `${apiBaseUrl}/support/widget-config`,
          { headers }
        );
        const data = await response.json();

        if (data.success && data.data) {
          setConfig(data.data);
        }
      } catch {
        // Widget config unavailable — widget will not render
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl]);

  // Fetch support links
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/support/links`
        );
        const data = await response.json();

        if (data.success && data.data?.links) {
          setSupportLinks(data.data.links);
        }
      } catch {
        // Support links unavailable — quick links panel will be empty
      }
    };

    fetchLinks();
  }, [apiBaseUrl]);

  // Load tawk.to script
  useEffect(() => {
    if (!config?.enabled || !config?.propertyId || !config?.widgetId || scriptLoadedRef.current) {
      return;
    }

    scriptLoadedRef.current = true;

    // Initialize tawk.to
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    // Set up callbacks
    window.Tawk_API.onLoad = () => {
      setTawkLoaded(true);

      // Set visitor info if available
      if (config.visitor && window.Tawk_API) {
        window.Tawk_API.visitor = {
          name: config.visitor.name,
          email: config.visitor.email,
          ...(config.visitor.hash ? { hash: config.visitor.hash } : {}),
        };
      }

      // Set custom attributes
      if (config.attributes && window.Tawk_API?.setAttributes) {
        window.Tawk_API.setAttributes(config.attributes, (error) => {
          if (error) {
            console.error("Failed to set tawk.to attributes:", error);
          }
        });
      }

      // Hide default widget - we use our own button
      if (window.Tawk_API?.hideWidget) {
        window.Tawk_API.hideWidget();
      }
    };

    // Load the script
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://embed.tawk.to/${config.propertyId}/${config.widgetId}`;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.head.appendChild(script);

    return () => {
      // Cleanup is tricky with tawk.to - it doesn't fully unload
      // Just remove the script tag
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [config]);

  // Handle support link selection
  const handleLinkSelect = useCallback(async (linkId: string) => {
    setShowPanel(false);

    if (linkId === "live_chat") {
      // Open tawk.to chat
      if (window.Tawk_API?.maximize) {
        window.Tawk_API.showWidget?.();
        window.Tawk_API.maximize();
      }
      return;
    }

    // Log interaction
    try {
      const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
      if (token) {
        await fetch(`${apiBaseUrl}/support/log-interaction`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: "quick_link_clicked",
            metadata: { linkId, conversationId },
          }),
        });
      }
    } catch {
      // Ignore logging errors
    }

    // Set context attributes for the support link
    if (window.Tawk_API?.setAttributes) {
      window.Tawk_API.setAttributes({
        "Support Topic": linkId,
        "Conversation ID": conversationId || "N/A",
      });
    }

    // Open chat with context
    if (window.Tawk_API?.maximize) {
      window.Tawk_API.showWidget?.();
      window.Tawk_API.maximize();
    }
  }, [apiBaseUrl, conversationId]);

  // Toggle panel
  const handleTogglePanel = useCallback(() => {
    if (showQuickLinks && supportLinks.length > 0) {
      setShowPanel((prev) => !prev);
    } else {
      // Directly open tawk.to
      if (window.Tawk_API?.toggle) {
        window.Tawk_API.showWidget?.();
        window.Tawk_API.toggle();
      }
    }
  }, [showQuickLinks, supportLinks]);

  // Don't render if not enabled or still loading
  if (isLoading || !config?.enabled) {
    return null;
  }

  const positionStyles =
    position === "bottom-right"
      ? { right: offset.x, bottom: offset.y }
      : { left: offset.x, bottom: offset.y };

  return (
    <div className="fixed z-50" style={positionStyles}>
      <AnimatePresence>
        {showPanel && (
          <QuickHelpPanel
            links={supportLinks}
            onSelect={handleLinkSelect}
            onClose={() => setShowPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleTogglePanel}
        className="w-14 h-14 bg-gradient-to-r from-[#39B54A] to-[#2d913c] text-white rounded-full shadow-lg shadow-[#39B54A]/30 flex items-center justify-center hover:shadow-xl hover:shadow-[#39B54A]/40 transition-shadow"
        aria-label="Open support chat"
      >
        <AnimatePresence mode="wait">
          {showPanel ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : tawkLoaded ? (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <Headphones className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="w-6 h-6 animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Pulse Animation Ring */}
      {!showPanel && tawkLoaded && (
        <motion.div
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeOut",
          }}
          className="absolute inset-0 w-14 h-14 bg-[#39B54A] rounded-full pointer-events-none"
        />
      )}
    </div>
  );
});

TawkToWidget.displayName = "TawkToWidget";

export default TawkToWidget;
