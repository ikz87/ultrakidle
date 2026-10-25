import { enemies } from "./enemy_list";
import { STATIC_BOUNDING_BOXES } from "./enemy_boxes";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface BoundingBoxGroup extends BoundingBox {
  overlays: BoundingBox[];
}

export type BoundingBoxSet = BoundingBoxGroup[][];
export type BoundingBoxSets = Record<string, BoundingBoxSet>;
export type BoundingBoxStore = Record<number, BoundingBoxSets>;

export interface BoundingBoxExportEntry {
  name: string;
  sets: BoundingBoxSets;
}

export const HALLOWEEN_SET = "HALLOWEEN";

const DEV_STORAGE_KEY = "ultrakidle-bounding-boxes-v2";

let cachedDevRaw: string | null | undefined;
let cachedDevStore: BoundingBoxStore = {};

const hasBoxes = (set: BoundingBoxSet | undefined) =>
  Boolean(set?.some((imageBoxes) => imageBoxes.length > 0));

const readDevStore = (): BoundingBoxStore => {
  if (!import.meta.env.DEV) return {};

  let raw: string | null = null;

  try {
    raw = localStorage.getItem(DEV_STORAGE_KEY);
  } catch {
    return {};
  }

  if (raw === cachedDevRaw) return cachedDevStore;

  cachedDevRaw = raw;

  if (!raw) {
    cachedDevStore = {};
    return cachedDevStore;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    cachedDevStore =
      typeof parsed === "object" && parsed !== null
        ? (parsed as BoundingBoxStore)
        : {};
  } catch {
    cachedDevStore = {};
  }

  return cachedDevStore;
};

const getStoredSet = (enemyId: number, setName: string): BoundingBoxSet => {
  const devSet = readDevStore()[enemyId]?.[setName];
  if (hasBoxes(devSet)) return devSet ?? [];

  const staticSet = STATIC_BOUNDING_BOXES[String(enemyId)]?.sets[setName];
  if (hasBoxes(staticSet)) return staticSet ?? [];

  return [];
};

export function getBoundingBoxSet(
  enemyId: number,
  setName: string,
  imageCount: number,
): BoundingBoxSet {
  const enemy = enemies.find((candidate) => candidate.id === enemyId);
  if (!enemy) return [];

  const ownSet = getStoredSet(enemyId, setName);
  const sourceSet =
    enemy.inheritsFrom != null
      ? getStoredSet(enemy.inheritsFrom, setName)
      : [];

  return Array.from({ length: imageCount }, (_, index) => {
    const ownImageBoxes = ownSet[index] ?? [];
    if (ownImageBoxes.length > 0) return ownImageBoxes;

    const sourceIndex = Math.min(index, sourceSet.length - 1);
    return sourceSet[sourceIndex] ?? [];
  });
}
