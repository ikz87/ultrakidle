import type { ReactNode } from "react";
import { enemies } from "../../lib/enemy_list";
import { EnemyIcon } from "./EnemyIcon";
import { useSettings } from "../../context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import Tooltip from "../ui/Tooltip";

export interface GuessResult {
  guess_id?: number;
  enemy_name: string;
  correct: boolean;
  correct_id?: number;
  is_penance?: boolean;
  properties: {
    enemy_type: {
      value: string;
      result: "correct" | "incorrect" | null;
    };
    weight_class: {
      value: string;
      result: "correct" | "incorrect" | null;
    };
    health: {
      value: number;
      result: "correct" | "higher" | "lower" | null;
      color?: "green" | "yellow" | "red";
    };
    level_count: {
      value: number;
      result: "correct" | "higher" | "lower" | null;
      color?: "green" | "yellow" | "red";
    };
    appearance: {
      value: string;
      result: "correct" | "incorrect" | "later" | "earlier" | null;
      color?: "green" | "yellow" | "red";
    };
  };
}

interface GuessBoardProps {
  guesses: GuessResult[];
  modifiers?: string[];
}

const BADGE_TOOLTIPS: Record<string, string> = {
  P: "PENANCE: Automatically selected wrong guess",
  F: "FALSIFIER: This hint's arrow might be flipped",
  E: "ECLIPSE: This column is completely obscured for this round",
};

const isEclipsed = (prop: { result: any }): boolean =>
  prop.result === null;

const hasValue = (val: any): boolean =>
  val !== undefined && val !== null && val !== "";

const getResultColorClass = (
  result: string | null,
  color?: "green" | "yellow" | "red",
  colorblindMode?: boolean,
) => {
  if (result === "gray" || result === null || result === undefined)
    return "bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50";

  if (color) {
    if (color === "green")
      return "bg-green-600/20 border-green-500 text-green-500";
    if (color === "yellow") {
      return colorblindMode
        ? "bg-blue-600/20 border-blue-500 text-blue-500"
        : "bg-yellow-600/20 border-yellow-500 text-yellow-500";
    }
    return "bg-red-600/20 border-red-500 text-red-500";
  }

  return result === "correct"
    ? "bg-green-600/20 border-green-500 text-green-500"
    : "bg-red-600/20 border-red-500 text-red-500";
};

const StatusIcon = ({
  result,
  color,
  enabled,
}: {
  result: string | null;
  color?: "green" | "yellow" | "red";
  enabled: boolean;
}) => {
  if (!enabled) return null;
  let icon = "⨯";
  if (color === "green" || result === "correct") icon = "✓";
  else if (color === "yellow") icon = "ǃ";
  return <span className="mr-1.5 opacity-80 font-bold">{icon}</span>;
};

const ModifierBadge = ({
  label,
  className,
}: {
  label: string;
  className: string;
}) => (
  <span
    className={`size-4 inline-flex items-center justify-center text-[9px] font-bold border rounded shrink-0 ${className}`}
  >
    {label}
  </span>
);

const CellTooltip = ({
  tooltip,
  children,
}: {
  tooltip?: string;
  children: ReactNode;
}) => {
  if (!tooltip) return <>{children}</>;
  return (
    <Tooltip content={tooltip} wrapperClassName="w-full h-full">
      <div className="w-full h-full cursor-help">{children}</div>
    </Tooltip>
  );
};

const FALSIFIER_COLUMNS = new Set([
  "health",
  "level_count",
  "appearance",
]);

