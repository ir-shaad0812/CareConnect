"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Loader2, MapPin } from "lucide-react";
import locationApiService, { type LocationSuggestion } from "@/modules/property/services";

interface LocationAutocompleteProps {
  onSelect: (suggestion: LocationSuggestion) => void;
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) {
    return text;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "ig");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    index % 2 === 1 ? <mark key={index} className="bg-yellow-100 px-0.5 rounded-sm">{part}</mark> : <span key={index}>{part}</span>
  );
}

export default function LocationAutocomplete({ onSelect }: LocationAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [cache, setCache] = useState<Record<string, LocationSuggestion[]>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    const normalized = query.trim().toLowerCase();

    if (normalized.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (cache[normalized]) {
        setSuggestions(cache[normalized]);
        setOpen(true);
        return;
      }

      setLoading(true);
      try {
        const next = await locationApiService.searchAddress(normalized);
        setSuggestions(next);
        setCache((prev) => ({ ...prev, [normalized]: next }));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, cache]);

  const visibleSuggestions = useMemo(() => suggestions.slice(0, 8), [suggestions]);

  function chooseSuggestion(suggestion: LocationSuggestion) {
    setQuery(suggestion.displayName);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(suggestion);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || visibleSuggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % visibleSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? visibleSuggestions.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(visibleSuggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (visibleSuggestions.length > 0) {
              setOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder="Search city, state, country"
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
      </div>

      {open && visibleSuggestions.length > 0 && (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              type="button"
              onClick={() => chooseSuggestion(suggestion)}
              className={`w-full border-b border-gray-100 px-3 py-2.5 text-left text-sm last:border-b-0 ${index === activeIndex ? "bg-primary-50" : "hover:bg-gray-50"}`}
            >
              <div className="font-medium text-gray-800">{highlightMatch(suggestion.displayName, query)}</div>
              <div className="text-xs text-gray-500">{[suggestion.city, suggestion.state, suggestion.country].filter(Boolean).join(", ")}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

