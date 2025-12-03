"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Bot, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

// types for Q&A pairs
export interface QAPair {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

// message in chat history
interface ChatMessage {
  id: string;
  type: "question" | "answer";
  content: string;
  timestamp: Date;
}

interface QAChatWidgetProps {
  // content
  qaData: QAPair[];
  welcomeMessage?: string;
  placeholderText?: string;
  
  // styling
  size?: "sm" | "md" | "lg";
  position?: "bottom-right" | "bottom-left" | "inline";
  accentColor?: string;
  
  // behavior
  autoOpen?: boolean;
  showCategories?: boolean;
  maxHeight?: number;
  
  className?: string;
}

export const QAChatWidget: React.FC<QAChatWidgetProps> = ({
  qaData,
  welcomeMessage = "Hi! How can I help you today?",
  placeholderText = "Choose a question below",
  size = "md",
  position = "bottom-right",
  accentColor = "teal",
  autoOpen = false,
  showCategories = false,
  maxHeight = 600,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // scroll to bottom when new message added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // handle question click
  const handleQuestionClick = (qa: QAPair) => {
    // add question to chat
    const questionMessage: ChatMessage = {
      id: `q-${Date.now()}`,
      type: "question",
      content: qa.question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, questionMessage]);

    // simulate typing delay then show answer
    setTimeout(() => {
      const answerMessage: ChatMessage = {
        id: `a-${Date.now()}`,
        type: "answer",
        content: qa.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, answerMessage]);
      setAnsweredQuestions((prev) => new Set([...prev, qa.id]));
    }, 500);
  };

  // get available questions (not yet answered)
  const availableQuestions = qaData.filter((qa) => !answeredQuestions.has(qa.id));

  // group by category if enabled
  const categories = showCategories
    ? Array.from(new Set(qaData.map((qa) => qa.category).filter(Boolean)))
    : [];

  const filteredQuestions = selectedCategory
    ? availableQuestions.filter((qa) => qa.category === selectedCategory)
    : availableQuestions;

  // size classes
  const sizeClasses = {
    sm: "w-80 h-96",
    md: "w-96 h-[500px]",
    lg: "w-[450px] h-[600px]",
  };

  // position classes
  const positionClasses = {
    "bottom-right": "fixed bottom-20 right-4 md:right-6",
    "bottom-left": "fixed bottom-20 left-4 md:left-6",
    inline: "relative",
  };

  const accentColors: Record<string, string> = {
    teal: "bg-teal-600 hover:bg-teal-700 text-white",
    blue: "bg-blue-600 hover:bg-blue-700 text-white",
    purple: "bg-purple-600 hover:bg-purple-700 text-white",
    green: "bg-green-600 hover:bg-green-700 text-white",
  };

  const accentBg = accentColors[accentColor] || accentColors.teal;

  if (position === "inline") {
    // inline mode - always visible, no toggle button
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <ChatInterface
          messages={messages}
          availableQuestions={filteredQuestions}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          onQuestionClick={handleQuestionClick}
          welcomeMessage={welcomeMessage}
          placeholderText={placeholderText}
          showCategories={showCategories}
          maxHeight={maxHeight}
          messagesEndRef={messagesEndRef}
          chatContainerRef={chatContainerRef}
          accentColor={accentColor}
        />
      </div>
    );
  }

  // floating mode - with toggle button
  return (
    <>
      {/* chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`${positionClasses[position]} ${sizeClasses[size]} z-50 ${className}`}
          >
            <ChatInterface
              messages={messages}
              availableQuestions={filteredQuestions}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              onQuestionClick={handleQuestionClick}
              onClose={() => setIsOpen(false)}
              welcomeMessage={welcomeMessage}
              placeholderText={placeholderText}
              showCategories={showCategories}
              maxHeight={maxHeight}
              messagesEndRef={messagesEndRef}
              chatContainerRef={chatContainerRef}
              accentColor={accentColor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`${
            positionClasses[position].includes("right") ? "right-4 md:right-6" : "left-4 md:left-6"
          } fixed bottom-6 z-50 w-14 h-14 ${accentBg} rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${accentColor}-500`}
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </>
  );
};

// chat interface component
interface ChatInterfaceProps {
  messages: ChatMessage[];
  availableQuestions: QAPair[];
  categories: (string | undefined)[];
  selectedCategory: string | null;
  onCategorySelect: (category: string | null) => void;
  onQuestionClick: (qa: QAPair) => void;
  onClose?: () => void;
  welcomeMessage: string;
  placeholderText: string;
  showCategories: boolean;
  maxHeight: number;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  accentColor: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  availableQuestions,
  categories,
  selectedCategory,
  onCategorySelect,
  onQuestionClick,
  onClose,
  welcomeMessage,
  placeholderText,
  showCategories,
  maxHeight,
  messagesEndRef,
  chatContainerRef,
  accentColor,
}) => {
  const accentTextColors: Record<string, string> = {
    teal: "text-teal-600 dark:text-teal-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    green: "text-green-600 dark:text-green-400",
  };

  const accentText = accentTextColors[accentColor] || accentTextColors.teal;

  return (
    <div className="h-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* header */}
      <div className={`bg-linear-to-r from-${accentColor}-600 to-${accentColor}-700 text-white px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-base">Support Assistant</h3>
            <p className="text-xs text-white/80">Always here to help</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ maxHeight: `${maxHeight - 200}px` }}
      >
        {/* welcome message */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 items-start"
          >
            <div className="w-8 h-8 bg-linear-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-gray-800 dark:text-gray-200">{welcomeMessage}</p>
            </div>
          </motion.div>
        )}

        {/* chat history */}
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex gap-2 items-start ${
              message.type === "question" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                message.type === "question"
                  ? "bg-linear-to-br from-blue-500 to-blue-600"
                  : "bg-linear-to-br from-teal-500 to-teal-600"
              }`}
            >
              {message.type === "question" ? (
                <User size={16} className="text-white" />
              ) : (
                <Bot size={16} className="text-white" />
              )}
            </div>
            <div
              className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                message.type === "question"
                  ? "bg-blue-600 text-white rounded-tr-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </motion.div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* questions area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
        {/* category filter */}
        {showCategories && categories.length > 0 && (
          <div className="mb-3 flex gap-2 flex-wrap">
            <button
              onClick={() => onCategorySelect(null)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === null
                  ? `bg-${accentColor}-600 text-white`
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategorySelect(cat || null)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === cat
                    ? `bg-${accentColor}-600 text-white`
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* available questions */}
        {availableQuestions.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableQuestions.map((qa) => (
              <button
                key={qa.id}
                onClick={() => onQuestionClick(qa)}
                className={`w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-${accentColor}-500 dark:hover:border-${accentColor}-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-all text-sm ${accentText} hover:shadow-sm`}
              >
                {qa.question}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
            {messages.length > 0
              ? "All questions answered! Feel free to ask again."
              : placeholderText}
          </div>
        )}
      </div>
    </div>
  );
};

export default QAChatWidget;
