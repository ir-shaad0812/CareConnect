"use client";

import { useEffect, useMemo, useState } from "react";

interface SafeAvatarProps {
  src?: string | null;
  name?: string;
  size: number;
  alt?: string;
  wrapperClassName?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export default function SafeAvatar({
  src,
  name,
  size,
  alt,
  wrapperClassName = "rounded-full",
  imageClassName = "",
  fallbackClassName = "bg-gray-100 text-gray-600 font-semibold",
}: SafeAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const initial = useMemo(() => {
    const first = name?.trim().charAt(0);
    return first ? first.toUpperCase() : "?";
  }, [name]);

  const displayAlt = alt || name || "Avatar";
  const canRenderImage = Boolean(src) && !imageFailed;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 overflow-hidden ${wrapperClassName}`}
    >
      {canRenderImage ? (
        <img
          src={src || ""}
          alt={displayAlt}
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`w-full h-full object-cover ${imageClassName}`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center ${fallbackClassName}`}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
