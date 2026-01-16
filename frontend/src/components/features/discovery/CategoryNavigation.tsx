// ============================================
// CATEGORY NAVIGATION COMPONENT
// Premium category-based browsing for caregivers
// ============================================

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Baby,
  Heart,
  Brain,
  Stethoscope,
  HandHeart,
  Users,
  Moon,
  Pill,
  Accessibility,
  UtensilsCrossed,
  Sparkles,
  Clock,
  Home,
  Activity,
  LucideIcon,
} from "lucide-react";

// ─── Category Definitions ──────────────────────────────────────────
export interface CareCategory {
  id: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  description: string;
}

export const CARE_CATEGORIES: CareCategory[] = [
  {
    id: "all",
    label: "All Caregivers",
    shortLabel: "All",
    icon: Users,
    color: "text-slate-600",
    gradient: "from-slate-500 to-slate-600",
    description: "Browse all available caregivers",
  },
  {
    id: "child_care",
    label: "Child Care",
    shortLabel: "Child",
    icon: Baby,
    color: "text-pink-600",
    gradient: "from-pink-500 to-rose-500",
    description: "Babysitters, nannies, and child care specialists",
  },
  {
    id: "elderly_care",
    label: "Elderly Care",
    shortLabel: "Elderly",
    icon: Heart,
    color: "text-red-600",
    gradient: "from-red-500 to-rose-500",
    description: "Senior care and elderly companionship",
  },
  {
    id: "alzheimers_care",
    label: "Alzheimer's Care",
    shortLabel: "Alzheimer's",
    icon: Brain,
    color: "text-purple-600",
    gradient: "from-purple-500 to-indigo-500",
    description: "Specialized Alzheimer's and dementia care",
  },
  {
    id: "dementia_care",
    label: "Dementia Care",
    shortLabel: "Dementia",
    icon: Brain,
    color: "text-violet-600",
    gradient: "from-violet-500 to-purple-500",
    description: "Cognitive care and memory support",
  },
  {
    id: "special_needs",
    label: "Special Needs",
    shortLabel: "Special",
    icon: Sparkles,
    color: "text-amber-600",
    gradient: "from-amber-500 to-orange-500",
    description: "Care for individuals with special needs",
  },
  {
    id: "disability_care",
    label: "Disability Care",
    shortLabel: "Disability",
    icon: Accessibility,
    color: "text-blue-600",
    gradient: "from-blue-500 to-cyan-500",
    description: "Support for physical and developmental disabilities",
  },
  {
    id: "post_surgery",
    label: "Post-Surgery Care",
    shortLabel: "Post-Op",
    icon: Stethoscope,
    color: "text-teal-600",
    gradient: "from-teal-500 to-emerald-500",
    description: "Recovery assistance after medical procedures",
  },
  {
    id: "palliative_care",
    label: "Palliative Care",
    shortLabel: "Palliative",
    icon: HandHeart,
    color: "text-rose-600",
    gradient: "from-rose-500 to-pink-500",
    description: "Comfort care and end-of-life support",
  },
  {
    id: "respite_care",
    label: "Respite Care",
    shortLabel: "Respite",
    icon: Clock,
    color: "text-indigo-600",
    gradient: "from-indigo-500 to-blue-500",
    description: "Temporary relief for family caregivers",
  },
  {
    id: "companionship",
    label: "Companionship",
    shortLabel: "Companion",
    icon: Users,
    color: "text-emerald-600",
    gradient: "from-emerald-500 to-teal-500",
    description: "Social companionship and emotional support",
  },
  {
    id: "overnight_care",
    label: "Overnight Care",
    shortLabel: "Overnight",
    icon: Moon,
    color: "text-slate-600",
    gradient: "from-slate-600 to-slate-700",
    description: "Night-time care and supervision",
  },
  {
    id: "medication_management",
    label: "Medication Management",
    shortLabel: "Medication",
    icon: Pill,
    color: "text-cyan-600",
    gradient: "from-cyan-500 to-teal-500",
    description: "Medication reminders and administration",
  },
  {
    id: "personal_care",
    label: "Personal Care",
    shortLabel: "Personal",
    icon: Home,
    color: "text-orange-600",
    gradient: "from-orange-500 to-amber-500",
    description: "Help with daily personal activities",
  },
  {
    id: "meal_preparation",
    label: "Meal Preparation",
    shortLabel: "Meals",
    icon: UtensilsCrossed,
    color: "text-green-600",
    gradient: "from-green-500 to-emerald-500",
    description: "Nutritious meal planning and cooking",
  },
  {
    id: "mobility_assistance",
    label: "Mobility Assistance",
    shortLabel: "Mobility",
    icon: Activity,
    color: "text-sky-600",
    gradient: "from-sky-500 to-blue-500",
    description: "Help with movement and transfers",
  },
];

