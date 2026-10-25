import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { enemies } from "../lib/enemy_list";

type Enemy = (typeof enemies)[number];

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface BoxGroup extends Box {
  overlays: Box[];
}

type ImageBoxes = BoxGroup[];
type EnemyBoxes = ImageBoxes[];
type BoxSets = Record<string, EnemyBoxes>;
type BoxStore = Record<number, BoxSets>;

type LayerKind = "box" | "overlay";

type Selection =
  | { kind: "box"; index: number }
  | { kind: "overlay"; parentIndex: number; index: number };

type Drag =
  | {
      mode: "create";
      layer: LayerKind;
      parentIndex: number | null;
      start: { x: number; y: number };
    }
  | {
      mode: "move" | "resize";
      selection: Selection;
      start: { x: number; y: number };
      box: Box;
    }
  | { mode: "rotate"; selection: Selection; box: Box };

const STORAGE_KEY = "ultrakidle-bounding-boxes-v2";
const SETS_STORAGE_KEY = "ultrakidle-bounding-box-sets-v1";
const LEGACY_STORAGE_KEYS = [
  "ultrakidle-bounding-boxes-v1",
  "ultrakidle-head-boxes-v1",
];
const DEFAULT_SET_NAME = "default";
const MIN_BOX = 0.015;
const PREVIEW_SIZE = 220;
const EDITOR_MAX_WIDTH = 360;
const EDITOR_MAX_HEIGHT = 420;
const TRIANGLE_CLIPS = [
  "polygon(0 0, 100% 0, 0 100%)",
  "polygon(100% 0, 100% 100%, 0 100%)",
];

const roundTo = (value: number) => Math.round(value * 10000) / 10000;

const normalizeRotation = (degrees: number) => {
  const value = degrees % 360;
  return value < 0 ? value + 360 : value;
};

const roundBox = (box: Box): Box => ({
  x: roundTo(box.x),
  y: roundTo(box.y),
  width: roundTo(box.width),
  height: roundTo(box.height),
  rotation: roundTo(normalizeRotation(box.rotation)),
});

const roundBoxGroup = (box: BoxGroup): BoxGroup => ({
  ...roundBox(box),
  overlays: box.overlays.map(roundBox),
});

const boxFromPoints = (
  start: { x: number; y: number },
  end: { x: number; y: number },
): Box => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y),
  rotation: 0,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isBox = (value: unknown): value is Box =>
  isRecord(value) &&
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.width === "number" &&
  typeof value.height === "number";

const sanitizeBox = (box: Box): Box => {
  const x = Number.isFinite(box.x) ? box.x : 0;
  const y = Number.isFinite(box.y) ? box.y : 0;

  return {
    x,
    y,
    width: Number.isFinite(box.width)
      ? Math.max(box.width, MIN_BOX)
      : MIN_BOX,
    height: Number.isFinite(box.height)
      ? Math.max(box.height, MIN_BOX)
      : MIN_BOX,
    rotation: normalizeRotation(
      typeof box.rotation === "number" ? box.rotation : 0,
    ),
  };
};

const getOverlays = (value: Box): Box[] => {
  if (!isRecord(value)) return [];

  const overlays = Array.isArray(value.overlays)
    ? value.overlays
    : value.masks;

  if (!Array.isArray(overlays)) return [];
  return overlays.filter(isBox).map(sanitizeBox);
};

const sanitizeBoxGroup = (value: unknown): BoxGroup | null => {
  if (!isBox(value)) return null;

  return {
    ...sanitizeBox(value),
    overlays: getOverlays(value),
  };
};

const parseImageBoxes = (value: unknown): ImageBoxes => {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeBoxGroup)
    .filter((box): box is BoxGroup => box !== null);
};

const hasBoxes = (images: EnemyBoxes) =>
  images.some((imageBoxes) => imageBoxes.length > 0);

const parseSetValue = (value: unknown): EnemyBoxes | null => {
  if (!Array.isArray(value)) return null;

  const images = value.map(parseImageBoxes);
  return hasBoxes(images) ? images : null;
};

const parseEnemySets = (entry: unknown): BoxSets => {
  const sets: BoxSets = {};

  if (isRecord(entry) && isRecord(entry.sets)) {
    for (const [name, setValue] of Object.entries(entry.sets)) {
      const images = parseSetValue(setValue);
      if (images) sets[name] = images;
    }
    return sets;
  }

  if (
    isRecord(entry) &&
    (Array.isArray(entry.boxes) || Array.isArray(entry.headBoxes))
  ) {
    const rawBoxes = Array.isArray(entry.boxes)
      ? entry.boxes
      : entry.headBoxes;
    const images = parseSetValue(rawBoxes);
    if (images) sets[DEFAULT_SET_NAME] = images;
    return sets;
  }

  if (Array.isArray(entry)) {
    const images = parseSetValue(entry);
    if (images) sets[DEFAULT_SET_NAME] = images;
    return sets;
  }

  if (isRecord(entry)) {
    for (const [name, setValue] of Object.entries(entry)) {
      const images = parseSetValue(setValue);
      if (images) sets[name] = images;
    }
  }

  return sets;
};

