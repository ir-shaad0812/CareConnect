// ============================================
// SEARCH BAR - Main search input with suggestions
// ============================================

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  isLoading?: boolean;
  showLocationSearch?: boolean;
  location?: string;
  onLocationChange?: (location: string) => void;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search for caregivers, services...",
  suggestions = [],
  isLoading = false,
  showLocationSearch = false,
  location = "",
  onLocationChange,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce hook kept for input behavior parity
  useDebounce(value, 300);

  // Handle clicks outside suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show suggestions when focused and has value
  useEffect(() => {
    setShowSuggestions(isFocused && suggestions.length > 0);
  }, [isFocused, suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) {
      if (e.key === "Enter") {
        onSearch(value);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else {
          onSearch(value);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSearch(suggestion);
  };

  // Clear input
  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div
        className={`flex items-center gap-2 bg-white dark:bg-gray-800 border rounded-xl transition-all ${
          isFocused
            ? "border-teal-500 ring-2 ring-teal-500/20"
            : "border-gray-200 dark:border-gray-600"
        }`}
      >
        {/* Search icon */}
        <div className="pl-4">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
        />

        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Location input (optional) */}
        {showLocationSearch && onLocationChange && (
          <>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-600" />
            <div className="flex items-center gap-2 pr-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder="Location"
                className="w-32 py-3 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Search button */}
        <button
          onClick={() => onSearch(value)}
          className="mr-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
        >
          Search
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden z-50"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                index === selectedIndex ? "bg-gray-50 dark:bg-gray-700" : ""
              }`}
            >
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