// ─── Props Interface ───────────────────────────────────────────────
interface CategoryNavigationProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  variant?: "horizontal" | "grid";
  multiSelect?: boolean;
  showDescription?: boolean;
  className?: string;
}

// ─── Category Chip Component ───────────────────────────────────────
const CategoryChip = memo(function CategoryChip({
  category,
  isSelected,
  onClick,
  showDescription,
}: {
  category: CareCategory;
  isSelected: boolean;
  onClick: () => void;
  showDescription?: boolean;
}) {
  const Icon = category.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all duration-200",
        "border shadow-sm",
        isSelected
          ? cn(
              "bg-linear-to-r text-white shadow-md",
              category.gradient,
              "border-transparent"
            )
          : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
          isSelected ? "bg-white/20" : category.color + "/10 bg-current/10"
        )}
      >
        <Icon
          className={cn(
            "w-4.5 h-4.5",
            isSelected ? "text-white" : category.color
          )}
        />
      </div>
      <div className="text-left">
        <span
          className={cn(
            "text-sm font-semibold whitespace-nowrap",
            isSelected ? "text-white" : "text-gray-800"
          )}
        >
          {category.shortLabel || category.label}
        </span>
        {showDescription && (
          <p
            className={cn(
              "text-xs mt-0.5 line-clamp-1",
              isSelected ? "text-white/80" : "text-gray-500"
            )}
          >
            {category.description}
          </p>
        )}
      </div>
      {isSelected && (
        <motion.div
          layoutId="category-selected"
          className="absolute inset-0 rounded-xl bg-white/10"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
});

// ─── Main Component ────────────────────────────────────────────────
export const CategoryNavigation = memo(function CategoryNavigation({
  selectedCategories,
  onCategoryChange,
  variant = "horizontal",
  multiSelect = true,
  showDescription = false,
  className,
}: CategoryNavigationProps) {
  const handleClick = (categoryId: string) => {
    if (categoryId === "all") {
      onCategoryChange([]);
      return;
    }

    if (multiSelect) {
      if (selectedCategories.includes(categoryId)) {
        onCategoryChange(selectedCategories.filter((c) => c !== categoryId));
      } else {
        onCategoryChange([...selectedCategories, categoryId]);
      }
    } else {
      onCategoryChange(
        selectedCategories.includes(categoryId) ? [] : [categoryId]
      );
    }
  };

  const isAllSelected = selectedCategories.length === 0;

  if (variant === "grid") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Browse by Category
          </h2>
          {selectedCategories.length > 0 && (
            <button
              onClick={() => onCategoryChange([])}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Clear selection
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {CARE_CATEGORIES.map((category) => (
            <CategoryChip
              key={category.id}
              category={category}
              isSelected={
                category.id === "all"
                  ? isAllSelected
                  : selectedCategories.includes(category.id)
              }
              onClick={() => handleClick(category.id)}
              showDescription={showDescription}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Scroll Container */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex items-center gap-2.5 py-2">
          {CARE_CATEGORIES.map((category) => (
            <CategoryChip
              key={category.id}
              category={category}
              isSelected={
                category.id === "all"
                  ? isAllSelected
                  : selectedCategories.includes(category.id)
              }
              onClick={() => handleClick(category.id)}
            />
          ))}
        </div>
      </div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-8 bg-linear-to-r from-[#F8FAFB] to-transparent pointer-events-none hidden sm:block" />
      <div className="absolute inset-y-0 right-0 w-8 bg-linear-to-l from-[#F8FAFB] to-transparent pointer-events-none hidden sm:block" />
    </div>
  );
});

export default CategoryNavigation;
