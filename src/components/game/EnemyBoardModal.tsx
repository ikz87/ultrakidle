import { memo, useEffect, useMemo, useRef, useState } from "react";
import { EnemyIcon } from "./EnemyIcon";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import {
  enemies,
  resolveEnemyOrder,
  type EnemyEntry,
} from "../../lib/enemy_list";
import { useSettings } from "../../context/SettingsContext";

interface EnemyBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  excludedIds: number[];
  onToggleEnemy: (id: number) => void;
  onHighlightAll: () => void;
  onClearAll: () => void;
  lastGuessedEnemies?: number[];
}

// Mouse drags start as soon as the pointer moves a few pixels, touch
// drags need a short hold so the grid can still be scrolled normally.
const MOUSE_DRAG_DISTANCE = 5;
const TOUCH_HOLD_MS = 250;
const TOUCH_SCROLL_DISTANCE = 10;
const CLICK_SUPPRESS_MS = 250;

interface PressState {
  id: number;
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  dragging: boolean;
  timer: number | null;
  element: HTMLElement | null;
}

const EnemyGridItem = memo(
  ({
    enemy,
    isExcluded,
    isDragging,
    isDropTarget,
    onToggle,
    onPointerDown,
  }: {
    enemy: EnemyEntry;
    isExcluded: boolean;
    isDragging: boolean;
    isDropTarget: boolean;
    onToggle: (id: number) => void;
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>, id: number) => void;
  }) => (
    <button
      data-enemy-id={enemy.id}
      onPointerDown={(e) => onPointerDown(e, enemy.id)}
      onClick={() => onToggle(enemy.id)}
      className={`relative flex flex-col items-center group transition-all duration-100 select-none touch-manipulation [-webkit-touch-callout:none] cursor-pointer ${
        isDragging ? "opacity-30 scale-95" : ""
      }`}
    >
      <div
        className={`relative p-1 border transition-all duration-75 ${
          isDropTarget
            ? "border-indigo-400 bg-indigo-500/20"
            : isDragging
              ? "border-indigo-400"
              : isExcluded
                ? "border-red-500/40"
                : "border-white/10 group-hover:border-white/40"
        }`}
      >
        <div className={isExcluded ? "grayscale opacity-30" : ""}>
          <EnemyIcon
            enemyId={enemy.id}
            icons={enemy.icon}
            size={48}
            isSpawn={enemy.id === 69}
          />
        </div>
        {isExcluded && (
          <div className="absolute inset-0 pointer-events-none before:content-[''] before:absolute before:top-1/2 before:left-0 before:w-full before:h-[2px] before:bg-red-600 before:-rotate-45 after:content-[''] after:absolute after:top-1/2 after:left-0 after:w-full after:h-[2px] after:bg-red-600 after:rotate-45" />
        )}
      </div>
    </button>
  )
);

EnemyGridItem.displayName = "EnemyGridItem";

