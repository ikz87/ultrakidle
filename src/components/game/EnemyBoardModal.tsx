import { memo } from "react";
import { EnemyIcon } from "./EnemyIcon";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { enemies } from "../../lib/enemy_list";

interface EnemyBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  excludedIds: number[];
  onToggleEnemy: (id: number) => void;
  onHighlightAll: () => void;
  onClearAll: () => void;
  lastGuessedEnemies?: number[];
}

const EnemyGridItem = memo(
  ({
    enemy,
    isExcluded,
    onToggle,
  }: {
    enemy: (typeof enemies)[0];
    isExcluded: boolean;
    onToggle: (id: number) => void;
  }) => (
    <button
      onClick={() => onToggle(enemy.id)}
      className="relative flex flex-col items-center group transition-transform cursor-pointer"
    >
      <div
        className={`relative p-1 border transition-all duration-75 ${
          isExcluded
            ? "border-red-500/40 grayscale opacity-30"
            : "border-white/10 group-hover:border-white/40"
        }`}
      >
        <EnemyIcon
          icons={enemy.icon}
          size={48}
          isSpawn={enemy.id === 69}
        />
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onHighlightAll}>
              Highlight All
            </Button>
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Cross All
            </Button>
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

        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 overflow-y-auto max-h-[60vh] pr-2 pb-4">
          {enemies.map((enemy) => (
            <EnemyGridItem
              key={enemy.id}
              enemy={enemy}
              isExcluded={excludedIds.includes(enemy.id)}
              onToggle={onToggleEnemy}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};