export const GuessBoard = ({
  guesses,
  modifiers = [],
}: GuessBoardProps) => {
  const { colorblindMode } = useSettings();

  const hasFalsifier = modifiers.includes("FALSIFIER");
  const hasEclipse = modifiers.includes("ECLIPSE");

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm text-left uppercase border-collapse">
        <thead className="text-xs text-white/50 bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-4 py-3">Enemy</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Weight</th>
            <th className="px-4 py-3">Health</th>
            <th className="px-4 py-3">Total Levels</th>
            <th className="px-4 py-3">Registered at</th>
          </tr>
        </thead>
        <tbody className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {guesses.map((guess, idx) => {
              const enemy = enemies.find(
                (e) => e.name === guess.enemy_name,
              );
              const isPenance = !!guess.is_penance;

              const eclipsedType =
                hasEclipse &&
                isEclipsed(guess.properties.enemy_type);
              const eclipsedWeight =
                hasEclipse &&
                isEclipsed(guess.properties.weight_class);

              const showFalsifier =
                hasFalsifier && !guess.correct;

              const falsifierHealth =
                showFalsifier &&
                FALSIFIER_COLUMNS.has("health") &&
                guess.properties.health.result !== "correct";
              const falsifierLevels =
                showFalsifier &&
                FALSIFIER_COLUMNS.has("level_count") &&
                guess.properties.level_count.result !== "correct";
              const falsifierAppearance =
                showFalsifier &&
                FALSIFIER_COLUMNS.has("appearance") &&
                guess.properties.appearance.result !== "correct";

              return (
                <motion.tr
                  key={guess.guess_id || idx}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className={`border-b border-white/5 last:border-0 hover:bg-white/5 ${isPenance ? "bg-amber-500/5" : ""
                    }`}
                >
                  {/* Enemy Name */}
                  <td
                    className={`border-l-4 ${isPenance
                        ? "border-l-amber-400"
                        : "border-black/50"
                      } ${getResultColorClass(
                        guess.correct ? "correct" : "incorrect",
                        undefined,
                        colorblindMode,
                      )}`}
                  >
                    <CellTooltip
                      tooltip={
                        isPenance ? BADGE_TOOLTIPS["P"] : undefined
                      }
                    >
                      <div className="flex items-center gap-3 px-4 py-4 font-bold max-w-[200px]">
                        {enemy && (
                          <EnemyIcon
                            icons={enemy.icon}
                            size={32}
                            className="shrink-0"
                          />
                        )}
                        <div className="flex items-center truncate">
                          <StatusIcon
                            result={
                              guess.correct
                                ? "correct"
                                : "incorrect"
                            }
                            enabled={colorblindMode}
                          />
                          <span className="truncate">
                            {guess.enemy_name}
                          </span>
                        </div>
                        {isPenance && (
                          <ModifierBadge
                            label="P"
                            className="ml-auto border-amber-400/50 text-amber-400"
                          />
                        )}
                      </div>
                    </CellTooltip>
                  </td>

                  {/* Enemy Type */}
                  <td
                    className={`border-l-4 border-black/50 ${eclipsedType
                        ? "bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50"
                        : getResultColorClass(
                          hasValue(
                            guess.properties.enemy_type.value,
                          )
                            ? guess.properties.enemy_type.result
                            : "gray",
                          undefined,
                          colorblindMode,
                        )
                      }`}
                  >
                    <CellTooltip
                      tooltip={
                        eclipsedType
                          ? BADGE_TOOLTIPS["E"]
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2 px-4 py-4 font-bold">
                        {eclipsedType && (
                          <ModifierBadge
                            label="E"
                            className="border-zinc-500/50 text-zinc-500"
                          />
                        )}
                        {!eclipsedType && (
                          <StatusIcon
                            result={
                              guess.properties.enemy_type.result
                            }
                            enabled={
                              colorblindMode &&
                              hasValue(
                                guess.properties.enemy_type.value,
                              )
                            }
                          />
                        )}
                        {hasValue(
                          guess.properties.enemy_type.value,
                        )
                          ? guess.properties.enemy_type.value
                          : "[ECLIPSED]"}
                      </div>
                    </CellTooltip>
                  </td>

                  {/* Weight Class */}
                  <td
                    className={`border-l-4 border-black/50 ${eclipsedWeight
                        ? "bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50"
                        : getResultColorClass(
                          hasValue(
                            guess.properties.weight_class.value,
                          )
                            ? guess.properties.weight_class
                              .result
                            : "gray",
                          undefined,
                          colorblindMode,
                        )
                      }`}
                  >
                    <CellTooltip
                      tooltip={
                        eclipsedWeight
                          ? BADGE_TOOLTIPS["E"]
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2 px-4 py-4 font-bold">
                        {eclipsedWeight && (
                          <ModifierBadge
                            label="E"
                            className="border-zinc-500/50 text-zinc-500"
                          />
                        )}
                        {!eclipsedWeight && (
                          <StatusIcon
                            result={
                              guess.properties.weight_class.result
                            }
                            enabled={
                              colorblindMode &&
                              hasValue(
                                guess.properties.weight_class
                                  .value,
                              )
                            }
                          />
                        )}
                        {hasValue(
                          guess.properties.weight_class.value,
                        )
                          ? guess.properties.weight_class.value
                          : "[ECLIPSED]"}
                      </div>
                    </CellTooltip>
                  </td>

                  {/* Health */}
                  <td
                    className={`border-l-4 border-black/50 ${getResultColorClass(
                      hasValue(guess.properties.health.value)
                        ? guess.properties.health.result
                        : "gray",
                      hasValue(guess.properties.health.value)
                        ? guess.properties.health.color
                        : undefined,
                      colorblindMode,
                    )}`}
                  >
                    <CellTooltip
                      tooltip={
                        falsifierHealth
                          ? BADGE_TOOLTIPS["F"]
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2 px-4 py-4 font-bold">
                        {falsifierHealth && (
                          <ModifierBadge
                            label="F"
                            className="border-orange-500/50 text-orange-400"
                          />
                        )}
                        <StatusIcon
                          result={guess.properties.health.result}
                          color={guess.properties.health.color}
                          enabled={
                            colorblindMode &&
                            hasValue(guess.properties.health.value)
                          }
                        />
                        {hasValue(guess.properties.health.value)
                          ? guess.properties.health.value
                          : "[ECLIPSED]"}
                        {hasValue(guess.properties.health.value) &&
                          guess.properties.health.result ===
                          "higher" && (
                            <span className="text-lg">▲</span>
                          )}
                        {hasValue(guess.properties.health.value) &&
                          guess.properties.health.result ===
                          "lower" && (
                            <span className="text-lg">▼</span>
                          )}
                      </div>
                    </CellTooltip>
                  </td>

                  {/* Level Count */}
                  <td
                    className={`border-l-4 border-black/50 ${getResultColorClass(
                      hasValue(guess.properties.level_count.value)
                        ? guess.properties.level_count.result
                        : "gray",
                      hasValue(guess.properties.level_count.value)
                        ? guess.properties.level_count.color
                        : undefined,
                      colorblindMode,
                    )}`}
                  >
                    <CellTooltip
                      tooltip={
                        falsifierLevels
                          ? BADGE_TOOLTIPS["F"]
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2 px-4 py-4 font-bold">
                        {falsifierLevels && (
                          <ModifierBadge
                            label="F"
                            className="border-orange-500/50 text-orange-400"
                          />
                        )}
                        <StatusIcon
                          result={
                            guess.properties.level_count.result
                          }
                          color={
                            guess.properties.level_count.color
                          }
                          enabled={
                            colorblindMode &&
                            hasValue(
                              guess.properties.level_count.value,
                            )
                          }
                        />
                        {hasValue(
                          guess.properties.level_count.value,
                        )
                          ? guess.properties.level_count.value
                          : "[ECLIPSED]"}
                        {hasValue(
                          guess.properties.level_count.value,
                        ) &&
                          guess.properties.level_count.result ===
                          "higher" && (
                            <span className="text-lg">▲</span>
                          )}
                        {hasValue(
                          guess.properties.level_count.value,
                        ) &&
                          guess.properties.level_count.result ===
                          "lower" && (
                            <span className="text-lg">▼</span>
                          )}
                      </div>
                    </CellTooltip>
                  </td>

                  {/* Appearance */}
                  <td
                    className={`border-l-4 border-black/50 ${getResultColorClass(
                      hasValue(guess.properties.appearance.value)
                        ? guess.properties.appearance.result
                        : "gray",
                      hasValue(guess.properties.appearance.value)
                        ? guess.properties.appearance.color
                        : undefined,
                      colorblindMode,
                    )}`}
                  >
                    <CellTooltip
                      tooltip={
                        falsifierAppearance
                          ? BADGE_TOOLTIPS["F"]
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-2 px-4 py-4 font-bold">
                        {falsifierAppearance && (
                          <ModifierBadge
                            label="F"
                            className="border-orange-500/50 text-orange-400"
                          />
                        )}
                        <StatusIcon
                          result={
                            guess.properties.appearance.result
                          }
                          color={guess.properties.appearance.color}
                          enabled={
                            colorblindMode &&
                            hasValue(
                              guess.properties.appearance.value,
                            )
                          }
                        />
                        {hasValue(
                          guess.properties.appearance.value,
                        ) &&
                          guess.properties.appearance.result ===
                          "earlier" && (
                            <span className="text-lg">◄</span>
                          )}
                        {hasValue(
                          guess.properties.appearance.value,
                        )
                          ? guess.properties.appearance.value
                          : "[ECLIPSED]"}
                        {hasValue(
                          guess.properties.appearance.value,
                        ) &&
                          guess.properties.appearance.result ===
                          "later" && (
                            <span className="text-lg">►</span>
                          )}
                      </div>
                    </CellTooltip>
                  </td>
                </motion.tr>
              );
            })}
          </AnimatePresence>
          {guesses.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-white/30 italic"
              >
                NO GUESSES YET...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
