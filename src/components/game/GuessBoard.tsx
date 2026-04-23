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
  is_blessed?: boolean;
  created_at?: string;
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
  overrideColumns?: string[];
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

const getCellStyles = (
  result: string | null,
  settings: any,
  color?: "green" | "yellow" | "red"
): { className: string; style?: React.CSSProperties } => {
  if (result === "gray" || result === null || result === undefined) {
    return { className: "bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50" };
  }

  let logicalColor: "green" | "yellow" | "red" = "red";
  if (color) {
    logicalColor = color;
  } else if (result === "correct") {
    logicalColor = "green";
  } else if (result === "higher" || result === "lower" || result === "earlier" || result === "later") {
    logicalColor = "yellow";
  }

  if (settings.cellColors === "custom") {
    const rgb =
      logicalColor === "green" ? settings.customColors.correct :
        logicalColor === "yellow" ? settings.customColors.partial :
          settings.customColors.incorrect;
    const rgbString = `${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}`;
    return {
      className: "",
      style: {
        backgroundColor: `rgba(${rgbString}, 0.2)`,
        borderColor: `rgb(${rgbString})`,
        color: `rgb(${rgbString})`
      }
    };
  }

  if (logicalColor === "green") return { className: "bg-green-600/20 border-green-500 text-green-500" };
  if (logicalColor === "yellow") {
    return settings.cellColors === "colorblind"
      ? { className: "bg-blue-600/20 border-blue-500 text-blue-500" }
      : { className: "bg-yellow-600/20 border-yellow-500 text-yellow-500" };
  }
  return { className: "bg-red-600/20 border-red-500 text-red-500" };
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

const COLUMN_HEADERS: Record<string, string> = {
  enemy_name: "Enemy",
  enemy_type: "Type",
  weight_class: "Weight",
  health: "Health",
  level_count: "Total Levels",
  appearance: "Registered at",
};

export const GuessBoard = ({
  guesses,
  modifiers = [],
  overrideColumns,
}: GuessBoardProps) => {
  const { settings } = useSettings();

  const hasFalsifier = modifiers.includes("FALSIFIER");
  const hasEclipse = modifiers.includes("ECLIPSE");
  const activeColumns = overrideColumns || settings.guessboardColumns;
  const numColumns = activeColumns.length;
  const showIcons = settings.showHintIcons || settings.cellColors === 'colorblind';

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm text-left uppercase border-collapse">
        <thead className="text-xs text-white/50 bg-white/5 border-b border-white/10">
          <tr>
            {activeColumns.map(col => (
              <th key={col} className="px-3 py-3">{COLUMN_HEADERS[col] || col}</th>
            ))}
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

              const renderCell = (col: string) => {
                switch (col) {
                  case 'enemy_name': {
                    const styles = guess.is_blessed
                      ? { className: "bg-cyan-600/20 border-cyan-500 text-cyan-500" }
                      : getCellStyles(
                        guess.correct ? "correct" : "incorrect",
                        settings
                      );
                    return (
                      <td key="enemy_name"
                        className={`border-l-4 ${isPenance ? "border-l-amber-400" : "border-black/50"} ${styles.className}`}
                        style={styles.style}
                      >
                        <CellTooltip
                          tooltip={
                            isPenance ? BADGE_TOOLTIPS["P"] : undefined
                          }
                        >
                          <div className="flex items-center gap-3 px-3 py-4 font-bold max-w-[200px]">
                            {enemy && (
                              <EnemyIcon
                                icons={enemy.icon}
                                size={32}
                                isSpawn={(enemy as any).isSpawn}
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
                                enabled={showIcons}
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
                    );
                  }
                  case 'enemy_type': {
                    const styles = eclipsedType
                      ? { className: "bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50" }
                      : getCellStyles(
                        hasValue(guess.properties.enemy_type.value) ? guess.properties.enemy_type.result : "gray",
                        settings
                      );
                    return (
                      <td key="enemy_type"
                        className={`border-l-4 border-black/50 ${styles.className}`}
                        style={styles.style}
                      >
                        <CellTooltip
                          tooltip={
                            guess.is_blessed
                              ? "This enemy is BLESSED, it has all its hints obscured"
                              : eclipsedType
                                ? BADGE_TOOLTIPS["E"]
                                : undefined
                          }
                        >
                          <div className="flex items-center gap-2 px-3 py-4 font-bold">
                            {!eclipsedType && (
                              <StatusIcon
                                result={
                                  guess.properties.enemy_type.result
                                }
                                enabled={
                                  showIcons &&
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
                    );
                  }
                  case 'weight_class': {
                    const styles = eclipsedWeight
                      ? { className: "bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50" }
                      : getCellStyles(
                        hasValue(guess.properties.weight_class.value) ? guess.properties.weight_class.result : "gray",
                        settings
                      );
                    return (
                      <td key="weight_class"
                        className={`border-l-4 border-black/50 ${styles.className}`}
                        style={styles.style}
                      >
                        <CellTooltip
                          tooltip={
                            guess.is_blessed
                              ? "This enemy is BLESSED, it has all its hints obscured"
                              : eclipsedWeight
                                ? BADGE_TOOLTIPS["E"]
                                : undefined
                          }
                        >
                          <div className="flex items-center gap-2 px-3 py-4 font-bold">
                            {!eclipsedWeight && (
                              <StatusIcon
                                result={
                                  guess.properties.weight_class.result
                                }
                                enabled={
                                  showIcons &&
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
                    );
                  }
                  case 'health': {
                    const styles = getCellStyles(
                      hasValue(guess.properties.health.value) ? guess.properties.health.result : "gray",
                      settings,
                      hasValue(guess.properties.health.value) ? guess.properties.health.color : undefined
                    );
                    return (
                      <td key="health"
                        className={`border-l-4 border-black/50 ${styles.className}`}
                        style={styles.style}
                      >
                        <CellTooltip
                          tooltip={
                            guess.is_blessed
                              ? "This enemy is BLESSED, it has all its hints obscured"
                              : falsifierHealth
                                ? BADGE_TOOLTIPS["F"]
                                : undefined
                          }
                        >
                          <div className="flex items-center gap-2 px-3 py-4 font-bold">
                            <StatusIcon
                              result={guess.properties.health.result}
                              color={guess.properties.health.color}
                              enabled={
                                showIcons &&
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
                    );
                  }
                  case 'level_count': {
                    const styles = getCellStyles(
                      hasValue(guess.properties.level_count.value) ? guess.properties.level_count.result : "gray",
                      settings,
                      hasValue(guess.properties.level_count.value) ? guess.properties.level_count.color : undefined
                    );
                    return (
                      <td key="level_count"
                        className={`border-l-4 border-black/50 ${styles.className}`}
                        style={styles.style}
                      >
                        <CellTooltip
                          tooltip={
                            guess.is_blessed
                              ? "This enemy is BLESSED, it has all its hints obscured"
                              : falsifierLevels
                                ? BADGE_TOOLTIPS["F"]
                                : undefined
                          }
                        >
                          <div className="flex items-center gap-2 px-3 py-4 font-bold">
                            <StatusIcon
                              result={
                                guess.properties.level_count.result
                              }
                              color={
                                guess.properties.level_count.color
                              }
                              enabled={
                                showIcons &&
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
                    );
                  }
                  case 'appearance': {
                    const styles = getCellStyles(
                      hasValue(guess.properties.appearance.value) ? guess.properties.appearance.result : "gray",
                      settings,
                      hasValue(guess.properties.appearance.value) ? guess.properties.appearance.color : undefined
                    );
                    return (
                      <td key="appearance"
                        className={`border-l-4 border-black/50 ${styles.className}`}
                        style={styles.style}
                      >
                        <CellTooltip
                          tooltip={
                            guess.is_blessed
                              ? "This enemy is BLESSED, it has all its hints obscured"
                              : falsifierAppearance
                                ? BADGE_TOOLTIPS["F"]
                                : undefined
                          }
                        >
                          <div className="flex items-center gap-2 px-3 py-4 font-bold">
                            <StatusIcon
                              result={
                                guess.properties.appearance.result
                              }
                              color={guess.properties.appearance.color}
                              enabled={
                                showIcons &&
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
                    );
                  }
                  default: return null;
                }
              };

              return (
                <motion.tr
                  key={guess.created_at || `${guess.guess_id}-${idx}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className={`border-b border-white/5 last:border-0 hover:bg-white/5 ${isPenance ? "bg-amber-500/5" : ""
                    } ${guess.is_blessed ? "relative after:absolute after:inset-0 after:bg-cyan-500/10 after:ring-cyan-500 after:ring-inset after:pointer-events-none" : ""}`}
                >
                  {activeColumns.map(col => renderCell(col))}
                </motion.tr>
              );
            })}
          </AnimatePresence>
          {guesses.length === 0 && (
            <tr>
              <td
                colSpan={numColumns}
                className="px-3 py-8 text-center text-white/30 italic"
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
