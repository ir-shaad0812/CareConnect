"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { API_CONFIG, AUTH_CONFIG } from "@/lib/constants";
import type { ApiResponse, User } from "@/types";

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

function CameraIcon({ size = 16, className, strokeWidth = 2, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function Trash2Icon({ size = 16, className, strokeWidth = 2, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function Loader2Icon({ size = 16, className, strokeWidth = 2, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </svg>
  );
}

function UserIcon({ size = 16, className, strokeWidth = 2, style }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

// Direct API calls to avoid import issues with userService
async function fetchWithAuth(path: string, init: RequestInit) {
  const accessToken =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_CONFIG.TOKEN_KEY)
      : null;

  const headers = new Headers(init.headers ?? undefined);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return fetch(`${API_CONFIG.BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const text = await response.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function getNetworkErrorMessage(): string {
  return "Unable to connect to the server. Please verify the backend service is running and try again.";
}

async function uploadAvatarAPI(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
  const formData = new FormData();
  formData.append("avatar", file);

  let response: Response;
  try {
    response = await fetchWithAuth("/users/avatar", {
      method: "POST",
      body: formData,
    });
  } catch {
    throw { message: getNetworkErrorMessage(), statusCode: 0 };
  }

  const result = await parseJsonResponse(response);
  if (!response.ok) {
    const message =
      typeof result.message === "string" && result.message.trim().length > 0
        ? result.message
        : "Upload failed";
    throw { message, statusCode: response.status };
  }

  return {
    success: true,
    data: result.data as { avatarUrl: string },
  };
}

async function removeAvatarAPI(): Promise<ApiResponse<{ user: User }>> {
  let response: Response;
  try {
    response = await fetchWithAuth("/users/avatar", { method: "DELETE" });
  } catch {
    throw { message: getNetworkErrorMessage(), statusCode: 0 };
  }

  const result = await parseJsonResponse(response);
  if (!response.ok) {
    const message =
      typeof result.message === "string" && result.message.trim().length > 0
        ? result.message
        : "Remove failed";
    throw { message, statusCode: response.status };
  }

  return {
    success: true,
    data: result.data as { user: User },
  };
}

interface AvatarUploadProps {
  /** Current avatar URL */
  avatar?: string;
  /** User's display name (used for fallback initial) */
  fullName?: string;
  /**
   * Called after upload (new URL) or after delete (empty string "").
   * Parent should treat "" as "no avatar".
   */
  onAvatarChange: (newAvatarUrl: string) => void;
  /** Accent colour used for initial background / badges. Defaults to #39B54A */
  accentColor?: string;
  /** Size in pixels (width & height). Defaults to 96 */
  size?: number;
}

export default function AvatarUpload({
  avatar,
  fullName,
  onAvatarChange,
  accentColor = "#39B54A",
  size = 96,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const isBusy = isUploading || isDeleting;
  const displayAvatar = preview || avatar;
  const hasAvatar = !!(avatar || preview);
  const shouldBypassOptimizer =
    !!displayAvatar &&
    (displayAvatar.startsWith("blob:") || /^https?:\/\//i.test(displayAvatar));

  useEffect(() => {
    setImageLoadFailed(false);
  }, [displayAvatar]);

  /* ─── Upload ─────────────────────────────────────────────────── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5 MB");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploadError("");

    try {
      setIsUploading(true);
      const response = await uploadAvatarAPI(file);

      if (response.success && response.data) {
        const newUrl =
          (response.data as unknown as { user?: { avatar?: string }; avatarUrl?: string })
            ?.user?.avatar ??
          (response.data as unknown as { avatarUrl?: string })?.avatarUrl ??
          "";
        if (newUrl) {
          onAvatarChange(newUrl);
          setPreview(null);
          URL.revokeObjectURL(objectUrl);
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Upload failed";
      setUploadError(msg);
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  /* ─── Delete ──────────────────────────────────────────────────── */
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBusy || !hasAvatar) return;
    setUploadError("");

    try {
      setIsDeleting(true);
      await removeAvatarAPI();
      onAvatarChange("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? "Remove failed";
      setUploadError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ─── Render ──────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Container */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Avatar circle */}
        <div
          className="w-full h-full rounded-2xl shadow-lg border-4 border-white overflow-hidden flex items-center justify-center select-none cursor-pointer hover:opacity-90 transition-opacity"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
          onClick={() => !isBusy && inputRef.current?.click()}
        >
          {displayAvatar && !imageLoadFailed ? (
            <Image
              src={displayAvatar}
              alt={fullName ?? "Profile photo"}
              width={size}
              height={size}
              className="object-cover w-full h-full"
              unoptimized={shouldBypassOptimizer}
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <UserIcon
              size={size * 0.55}
              style={{ color: accentColor, opacity: 0.45 }}
            />
          )}
        </div>

        {/* Busy spinner overlay */}
        {isBusy && (
          <div className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center gap-1">
            <Loader2Icon size={22} className="text-white animate-spin" />
            <span className="text-white text-[10px] font-medium">
              {isDeleting ? "Removing…" : "Uploading…"}
            </span>
          </div>
        )}

        {/* Camera badge for edit - always visible when not busy */}
        {!isBusy && (
          <button
            type="button"
            aria-label={hasAvatar ? "Change profile photo" : "Add profile photo"}
            title={hasAvatar ? "Change profile photo" : "Add profile photo"}
            onClick={() => inputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: accentColor, outlineColor: accentColor }}
          >
            <CameraIcon size={16} className="text-white" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
        disabled={isBusy}
      />

      {/* Action buttons - clearly visible below avatar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          style={{
            borderColor: accentColor,
            color: accentColor,
            backgroundColor: `${accentColor}10`,
          }}
        >
          <CameraIcon size={16} strokeWidth={2} style={{ color: accentColor }} />
          {hasAvatar ? "Change" : "Add Photo"}
        </button>

        {hasAvatar && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 border-red-400 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          >
            <Trash2Icon size={16} strokeWidth={2} className="text-red-600" />
            Delete
          </button>
        )}
      </div>

      {/* Hint text */}
      <p className="text-xs text-gray-400 text-center">
        Max 5 MB · JPEG, PNG, WebP, GIF
      </p>

      {/* Inline error */}
      {uploadError && (
        <p className="text-xs text-red-500 text-center max-w-50 leading-tight bg-red-50 px-3 py-1.5 rounded-lg">
          {uploadError}
        </p>
      )}
    </div>
  );
}
