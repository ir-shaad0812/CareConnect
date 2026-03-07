// ============================================
// LOGO COMPONENT
// Single source of truth for the CareConnect logo.
// Uses /logo.png — do NOT change the image source.
// Size is standardised to "default" (40 px icon) everywhere.
// Only the text colour / visibility varies per context.
// ============================================

import Image from "next/image";
import Link from "next/link";

/** Fixed pixel size for the icon — never changes across the app */
const ICON_PX = 40;
/** Fixed Tailwind container class — matches ICON_PX exactly */
const ICON_CONTAINER = "w-10 h-10";

type LogoVariant = "default" | "white" | "sidebar";

interface LogoProps {
  /** Visual variant — controls text colour and background wrap */
  variant?: LogoVariant;
  /** Show the "CareConnect" wordmark next to the icon */
  showText?: boolean;
  /** Override the wordmark class entirely */
  textClassName?: string;
  /** Link destination — defaults to "/home" */
  href?: string;
  /** Wrapper className */
  className?: string;
  /** Render as a plain div instead of a Next.js Link */
  asLink?: boolean;
  /** Priority-load the image (true for above-the-fold logos) */
  priority?: boolean;
}

const TEXT_VARIANTS: Record<LogoVariant, string> = {
  default: "font-bold text-xl text-gray-900",
  white:   "font-bold text-xl text-white tracking-tight",
  sidebar: "font-bold text-lg text-gray-800",
};

export function Logo({
  variant = "default",
  showText = false,
  textClassName,
  href = "/home",
  className = "",
  asLink = true,
  priority = true,
}: LogoProps) {
  const resolvedTextClass = textClassName ?? TEXT_VARIANTS[variant];

  const logoContent = (
    <>
      {/* Always 40 × 40 — white card wrap only on dark/coloured backgrounds */}
      <div
        className={`${ICON_CONTAINER} shrink-0 flex items-center justify-center rounded-xl overflow-hidden ${
          variant === "white"
            ? "bg-white shadow-md shadow-black/10 p-1"
            : ""
        }`}
      >
        <Image
          src="/logo.png"
          alt="CareConnect"
          width={ICON_PX}
          height={ICON_PX}
          className="object-contain w-full h-full"
          priority={priority}
        />
      </div>

      {showText && (
        <span className={resolvedTextClass}>CareConnect</span>
      )}
    </>
  );

  if (!asLink) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {logoContent}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 hover:opacity-90 transition-opacity ${className}`}
    >
      {logoContent}
    </Link>
  );
}

export default Logo;
