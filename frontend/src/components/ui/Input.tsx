// ============================================
// REUSABLE INPUT COMPONENT
// ============================================

"use client";

import type { InputProps } from "@/types";

export function Input({
  label,
  error,
  placeholder,
  type = "text",
  value,
  onChange,
  className = "",
  required = false,
  disabled = false,
}: InputProps) {
  const baseStyles =
    "w-full px-4 py-3 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0";
  const normalStyles = "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  const errorStyles = "border-red-500 focus:border-red-500 focus:ring-red-500";
  const disabledStyles = "bg-gray-100 cursor-not-allowed";

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          ${baseStyles}
          ${error ? errorStyles : normalStyles}
          ${disabled ? disabledStyles : ""}
          ${className}
        `}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default Input;