const parseStore = (value: unknown): BoxStore => {
  if (!isRecord(value)) return {};

  const store: BoxStore = {};

  for (const [key, entry] of Object.entries(value)) {
    const id = Number(key);
    if (!Number.isFinite(id)) continue;

    const sets = parseEnemySets(entry);
    if (Object.keys(sets).length > 0) {
      store[id] = sets;
    }
  }

  return store;
};

const readStore = (): BoxStore => {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = parseStore(JSON.parse(current));
      if (Object.keys(parsed).length > 0) return parsed;
    }

    for (const key of LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = parseStore(JSON.parse(raw));
      if (Object.keys(parsed).length > 0) return parsed;
    }

    return {};
  } catch {
    return {};
  }
};

const readSetNames = (): string[] => {
  try {
    const raw = localStorage.getItem(SETS_STORAGE_KEY);
    if (!raw) return [DEFAULT_SET_NAME];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [DEFAULT_SET_NAME];

    const names = parsed.filter(
      (name): name is string =>
        typeof name === "string" && name.trim().length > 0,
    );

    return names.length > 0
      ? Array.from(new Set(names.map((name) => name.trim())))
      : [DEFAULT_SET_NAME];
  } catch {
    return [DEFAULT_SET_NAME];
  }
};

const getInheritanceSource = (enemy: Enemy): Enemy | undefined =>
  enemy.inheritsFrom != null
    ? enemies.find((candidate) => candidate.id === enemy.inheritsFrom)
    : undefined;

const getOwnEnemyBoxes = (
  store: BoxStore,
  enemy: Enemy,
  setName: string,
): EnemyBoxes =>
  enemy.icon.map((_, index) => store[enemy.id]?.[setName]?.[index] ?? []);

const hasOwnBoxes = (store: BoxStore, enemy: Enemy, setName: string) =>
  hasBoxes(getOwnEnemyBoxes(store, enemy, setName));

const getEnemyBoxes = (
  store: BoxStore,
  enemy: Enemy,
  setName: string,
): EnemyBoxes => {
  const ownBoxes = getOwnEnemyBoxes(store, enemy, setName);
  const source = getInheritanceSource(enemy);
  if (!source) return ownBoxes;

  const sourceBoxes = getOwnEnemyBoxes(store, source, setName);
  if (!hasBoxes(sourceBoxes)) return ownBoxes;

  return enemy.icon.map((_, index) => {
    const ownImageBoxes = ownBoxes[index] ?? [];
    if (ownImageBoxes.length > 0) return ownImageBoxes;

    const sourceIndex = Math.min(index, sourceBoxes.length - 1);
    return sourceBoxes[sourceIndex] ?? [];
  });
};

const getBoxCount = (store: BoxStore, enemy: Enemy, setName: string) =>
  getEnemyBoxes(store, enemy, setName).reduce(
    (total, imageBoxes) => total + imageBoxes.length,
    0,
  );

const getOverlayCount = (store: BoxStore, enemy: Enemy, setName: string) =>
  getEnemyBoxes(store, enemy, setName).reduce(
    (total, imageBoxes) =>
      total +
      imageBoxes.reduce(
        (overlayTotal, box) => overlayTotal + box.overlays.length,
        0,
      ),
    0,
  );

const buildExport = (store: BoxStore, list: Enemy[]) => {
  const output: Record<
    string,
    { name: string; sets: Record<string, BoxGroup[][]> }
  > = {};

  for (const enemy of list) {
    const enemySets = store[enemy.id];
    if (!enemySets) continue;

    const sets: Record<string, BoxGroup[][]> = {};

    for (const [setName, imageBoxes] of Object.entries(enemySets)) {
      if (!hasBoxes(imageBoxes)) continue;
      sets[setName] = imageBoxes.map((boxes) => boxes.map(roundBoxGroup));
    }

    if (Object.keys(sets).length > 0) {
      output[String(enemy.id)] = { name: enemy.name, sets };
    }
  }

  return JSON.stringify(output, null, 2);
};

function useImageSize(src: string) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

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