export const EnemyBoardModal = ({
  isOpen,
  onClose,
  excludedIds,
  onToggleEnemy,
  onHighlightAll,
  onClearAll,
  lastGuessedEnemies = [],
}: EnemyBoardModalProps) => {
  const { settings, updateSettings } = useSettings();

  const orderedEnemies = useMemo(
    () => resolveEnemyOrder(settings.journalOrder),
    [settings.journalOrder],
  );

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const pressRef = useRef<PressState | null>(null);
  const overRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const suppressTimeoutRef = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  const clearPress = () => {
    const press = pressRef.current;
    if (press?.timer != null) window.clearTimeout(press.timer);
    pressRef.current = null;
  };

  const startDragging = () => {
    const press = pressRef.current;
    if (!press || press.dragging) return;

    press.dragging = true;
    if (press.timer != null) {
      window.clearTimeout(press.timer);
      press.timer = null;
    }

    try {
      press.element?.setPointerCapture(press.pointerId);
    } catch {
      // pointer capture is best effort
    }

    overRef.current = press.id;
    setDraggedId(press.id);
    setOverId(press.id);
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    id: number,
  ) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    clearPress();
    pointerRef.current = { x: e.clientX, y: e.clientY };
    pressRef.current = {
      id,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      element: e.currentTarget,
      timer:
        e.pointerType === "mouse"
          ? null
          : window.setTimeout(startDragging, TOUCH_HOLD_MS),
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const press = pressRef.current;
    if (!press) return;

    pointerRef.current = { x: e.clientX, y: e.clientY };

    if (!press.dragging) {
      const distance = Math.hypot(
        e.clientX - press.startX,
        e.clientY - press.startY,
      );

      if (press.pointerType === "mouse") {
        if (distance <= MOUSE_DRAG_DISTANCE) return;
        startDragging();
      } else if (distance > TOUCH_SCROLL_DISTANCE) {
        // The user is scrolling, not dragging.
        clearPress();
        return;
      } else {
        return;
      }
    }

    updateDropTarget();
  };

  const updateDropTarget = () => {
    const pointer = pointerRef.current;
    if (!pointer) return;

    const target = document
      .elementFromPoint(pointer.x, pointer.y)
      ?.closest<HTMLElement>("[data-enemy-id]");
    const id = target ? Number(target.dataset.enemyId) : null;

    if (id != null && id !== overRef.current) {
      overRef.current = id;
      setOverId(id);
    }
  };

  const moveEnemy = (fromId: number, toId: number) => {
    const ids = orderedEnemies.map((enemy) => enemy.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from === -1 || to === -1 || from === to) return;

    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    updateSettings({ journalOrder: ids });
  };

  const finishDrag = (apply: boolean) => {
    const press = pressRef.current;
    clearPress();

    if (!press?.dragging) {
      setDraggedId(null);
      setOverId(null);
      overRef.current = null;
      return;
    }

    // Block the click that would otherwise toggle the enemy we just moved.
    suppressClickRef.current = true;
    if (suppressTimeoutRef.current != null)
      window.clearTimeout(suppressTimeoutRef.current);
    suppressTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
    }, CLICK_SUPPRESS_MS);

    const from = press.id;
    const to = overRef.current;

    setDraggedId(null);
    setOverId(null);
    overRef.current = null;
    pointerRef.current = null;

    if (apply && to != null && to !== from) moveEnemy(from, to);
  };

  const handleToggle = (id: number) => {
    if (suppressClickRef.current) return;
    onToggleEnemy(id);
  };

  const resetOrder = () => updateSettings({ journalOrder: [] });
  const hasCustomOrder = (settings.journalOrder?.length ?? 0) > 0;

  // Prevent the page from scrolling while an enemy is being dragged on touch
  // and auto-scroll the grid when the pointer hovers close to its edges.
  useEffect(() => {
    if (draggedId == null) return;

    const blockScroll = (e: TouchEvent) => e.preventDefault();
    window.addEventListener("touchmove", blockScroll, { passive: false });

    let frame = 0;
    const EDGE = 48;
    const MAX_SPEED = 18;

    const scrollNearEdges = () => {
      const grid = gridRef.current;
      const pointer = pointerRef.current;

      if (grid && pointer) {
        const rect = grid.getBoundingClientRect();
        const speed = (distance: number) =>
          Math.ceil(MAX_SPEED * (1 - distance / EDGE)) + 2;

        if (pointer.y < rect.top + EDGE && pointer.y > rect.top - EDGE) {
          grid.scrollTop -= speed(Math.max(0, pointer.y - rect.top));
        } else if (
          pointer.y > rect.bottom - EDGE &&
          pointer.y < rect.bottom + EDGE
        ) {
          grid.scrollTop += speed(Math.max(0, rect.bottom - pointer.y));
        }
        updateDropTarget();
      }

      frame = requestAnimationFrame(scrollNearEdges);
    };

    frame = requestAnimationFrame(scrollNearEdges);

    return () => {
      window.removeEventListener("touchmove", blockScroll);
      cancelAnimationFrame(frame);
    };
  }, [draggedId]);

  useEffect(() => {
    return () => {
      const press = pressRef.current;
      if (press?.timer != null) window.clearTimeout(press.timer);
      pressRef.current = null;
      if (suppressTimeoutRef.current != null)
        window.clearTimeout(suppressTimeoutRef.current);
    };
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="JOURNAL"
      maxWidth="max-w-4xl"
      showFooterButton={false}
    >
      <div className="flex flex-col gap-4 overflow-hidden max-h-[60vh]">
        <div className="flex flex-col gap-4 sticky top-0 bg-black z-20 pb-2 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onHighlightAll}>
              Highlight All
            </Button>
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Cross All
            </Button>
            {hasCustomOrder && (
              <Button variant="outline" size="sm" onClick={resetOrder}>
                Reset Order
              </Button>
            )}
            <span className="ml-auto hidden sm:block text-[10px] uppercase tracking-widest text-white/30">
              drag icons to reorder
            </span>
          </div>

          {lastGuessedEnemies.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
                last 4 round guesses
              </p>
              <div className="flex flex-wrap gap-1.5">
                {lastGuessedEnemies.map((id, index) => {
                  const enemy = enemies.find((e) => e.id === id);
                  if (!enemy) return null;
                  return (
                    <div
                      key={`${id}-${index}`}
                      className="p-0.5 border border-white/5 opacity-50 transition-all bg-white/10"
                    >
                      <EnemyIcon
                        enemyId={enemy.id}
                        icons={enemy.icon}
                        size={24}
                        isSpawn={enemy.id === 69}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          ref={gridRef}
          onPointerMove={handlePointerMove}
          onPointerUp={() => finishDrag(true)}
          onPointerCancel={() => finishDrag(false)}
          // Native image drag would cancel the pointer events we rely on.
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => {
            if (draggedId != null) e.preventDefault();
          }}
          className={`grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto max-h-[60vh] pr-2 pb-4 ${
            draggedId != null ? "select-none" : ""
          }`}
        >
          {orderedEnemies.map((enemy) => (
            <EnemyGridItem
              key={enemy.id}
              enemy={enemy}
              isExcluded={excludedIds.includes(enemy.id)}
              isDragging={draggedId === enemy.id}
              isDropTarget={
                draggedId != null &&
                overId === enemy.id &&
                draggedId !== enemy.id
              }
              onToggle={handleToggle}
              onPointerDown={handlePointerDown}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};
