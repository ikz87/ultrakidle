import { useEffect, useState } from "react";

export interface ImageSize {
  width: number;
  height: number;
}

export function useImageSize(src: string): ImageSize | null {
  const [size, setSize] = useState<ImageSize | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (!cancelled) {
        setSize({ width: image.naturalWidth, height: image.naturalHeight });
      }
    };
    image.onerror = () => {
      if (!cancelled) setSize(null);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return size;
}