function fitSize(size: { width: number; height: number }) {
  const scale = Math.min(
    EDITOR_MAX_WIDTH / size.width,
    EDITOR_MAX_HEIGHT / size.height,
  );

  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

function containRect(
  size: { width: number; height: number },
  frameSize: number,
) {
  const scale = Math.min(frameSize / size.width, frameSize / size.height);
  const width = size.width * scale;
  const height = size.height * scale;

  return {
    x: (frameSize - width) / 2,
    y: (frameSize - height) / 2,
    width,
    height,
  };
}

const panelClass = "border border-white/10 bg-black/30 p-3";
const buttonClass =
  "border border-white/20 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-widest text-white hover:bg-white/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30";

const PreviewLayer = ({
  src,
  index,
  total,
  boxes,
}: {
  src: string;
  index: number;
  total: number;
  boxes: ImageBoxes;
}) => {
  const size = useImageSize(src);
  const rect = size ? containRect(size, PREVIEW_SIZE) : null;

  const renderShape = (
    box: Box,
    key: string,
    stroke: string,
    fill: string,
  ) => {
    if (!rect) return null;

    const x = rect.x + box.x * rect.width;
    const y = rect.y + box.y * rect.height;
    const width = box.width * rect.width;
    const height = box.height * rect.height;

    return (
      <g
        key={key}
        transform={`rotate(${box.rotation} ${x + width / 2} ${y + height / 2})`}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          stroke={stroke}
          strokeWidth={1.5}
        />
      </g>
    );
  };

  return (
    <div
      className="absolute inset-0"
      style={{ clipPath: total > 1 ? TRIANGLE_CLIPS[index] : undefined }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />
      {rect && boxes.length > 0 && (
        <svg
          width={PREVIEW_SIZE}
          height={PREVIEW_SIZE}
          className="pointer-events-none absolute inset-0 overflow-visible"
        >
          {boxes.map((box, boxIndex) =>
            renderShape(
              box,
              `box-${boxIndex}`,
              "#4ade80",
              "rgba(74, 222, 128, 0.18)",
            ),
          )}
          {boxes.flatMap((box, boxIndex) =>
            box.overlays.map((overlay, overlayIndex) =>
              renderShape(
                overlay,
                `overlay-${boxIndex}-${overlayIndex}`,
                "#67e8f9",
                "rgba(103, 232, 249, 0.22)",
              ),
            ),
          )}
        </svg>
      )}
    </div>
  );
};

const SplitPreview = ({ enemy, boxes }: { enemy: Enemy; boxes: EnemyBoxes }) => (
  <div className="flex flex-col gap-2">
    <div
      className="relative border border-white/20 bg-white/10"
      style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
    >
      {enemy.icon.map((src, index) => (
        <PreviewLayer
          key={`${src}-${index}`}
          src={src}
          index={index}
          total={enemy.icon.length}
          boxes={boxes[index] ?? []}
        />
      ))}
    </div>
    <p className="max-w-[220px] text-[10px] leading-relaxed text-white/40">
      Green = boxes. Cyan = overlays re-drawn on top of the attachment. Boxes
      are edited per source image and stored normalized (0-1).
    </p>
  </div>
);

const SourceEditor = ({
  src,
  index,
  total,
  boxes,
  onChange,
}: {
  src: string;
  index: number;
  total: number;
  boxes: ImageBoxes;
  onChange: (boxes: ImageBoxes) => void;
}) => {
  const imageSize = useImageSize(src);
  const displaySize = imageSize ? fitSize(imageSize) : { width: 300, height: 300 };
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<LayerKind>("box");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [draft, setDraft] = useState<Box | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  const selectedBoxIndex =
    selection?.kind === "box"
      ? selection.index
      : selection?.kind === "overlay"
        ? selection.parentIndex
        : null;

  const selectedBox: Box | null =
    selection?.kind === "box"
      ? (boxes[selection.index] ?? null)
      : selection?.kind === "overlay"
        ? (boxes[selection.parentIndex]?.overlays[selection.index] ?? null)
        : null;

  const selectionKey = selection
    ? selection.kind === "box"
      ? `box:${selection.index}`
      : `overlay:${selection.parentIndex}:${selection.index}`
    : null;

  const targetKey = (target: Selection) =>
    target.kind === "box"
      ? `box:${target.index}`
      : `overlay:${target.parentIndex}:${target.index}`;

  const getPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const getRotation = (
    event: ReactPointerEvent<HTMLDivElement>,
    box: Box,
  ) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return box.rotation;

    const centerX = rect.left + (box.x + box.width / 2) * rect.width;
    const centerY = rect.top + (box.y + box.height / 2) * rect.height;
    const angle =
      (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) /
        Math.PI +
      90;

    return normalizeRotation(angle);
  };

  const startCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    wrapperRef.current?.focus();
    wrapperRef.current?.setPointerCapture(event.pointerId);
  };

  const replaceBox = (target: Selection, next: Box) => {
    if (target.kind === "box") {
      onChange(
        boxes.map((box, boxIndex) =>
          boxIndex === target.index ? { ...box, ...next } : box,
        ),
      );
      return;
    }

    onChange(
      boxes.map((box, boxIndex) =>
        boxIndex === target.parentIndex
          ? {
              ...box,
              overlays: box.overlays.map((overlay, overlayIndex) =>
                overlayIndex === target.index ? next : overlay,
              ),
            }
          : box,
      ),
    );
  };

  const beginCreate = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (layer === "overlay" && selectedBoxIndex === null) return;

    event.preventDefault();
    const point = getPoint(event);
    setSelection(null);
    setDraft({ x: point.x, y: point.y, width: 0, height: 0, rotation: 0 });
    setDrag({
      mode: "create",
      layer,
      parentIndex: layer === "overlay" ? selectedBoxIndex : null,
      start: point,
    });
    startCapture(event);
  };

  const beginMove = (
    event: ReactPointerEvent<HTMLDivElement>,
    target: Selection,
    box: Box,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    setSelection(target);
    setDrag({
      mode: "move",
      selection: target,
      start: getPoint(event),
      box,
    });
    startCapture(event);
  };

  const beginResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    target: Selection,
    box: Box,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    setSelection(target);
    setDrag({
      mode: "resize",
      selection: target,
      start: getPoint(event),
      box,
    });
    startCapture(event);
  };

  const beginRotate = (
    event: ReactPointerEvent<HTMLDivElement>,
    target: Selection,
    box: Box,
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    setSelection(target);
    setDrag({
      mode: "rotate",
      selection: target,
      box,
    });
    startCapture(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const point = getPoint(event);

    if (drag.mode === "create") {
      setDraft(boxFromPoints(drag.start, point));
      return;
    }

    if (drag.mode === "move") {
      const deltaX = point.x - drag.start.x;
      const deltaY = point.y - drag.start.y;
      const box = drag.box;

      replaceBox(drag.selection, {
        ...box,
        x: box.x + deltaX,
        y: box.y + deltaY,
      });
      return;
    }

    if (drag.mode === "rotate") {
      replaceBox(drag.selection, {
        ...drag.box,
        rotation: getRotation(event, drag.box),
      });
      return;
    }

    const deltaX = point.x - drag.start.x;
    const deltaY = point.y - drag.start.y;
    const box = drag.box;
    const rect = wrapperRef.current?.getBoundingClientRect();
    const radians = (box.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const pixelDeltaX = rect ? deltaX * rect.width : deltaX;
    const pixelDeltaY = rect ? deltaY * rect.height : deltaY;
    const localDeltaX = pixelDeltaX * cos + pixelDeltaY * sin;
    const localDeltaY = -pixelDeltaX * sin + pixelDeltaY * cos;
    const width = Math.max(
      box.width + (rect ? localDeltaX / rect.width : localDeltaX),
      MIN_BOX,
    );
    const height = Math.max(
      box.height + (rect ? localDeltaY / rect.height : localDeltaY),
      MIN_BOX,
    );

    replaceBox(drag.selection, { ...box, width, height });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;

    if (drag.mode === "create") {
      const box = roundBox(boxFromPoints(drag.start, getPoint(event)));

      if (box.width >= MIN_BOX && box.height >= MIN_BOX) {
        if (drag.layer === "box") {
          onChange([...boxes, { ...box, overlays: [] }]);
          setSelection({ kind: "box", index: boxes.length });
        } else if (drag.parentIndex !== null) {
          const parentIndex = drag.parentIndex;
          const parentBox = boxes[parentIndex];

          if (parentBox) {
            onChange(
              boxes.map((current, currentIndex) =>
                currentIndex === parentIndex
                  ? { ...current, overlays: [...current.overlays, box] }
                  : current,
              ),
            );
            setSelection({
              kind: "overlay",
              parentIndex,
              index: parentBox.overlays.length,
            });
          }
        }
      }

      setDraft(null);
    }

    setDrag(null);
    if (wrapperRef.current?.hasPointerCapture(event.pointerId)) {
      wrapperRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const removeSelection = (target: Selection) => {
    if (target.kind === "box") {
      onChange(boxes.filter((_, boxIndex) => boxIndex !== target.index));
    } else {
      onChange(
        boxes.map((box, boxIndex) =>
          boxIndex === target.parentIndex
            ? {
                ...box,
                overlays: box.overlays.filter(
                  (_, overlayIndex) => overlayIndex !== target.index,
                ),
              }
            : box,
        ),
      );
    }

    setSelection(null);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!selection) return;
    if (event.key !== "Delete" && event.key !== "Backspace") return;

    event.preventDefault();
    removeSelection(selection);
  };

  const selectLayer = (next: LayerKind) => {
    if (next === "overlay" && selection === null && boxes.length > 0) {
      setSelection({ kind: "box", index: boxes.length - 1 });
    }
    setLayer(next);
  };

  const renderBox = (
    box: Box,
    target: Selection,
    key: string,
    label: string,
    isMask: boolean,
  ) => {
    const isSelected = selectionKey === targetKey(target);

    return (
      <div
        key={key}
        onPointerDown={(event) => beginMove(event, target, box)}
        className={`absolute cursor-move border-2 ${
          isSelected
            ? "z-40 border-white bg-white/15"
            : isMask
              ? "z-30 border-cyan-300 bg-cyan-300/10"
              : "z-10 border-green-400 bg-green-400/10"
        }`}
        style={{
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
          transform: `rotate(${box.rotation}deg)`,
        }}
      >
        <span className="pointer-events-none absolute -top-[18px] left-0 whitespace-nowrap bg-black/80 px-1 text-[9px] text-white/70">
          {label}
        </span>
        <div
          onPointerDown={(event) => beginRotate(event, target, box)}
          title={`Rotate ${label}`}
          className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-[22px] cursor-grab rounded-full border border-black ${
            isMask ? "bg-cyan-300" : "bg-yellow-300"
          }`}
        />
        <div
          onPointerDown={(event) => beginResize(event, target, box)}
          className={`absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize border border-black ${
            isMask ? "bg-cyan-300" : "bg-white"
          }`}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-white/50">
        <span>
          IMAGE {index + 1} / {total}
        </span>
        <span className="text-white/30">
          {imageSize ? `${imageSize.width}×${imageSize.height}` : "LOADING..."}
        </span>
      </div>

      <div className="mb-1 flex flex-wrap items-center gap-1 text-[9px] uppercase tracking-widest">
        <span className="mr-1 text-white/30">DRAW</span>
        <button
          type="button"
          onClick={() => selectLayer("box")}
          className={`cursor-pointer border px-1.5 py-0.5 ${
            layer === "box"
              ? "border-green-400 bg-green-400/15 text-green-300"
              : "border-white/10 text-white/40 hover:border-white/40"
          }`}
        >
          BOXES ({boxes.length})
        </button>
        <button
          type="button"
          onClick={() => selectLayer("overlay")}
          disabled={selectedBoxIndex === null && boxes.length === 0}
          className={`cursor-pointer border px-1.5 py-0.5 disabled:cursor-not-allowed disabled:opacity-30 ${
            layer === "overlay"
              ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
              : "border-white/10 text-white/40 hover:border-white/40"
          }`}
        >
          OVERLAY
          {selectedBoxIndex !== null
            ? ` (${boxes[selectedBoxIndex]?.overlays.length ?? 0})`
            : ""}
        </button>
        {layer === "overlay" && selectedBoxIndex === null && (
          <span className="text-white/30">select a box first</span>
        )}
      </div>

      <div
        ref={wrapperRef}
        tabIndex={0}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative touch-none select-none overflow-visible border border-white/20 bg-[#101010] outline-none focus:border-white/50"
        style={{ width: displaySize.width, height: displaySize.height }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />

        <div
          onPointerDown={beginCreate}
          className={`absolute inset-0 z-0 ${
            layer === "overlay" && selectedBoxIndex === null
              ? "cursor-not-allowed"
              : "cursor-crosshair"
          }`}
        />

        {boxes.map((box, boxIndex) =>
          renderBox(
            box,
            { kind: "box", index: boxIndex },
            `box-${boxIndex}`,
            `#${boxIndex + 1}`,
            false,
          ),
        )}

        {boxes.flatMap((box, boxIndex) =>
          box.overlays.map((overlay, overlayIndex) =>
            renderBox(
              overlay,
              { kind: "overlay", parentIndex: boxIndex, index: overlayIndex },
              `overlay-${boxIndex}-${overlayIndex}`,
              `O${boxIndex + 1}.${overlayIndex + 1}`,
              true,
            ),
          ),
        )}

        {draft && (
          <div
            className={`pointer-events-none absolute z-50 border-2 border-dashed ${
              layer === "overlay"
                ? "border-cyan-300 bg-cyan-300/10"
                : "border-yellow-300 bg-yellow-300/10"
            }`}
            style={{
              left: `${draft.x * 100}%`,
              top: `${draft.y * 100}%`,
              width: `${draft.width * 100}%`,
              height: `${draft.height * 100}%`,
            }}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {boxes.map((box, boxIndex) => (
          <button
            key={`box-chip-${boxIndex}`}
            type="button"
            onClick={() => {
              setSelection({ kind: "box", index: boxIndex });
              setLayer("box");
            }}
            className={`cursor-pointer border px-1.5 py-0.5 text-[9px] ${
              selectionKey === `box:${boxIndex}`
                ? "border-white bg-white/20 text-white"
                : "border-white/10 text-white/60 hover:border-white/40"
            }`}
          >
            #{boxIndex + 1}{" "}
            <span className="text-white/30">
              {roundTo(box.x)}, {roundTo(box.y)}, {roundTo(box.width)},{" "}
              {roundTo(box.height)} @ {Math.round(box.rotation)}°
              {box.overlays.length > 0 ? ` +${box.overlays.length}o` : ""}
            </span>
          </button>
        ))}

        {boxes.flatMap((box, boxIndex) =>
          box.overlays.map((overlay, overlayIndex) => (
            <button
              key={`overlay-chip-${boxIndex}-${overlayIndex}`}
              type="button"
              onClick={() => {
                setSelection({
                  kind: "overlay",
                  parentIndex: boxIndex,
                  index: overlayIndex,
                });
                setLayer("overlay");
              }}
              className={`cursor-pointer border px-1.5 py-0.5 text-[9px] ${
                selectionKey === `overlay:${boxIndex}:${overlayIndex}`
                  ? "border-white bg-white/20 text-white"
                  : "border-cyan-300/20 text-cyan-200/70 hover:border-cyan-300/60"
              }`}
            >
              O{boxIndex + 1}.{overlayIndex + 1}{" "}
              <span className="text-white/30">
                {roundTo(overlay.x)}, {roundTo(overlay.y)}, {roundTo(overlay.width)},{" "}
                {roundTo(overlay.height)} @ {Math.round(overlay.rotation)}°
              </span>
            </button>
          )),
        )}

        {selection && selectedBox && (
          <label className="flex items-center gap-1 border border-white/10 px-1.5 py-0.5 text-[9px] text-white/50">
            ROT°
            <input
              type="number"
              step={1}
              value={Math.round(selectedBox.rotation)}
              onChange={(event) => {
                const rotation = Number(event.target.value);
                replaceBox(selection, {
                  ...selectedBox,
                  rotation: normalizeRotation(
                    Number.isFinite(rotation) ? rotation : 0,
                  ),
                });
              }}
              className="w-14 border border-white/20 bg-black px-1 py-0.5 text-[9px] text-white outline-none focus:border-white/60"
            />
          </label>
        )}

        {selection && (
          <button
            type="button"
            onClick={() => removeSelection(selection)}
            className="cursor-pointer border border-red-400/40 px-1.5 py-0.5 text-[9px] text-red-300 hover:bg-red-400/10"
          >
            DELETE{" "}
            {selection.kind === "box"
              ? `#${selection.index + 1}`
              : `O${selection.parentIndex + 1}.${selection.index + 1}`}
          </button>
        )}

        {boxes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (layer === "overlay" && selectedBoxIndex !== null) {
                onChange(
                  boxes.map((box, boxIndex) =>
                    boxIndex === selectedBoxIndex
                      ? { ...box, overlays: [] }
                      : box,
                  ),
                );
                setSelection({ kind: "box", index: selectedBoxIndex });
              } else {
                onChange([]);
                setSelection(null);
              }
            }}
            className="cursor-pointer border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-white/40"
          >
            {layer === "overlay" && selectedBoxIndex !== null
              ? "CLEAR OVERLAYS"
              : "CLEAR ALL"}
          </button>
        )}
      </div>
    </div>
  );
};

