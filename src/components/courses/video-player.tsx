"use client";

import { useEffect, useRef } from "react";

export function VideoPlayer({
  src,
  initialSeconds,
  onProgress,
  onEnded,
}: {
  src: string;
  initialSeconds?: number;
  onProgress?: (seconds: number) => void;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastReported = useRef(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (initialSeconds && initialSeconds > 0) {
      const onLoaded = () => {
        if (v.duration && initialSeconds < v.duration - 1) {
          v.currentTime = initialSeconds;
        }
        v.removeEventListener("loadedmetadata", onLoaded);
      };
      v.addEventListener("loadedmetadata", onLoaded);
      return () => v.removeEventListener("loadedmetadata", onLoaded);
    }
  }, [initialSeconds]);

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      controlsList="nodownload"
      className="aspect-video w-full rounded-lg bg-black"
      onTimeUpdate={(e) => {
        const t = Math.floor(e.currentTarget.currentTime);
        if (onProgress && t > 0 && t - lastReported.current >= 5) {
          lastReported.current = t;
          onProgress(t);
        }
      }}
      onEnded={() => {
        onEnded?.();
      }}
    >
      Trình duyệt của bạn không hỗ trợ video HTML5.
    </video>
  );
}
