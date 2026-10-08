import { useCallback, useEffect, useRef } from "react";

interface DownscaledImageProps {
  src: string;
  alt?: string;
  className?: string;
  draggable?: boolean;
  zoom?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Renders an image into a <canvas> instead of an <img> so we control the
 * downscaling filter.
 *
 * WHY THIS EXISTS
 * Gallery images are user-submitted and stored at a single fixed resolution
 * (1920x1080). Many of them simulate gradients with ordered/dithered patterns
 * whose dots sit at ~1px, i.e. right at the source's Nyquist frequency. When the
 * browser shrinks such an image to fit a container it uses its built-in
 * resampler, which is NOT a true area average. The high-frequency dither then
 * aliases against the output pixel grid and shows up as an ugly diagonal
 * weave / moire — worst at non-integer downscale ratios. (A plain CSS blur or
 * `image-rendering: pixelated/crisp-edges` does NOT fix this: blur runs after
 * the already-aliased rasterization, and pixelated/crisp-edges are *upscaling*
 * hints that use nearest-neighbour and make downscaling worse.)
 *
 * THE FIX
 * Do the reduction ourselves on a canvas and low-pass the source *before*
 * decimation, with a blur radius proportional to the reduction factor. That
 * integrates the dither into flat tone (the way it is meant to be viewed)
 * instead of aliasing it. Radius scales with the ratio, so it only blurs when
 * actually shrinking; when zoomed in (ratio <= 1) no blur is applied and the
 * image stays crisp.
 *
 * CROSS-ORIGIN NOTE
 * Gallery images are served from a CDN without CORS headers, so drawing them
 * taints the canvas. That is fine here: we only ever *draw* the image (and the
 * blurred intermediate) onward and never call getImageData/toBlob, both of which
 * are the only operations a tainted canvas blocks. This also means we cannot do
 * a manual pixel read-back resample — hence the GPU/canvas-filter approach.
 *
 * WHY THE HIDDEN <img>
 * A 1x1, opacity-0 <img> is kept as the real network/decode element. It carries
 * the caller's onLoad/onError (so retry logic keeps working) and is the source
 * we draw from. It is intentionally NOT `display:none` — a rendered (even
 * invisible) element is the reliable path for load/decode across engines.
 */
export const DownscaledImage = ({
  src,
  alt = "",
  className = "",
  draggable,
  zoom = 1,
  onLoad,
  onError,
}: DownscaledImageProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  // Cached full-res prefilter result. The blur is the expensive part (~30ms for a
  // 1920x1080 source), so we keep the last one and only re-blur when the
  // (quantized) radius changes — e.g. repeated draws at the same size, or small
  // zoom steps that stay in the same radius bucket, reuse it.
  const blurCacheRef = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);

  const draw = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete || img.naturalWidth === 0) return;

    let cssW = canvas.clientWidth;
    let cssH = canvas.clientHeight;
    if (!cssW || !cssH) {
      // Before layout settles the canvas can report 0; fall back to its parent.
      const rect = canvas.parentElement?.getBoundingClientRect();
      cssW = rect?.width ?? 0;
      cssH = rect?.height ?? 0;
    }
    if (!cssW || !cssH) return;

    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const dpr = window.devicePixelRatio || 1;

    // Canvas backing-store size, in *device* pixels. Multiplying by zoom means
    // that when the CSS `scale(zoom)` transform magnifies the element, the
    // bitmap has matching extra detail (crisp zoom) instead of being upscaled.
    // Capped at the source size: beyond that there is no more detail to gain.
    const desiredW = Math.min(sw, Math.round(cssW * dpr * Math.max(1, zoom)));
    const desiredH = Math.min(sh, Math.round(cssH * dpr * Math.max(1, zoom)));

    // The drawn image size inside that box (kept separate so non-16:9 sources
    // letterbox rather than stretch).
    const scale = Math.min(desiredW / sw, desiredH / sh);
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));

    if (canvas.width !== desiredW || canvas.height !== desiredH) {
      canvas.width = desiredW;
      canvas.height = desiredH;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Anti-alias prefilter. `ratio` is the reduction factor (1 = no scaling).
    // We only prefilter when actually shrinking; ratio*0.5 gives a radius that
    // grows with the reduction (e.g. ~1.5px at a 3x reduction, which testing on
    // real dithered submissions showed removes the weave without over-softening).
    // Capped at 3px so heavily shrunken thumbnails don't turn to mush.
    //
    // It MUST be applied at full source resolution, before any decimation.
    // Reducing first and then blurring (staging) was measured to reintroduce
    // low-frequency moire, because the browser's pre-blur reduction is not a
    // true area average — so don't "optimize" it that way.
    //
    // `"filter" in ctx` guards engines without canvas filter support — there we
    // skip the blur and fall back to plain high-quality scaling (still correct,
    // just not as clean).
    let source: CanvasImageSource = img;
    const ratio = sw / dw;
    if (ratio > 1 && "filter" in ctx) {
      const radius = Math.min(3, ratio * 0.5);
      // Bucket to 0.25px so tiny zoom deltas reuse the cached blur.
      const qRadius = Math.round(radius * 4) / 4;
      const key = `${sw}x${sh}@${qRadius}`;

      let cache = blurCacheRef.current;
      if (!cache || cache.canvas.width !== sw || cache.canvas.height !== sh) {
        const cacheCanvas = document.createElement("canvas");
        cacheCanvas.width = sw;
        cacheCanvas.height = sh;
        cache = { key: "", canvas: cacheCanvas };
        blurCacheRef.current = cache;
      }

      if (cache.key !== key) {
        const bctx = cache.canvas.getContext("2d");
        if (bctx) {
          bctx.filter = `blur(${qRadius.toFixed(2)}px)`;
          bctx.clearRect(0, 0, sw, sh);
          bctx.drawImage(img, 0, 0);
          cache.key = key;
        }
      }

      source = cache.canvas;
    }

    const dx = Math.round((desiredW - dw) / 2);
    const dy = Math.round((desiredH - dh) / 2);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, desiredW, desiredH);
    ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
  }, [zoom]);

  const scheduleDraw = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      draw();
    });
  }, [draw]);

  useEffect(() => {
    // Source changed (including `_r=` retry URLs): drop the cached blur so we
    // never reuse a blur of the previous image. Depends on `src` only — if it
    // also depended on the draw callback it would clear on every zoom change and
    // defeat the cache.
    blurCacheRef.current = null;
  }, [src]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) scheduleDraw();
  }, [src, scheduleDraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => scheduleDraw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [scheduleDraw]);

  useEffect(() => {
    scheduleDraw();
  }, [zoom, scheduleDraw]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        // Must also clear the ref, not just cancel: in React StrictMode the
        // component mounts, unmounts and remounts. A cancelled-but-still-set
        // frameRef would make every later scheduleDraw() early-return, leaving
        // the canvas permanently blank.
        frameRef.current = null;
      }
    },
    []
  );

  return (
    <>
      <canvas ref={canvasRef} role="img" aria-label={alt} className={`block ${className}`} />
      <img
        ref={imgRef}
        src={src || undefined}
        alt=""
        aria-hidden="true"
        draggable={draggable}
        className="pointer-events-none absolute h-px w-px opacity-0"
        onLoad={() => {
          scheduleDraw();
          onLoad?.();
        }}
        onError={onError}
      />
    </>
  );
};