const BoundingBoxesPage = () => {
  const sortedEnemies = useMemo(
    () => [...enemies].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const [store, setStore] = useState<BoxStore>(readStore);
  const [setNames, setSetNames] = useState<string[]>(readSetNames);
  const [activeSet, setActiveSet] = useState<string>(
    () => readSetNames()[0] ?? DEFAULT_SET_NAME,
  );
  const [newSetName, setNewSetName] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify(setNames));
  }, [setNames]);

  const availableSets = useMemo(() => {
    const names = new Set(setNames);
    for (const sets of Object.values(store)) {
      for (const name of Object.keys(sets)) names.add(name);
    }
    return Array.from(names);
  }, [setNames, store]);

  const currentSet = availableSets.includes(activeSet)
    ? activeSet
    : (availableSets[0] ?? DEFAULT_SET_NAME);

  const exported = useMemo(
    () => buildExport(store, sortedEnemies),
    [store, sortedEnemies],
  );

  const doneCount = sortedEnemies.filter(
    (enemy) => getBoxCount(store, enemy, currentSet) > 0,
  ).length;

  const selectedEnemy =
    sortedEnemies.find((enemy) => enemy.id === selectedId) ?? sortedEnemies[0];

  const selectedBoxes = selectedEnemy
    ? getEnemyBoxes(store, selectedEnemy, currentSet)
    : [];
  const inheritedSource = selectedEnemy
    ? getInheritanceSource(selectedEnemy)
    : undefined;
  const selectedHasOwnBoxes =
    selectedEnemy !== undefined &&
    hasOwnBoxes(store, selectedEnemy, currentSet);

  const filteredEnemies = sortedEnemies.filter((enemy) =>
    enemy.name.toLowerCase().includes(query.toLowerCase()),
  );

  const updateImageBoxes = (
    enemy: Enemy,
    imageIndex: number,
    boxes: ImageBoxes,
  ) => {
    setStore((current) => {
      const currentBoxes = getEnemyBoxes(current, enemy, currentSet);
      const nextBoxes = currentBoxes.map((imageBoxes, index) =>
        index === imageIndex ? boxes : imageBoxes,
      );

      return {
        ...current,
        [enemy.id]: {
          ...(current[enemy.id] ?? {}),
          [currentSet]: nextBoxes,
        },
      };
    });
  };

  const clearEnemy = (enemy: Enemy) => {
    setStore((current) => {
      const enemySets = current[enemy.id];
      if (!enemySets) return current;

      const nextSets = { ...enemySets };
      delete nextSets[currentSet];

      if (Object.keys(nextSets).length === 0) {
        const next = { ...current };
        delete next[enemy.id];
        return next;
      }

      return { ...current, [enemy.id]: nextSets };
    });
  };

  const addSet = () => {
    const name = newSetName.trim();
    if (!name) return;

    setSetNames((current) =>
      current.includes(name) ? current : [...current, name],
    );
    setActiveSet(name);
    setNewSetName("");
  };

  const deleteSet = () => {
    if (
      !window.confirm(
        `Delete set "${currentSet}" and all of its boxes from every enemy?`,
      )
    ) {
      return;
    }

    setStore((current) => {
      const next: BoxStore = {};

      for (const [id, sets] of Object.entries(current)) {
        const rest = { ...sets };
        delete rest[currentSet];
        if (Object.keys(rest).length > 0) next[Number(id)] = rest;
      }

      return next;
    });

    const remaining = availableSets.filter((name) => name !== currentSet);
    const nextNames = remaining.length > 0 ? remaining : [DEFAULT_SET_NAME];
    setSetNames(nextNames);
    setActiveSet(nextNames[0]);
  };

  const moveSet = () => {
    const input = window.prompt(
      `Move "${currentSet}" into which set?`,
      currentSet,
    );
    if (input === null) return;

    const target = input.trim();
    if (!target || target === currentSet) return;

    const targetHasBoxes = Object.values(store).some((sets) =>
      (sets[target] ?? []).some((imageBoxes) => imageBoxes.length > 0),
    );

    if (
      targetHasBoxes &&
      !window.confirm(
        `"${target}" already has boxes. Merge "${currentSet}" into it?`,
      )
    ) {
      return;
    }

    setStore((current) => {
      const next: BoxStore = {};

      for (const [id, sets] of Object.entries(current)) {
        const nextSets = { ...sets };
        const source = nextSets[currentSet];

        if (!source) {
          next[Number(id)] = nextSets;
          continue;
        }

        const existing = nextSets[target] ?? [];
        const length = Math.max(source.length, existing.length);
        nextSets[target] = Array.from({ length }, (_, index) => [
          ...(existing[index] ?? []),
          ...(source[index] ?? []),
        ]);
        delete nextSets[currentSet];
        next[Number(id)] = nextSets;
      }

      return next;
    });

    setSetNames((current) => {
      const next = current.filter((name) => name !== currentSet);
      if (!next.includes(target)) next.push(target);
      return next;
    });
    setActiveSet(target);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(exported);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("Clipboard copy failed. Use Save instead.");
    }
  };

  const downloadJson = () => {
    const blob = new Blob([exported], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "enemy-bounding-boxes.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const nextStore = parseStore(parsed);
      const importedSets = new Set<string>();

      for (const sets of Object.values(nextStore)) {
        for (const name of Object.keys(sets)) importedSets.add(name);
      }

      setStore(nextStore);
      setSetNames((current) =>
        Array.from(new Set([...current, ...importedSets])),
      );

      const firstImported = Array.from(importedSets)[0];
      if (firstImported) setActiveSet(firstImported);
    } catch {
      window.alert("Could not parse that JSON file.");
    }
  };

  const resetAll = () => {
    if (!window.confirm("Clear all bounding box and overlay data?")) return;
    setStore({});
    setSetNames([DEFAULT_SET_NAME]);
    setActiveSet(DEFAULT_SET_NAME);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETS_STORAGE_KEY);
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  };

  const currentIndex = selectedEnemy
    ? sortedEnemies.findIndex((enemy) => enemy.id === selectedEnemy.id)
    : -1;

  const goBy = (delta: number) => {
    if (currentIndex < 0) return;
    const nextIndex =
      (currentIndex + delta + sortedEnemies.length) % sortedEnemies.length;
    setSelectedId(sortedEnemies[nextIndex].id);
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      <aside className="sticky top-0 flex h-screen w-[290px] shrink-0 flex-col border-r border-white/10">
        <div className="border-b border-white/10 p-4">
          <h1 className="text-sm tracking-[0.2em]">BOUNDING_BOX_TOOL</h1>
          <p className="mt-1 text-[10px] leading-relaxed text-white/40">
            Drag on a source image to mark bounding boxes. Use BOX SET to keep
            hats, face masks, etc. separate. Use OVERLAY for parts that should
            be drawn on top of an attachment.
          </p>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="SEARCH..."
            className="mt-3 w-full border border-white/20 bg-black px-2 py-1 text-xs uppercase outline-none focus:border-white/60"
          />

          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-white/40">
              <span>BOX SET</span>
              <span>{availableSets.length}</span>
            </div>
            <div className="mt-1 flex gap-1">
              <select
                value={currentSet}
                onChange={(event) => setActiveSet(event.target.value)}
                className="min-w-0 flex-1 cursor-pointer border border-white/20 bg-black px-1 py-1 text-[11px] text-white outline-none focus:border-white/60"
              >
                {availableSets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={deleteSet}
                className={buttonClass}
                title="Delete current set"
              >
                DEL
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addSet();
              }}
              className="mt-1 flex gap-1"
            >
              <input
                value={newSetName}
                onChange={(event) => setNewSetName(event.target.value)}
                placeholder="NEW SET..."
                className="min-w-0 flex-1 border border-white/20 bg-black px-2 py-1 text-[10px] uppercase outline-none focus:border-white/60"
              />
              <button type="submit" className={buttonClass}>
                ADD
              </button>
            </form>
            <button
              type="button"
              onClick={moveSet}
              className={`${buttonClass} mt-1 w-full`}
              title="Rename this set or merge it into another set"
            >
              RENAME / MOVE
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
            <span>MARKED</span>
            <span>
              {doneCount} / {sortedEnemies.length}
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={copyJson} className={buttonClass}>
              {copied ? "COPIED" : "COPY JSON"}
            </button>
            <button type="button" onClick={downloadJson} className={buttonClass}>
              EXPORT
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <label className={`${buttonClass} flex-1 text-center`}>
              IMPORT
              <input
                type="file"
                accept="application/json"
                onChange={importJson}
                className="hidden"
              />
            </label>
            <button type="button" onClick={resetAll} className={buttonClass}>
              RESET
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEnemies.map((enemy) => {
            const count = getBoxCount(store, enemy, currentSet);
            const overlayCount = getOverlayCount(store, enemy, currentSet);
            const active = selectedEnemy?.id === enemy.id;

            return (
              <button
                key={enemy.id}
                type="button"
                onClick={() => setSelectedId(enemy.id)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 border-b border-white/5 px-4 py-2 text-left text-[11px] ${
                  active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span className="truncate">{enemy.name}</span>
                <span className="shrink-0 text-[10px]">
                  {count > 0 ? (
                    <span className="text-green-400">{count} ✓</span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                  {overlayCount > 0 && (
                    <span className="ml-1 text-cyan-300">{overlayCount}o</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        {selectedEnemy ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg tracking-wider">{selectedEnemy.name}</h2>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                  SET {currentSet} · ID {selectedEnemy.id} ·{" "}
                  {selectedEnemy.icon.length} image
                  {selectedEnemy.icon.length === 1 ? "" : "s"} ·{" "}
                  {getBoxCount(store, selectedEnemy, currentSet)} box
                  {getBoxCount(store, selectedEnemy, currentSet) === 1 ? "" : "es"} ·{" "}
                  {getOverlayCount(store, selectedEnemy, currentSet)} overlay
                  {getOverlayCount(store, selectedEnemy, currentSet) === 1 ? "" : "s"}
                </p>
                {inheritedSource && (
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-cyan-300/70">
                    {selectedHasOwnBoxes ? "Overrides" : "Inherits"} boxes from{" "}
                    {inheritedSource.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goBy(-1)}
                  className={buttonClass}
                >
                  ← PREV
                </button>
                <button
                  type="button"
                  onClick={() => goBy(1)}
                  className={buttonClass}
                >
                  NEXT →
                </button>
                <button
                  type="button"
                  onClick={() => clearEnemy(selectedEnemy)}
                  className={buttonClass}
                >
                  CLEAR SET
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-8 xl:flex-row">
              <section className={`${panelClass} shrink-0`}>
                <h3 className="mb-3 text-[10px] uppercase tracking-widest text-white/40">
                  Icon Preview
                </h3>
                <SplitPreview enemy={selectedEnemy} boxes={selectedBoxes} />
              </section>

              <section className="min-w-0 flex-1">
                <h3 className="mb-3 text-[10px] uppercase tracking-widest text-white/40">
                  Source Images
                </h3>
                <div className="flex flex-wrap gap-8">
                  {selectedEnemy.icon.map((src, index) => (
                    <SourceEditor
                      key={`${selectedEnemy.id}-${currentSet}-${src}-${index}`}
                      src={src}
                      index={index}
                      total={selectedEnemy.icon.length}
                      boxes={selectedBoxes[index] ?? []}
                      onChange={(boxes) =>
                        updateImageBoxes(selectedEnemy, index, boxes)
                      }
                    />
                  ))}
                </div>

                <div className="mt-6 max-w-2xl border-t border-white/10 pt-3 text-[10px] leading-relaxed text-white/40">
                  <p>
                    Drag on an image to create a bounding box. Select a box, switch
                    to OVERLAY, then drag to mark parts that must be re-drawn on top
                    of the attachment. Click any box to select it, drag it to
                    move, use the bottom-right handle to resize, and use the
                    round handle to rotate. With a box selected, press
                    Delete/Backspace.
                  </p>
                  <p className="mt-1">
                    Variants such as Swordsmachine Tundra/Agony and Ferryman
                    Rudraksha/Agonis inherit boxes from their original enemy
                    until you edit them.
                  </p>
                  <p className="mt-1">
                    Each box contains{" "}
                    <span className="text-white/70">
                      &#123; x, y, width, height, rotation, overlays &#125;
                    </span>{" "}
                    in image space (values may go outside 0-1), with rotation in degrees and overlays using
                    the same box format. Export data is keyed by enemy ID, then
                    box-set name.
                  </p>
                </div>
              </section>
            </div>
          </>
        ) : (
          <p className="text-sm text-white/40">No enemies found.</p>
        )}
      </main>
    </div>
  );
};

export default BoundingBoxesPage;
