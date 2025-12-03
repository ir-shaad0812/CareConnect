// ============================================
// PREMIUM REACTION PICKER
// Instagram-style floating reaction picker
// ============================================

"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface PremiumReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
  position?: "top" | "bottom";
  selectedReactions?: string[];
  className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const QUICK_REACTIONS = ["👍", "❤️", "😊", "😂", "😮", "😢", "🙏", "🎉"];

const EMOJI_CATEGORIES = {
  "Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷"],
  "Gestures": ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "✋", "🖐️", "🖖", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "💪", "🦾", "🦿", "🦵", "🦶"],
  "People": ["👶", "👧", "🧒", "👦", "👩", "🧑", "👨", "👵", "🧓", "👴", "👲", "👳‍♀️", "👳", "🧕", "🧔", "👱‍♂️", "👱‍♀️", "👩‍🦰", "👨‍🦰", "👩‍🦱", "👨‍🦱", "👩‍🦲", "👨‍🦲", "👩‍🦳", "👨‍🦳", "🦸‍♀️", "🦸", "🦸‍♂️", "🦹‍♀️", "🦹", "🦹‍♂️"],
  "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️"],
  "Objects": ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🎱", "🎯", "🎲", "🎮", "🎼", "🎵", "🎶", "🎤", "🎧", "📱", "💻", "⌨️", "🖥️", "🖨️"],
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const containerVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      staggerChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 10,
    transition: { duration: 0.15 },
  },
};

const emojiVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 20 },
  },
  hover: {
    scale: 1.4,
    transition: { type: "spring", stiffness: 400, damping: 10 },
  },
  tap: { scale: 1 },
};

// ============================================
// MAIN COMPONENT
// ============================================

export const PremiumReactionPicker = memo<PremiumReactionPickerProps>(({
  isOpen,
  onClose,
  onSelectReaction,
  position = "top",
  selectedReactions = [],
  className = "",
}) => {
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Smileys");

  const handleSelect = useCallback((emoji: string) => {
    onSelectReaction(emoji);
    onClose();
    setShowFullPicker(false);
    setSearchQuery("");
  }, [onSelectReaction, onClose]);

  const filteredEmojis = searchQuery
    ? Object.values(EMOJI_CATEGORIES).flat().filter((emoji) =>
        emoji.includes(searchQuery)
      )
    : EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES] || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Picker */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute z-50 ${
              position === "top" ? "bottom-full mb-2" : "top-full mt-2"
            } ${className}`}
          >
            {/* Quick Reactions Bar */}
            {!showFullPicker && (
              <motion.div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 px-2 py-1.5">
                {QUICK_REACTIONS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    variants={emojiVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => handleSelect(emoji)}
                    className={`w-9 h-9 flex items-center justify-center text-xl rounded-full transition-colors ${
                      selectedReactions.includes(emoji)
                        ? "bg-[#39B54A]/10"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </motion.button>
                ))}
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                <motion.button
                  variants={emojiVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => setShowFullPicker(true)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Show more reactions"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}

            {/* Full Emoji Picker */}
            {showFullPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Reactions
                  </h3>
                  <button
                    onClick={() => {
                      setShowFullPicker(false);
                      setSearchQuery("");
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search */}
                <div className="px-4 py-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search emoji..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#39B54A]/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Categories */}
                {!searchQuery && (
                  <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                    {Object.keys(EMOJI_CATEGORIES).map((category) => (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                          activeCategory === category
                            ? "bg-[#39B54A]/10 text-[#39B54A]"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}

                {/* Emoji Grid */}
                <div className="p-4 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-8 gap-1">
                    {filteredEmojis.map((emoji, index) => (
                      <motion.button
                        key={`${emoji}-${index}`}
                        whileHover={{ scale: 1.3 }}
                        whileTap={{ scale: 1 }}
                        onClick={() => handleSelect(emoji)}
                        className={`w-8 h-8 flex items-center justify-center text-xl rounded-lg transition-colors ${
                          selectedReactions.includes(emoji)
                            ? "bg-[#39B54A]/10"
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

PremiumReactionPicker.displayName = "PremiumReactionPicker";

export default PremiumReactionPicker;
