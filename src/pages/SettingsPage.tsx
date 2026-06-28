import { useSettings } from '../context/SettingsContext';
import type { GuessboardColumn } from '../context/SettingsContext';
import { RGBColorPicker } from '../components/ui/RGBColorPicker';
import { GuessBoard } from '../components/game/GuessBoard';
import Button from "../components/ui/Button";
import type { GuessResult } from '../components/game/GuessBoard';
import SEO from '../components/SEO';

const SAMPLE_GUESS: GuessResult = {
  guess_id: 1,
  enemy_name: "Filth",
  correct: false,
  properties: {
    enemy_type: { value: "Husk", result: "incorrect" },
    weight_class: { value: "Light", result: "incorrect" },
    health: { value: 1, result: "higher", color: "yellow" },
    level_count: { value: 27, result: "lower", color: "yellow" },
    appearance: {
      value: "0-1: INTO THE FIRE",
      result: "incorrect",
      color: "green",
    },
  },
};

const COLUMN_LABELS: Record<GuessboardColumn, string> = {
  enemy_name: "Enemy",
  enemy_type: "Type",
  weight_class: "Weight",
  health: "Health",
  level_count: "Total Levels",
  appearance: "Registered At",
};

const PRESET_COLORS = {
  default: {
    correct: { r: 34 / 255, g: 197 / 255, b: 94 / 255 },
    partial: { r: 234 / 255, g: 179 / 255, b: 8 / 255 },
    incorrect: { r: 239 / 255, g: 68 / 255, b: 68 / 255 },
  },
  colorblind: {
    correct: { r: 34 / 255, g: 197 / 255, b: 94 / 255 },
    partial: { r: 59 / 255, g: 130 / 255, b: 246 / 255 },
    incorrect: { r: 239 / 255, g: 68 / 255, b: 68 / 255 },
  },
};

const SettingsPage = () => {
  const { settings, updateSettings } = useSettings();

  const isCustom = settings.cellColors === "custom";
  const displayColors = isCustom
    ? settings.customColors
    : PRESET_COLORS[
    settings.cellColors === "colorblind" ? "colorblind" : "default"
    ];

  const handleColumnMove = (index: number, direction: "up" | "down") => {
    const cols = [...settings.guessboardColumns];
    if (direction === "up" && index > 0) {
      [cols[index - 1], cols[index]] = [cols[index], cols[index - 1]];
    } else if (direction === "down" && index < cols.length - 1) {
      [cols[index + 1], cols[index]] = [cols[index], cols[index + 1]];
    }
    updateSettings({ guessboardColumns: cols });
  };

  return (
    <div className="flex flex-col w-full items-start h-full min-h-0 pt-4 pb-12 text-white">
      <SEO
        title="Settings"
        description="Customize your ULTRAKIDLE experience."
      />
      <h1 className="text-xl max-w-2xl md:text-2xl font-bold tracking-widest mb-6 border-b w-full border-white/20 pb-2 uppercase">
        Settings
      </h1>

      <div className="flex flex-col gap-8 max-w-2xl">
        {/* Hint Colors & Indicators */}
        <div className="flex flex-col gap-2">
          <h2 className="text-lg text-left font-bold tracking-wider opacity-80 uppercase">
            Hint Display
          </h2>
          <p className="opacity-50 text-left text-sm mb-2 uppercase tracking-widest">
            Change the color scheme and indicators for hint cells in the
            Guess Board.
          </p>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer uppercase text-sm tracking-widest">
              <input
                type="radio"
                name="cellColors"
                checked={settings.cellColors === "default"}
                onChange={() => updateSettings({ cellColors: "default" })}
                className="accent-green-500"
              />
              <span>Default</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer uppercase text-sm tracking-widest">
              <input
                type="radio"
                name="cellColors"
                checked={settings.cellColors === "colorblind"}
                onChange={() => updateSettings({ cellColors: "colorblind" })}
                className="accent-blue-500"
              />
              <span>Colorblind</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer uppercase text-sm tracking-widest">
              <input
                type="radio"
                name="cellColors"
                checked={settings.cellColors === "custom"}
                onChange={() => updateSettings({ cellColors: "custom" })}
                className="accent-purple-500"
              />
              <span>Custom</span>
            </label>
          </div>

          <label className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 uppercase text-sm tracking-widest w-fit mt-2">
            <input
              type="checkbox"
              checked={settings.showHintIcons}
              onChange={(e) =>
                updateSettings({ showHintIcons: e.target.checked })
              }
              className="w-4 h-4 accent-green-500 shrink-0"
            />
            <span>Show symbols (✓, ǃ, ⨯) inside hint boxes</span>
          </label>

          <div className="flex flex-col-reverse md:flex-row  gap-8 mt-4 p-4 bg-black/40 border border-white/10 w-full xl:w-fit items-start">
            <div className="flex flex-col gap-6 w-fit shrink-0">
              <RGBColorPicker
                title="CORRECT"
                color={displayColors.correct}
                onChange={(c) =>
                  updateSettings({
                    customColors: { ...settings.customColors, correct: c },
                  })
                }
                disabled={!isCustom}
              />
              <RGBColorPicker
                title="APPROXIMATE"
                color={displayColors.partial}
                onChange={(c) =>
                  updateSettings({
                    customColors: { ...settings.customColors, partial: c },
                  })
                }
                disabled={!isCustom}
              />
              <RGBColorPicker
                title="INCORRECT"
                color={displayColors.incorrect}
                onChange={(c) =>
                  updateSettings({
                    customColors: { ...settings.customColors, incorrect: c },
                  })
                }
                disabled={!isCustom}
              />
            </div>
            <div className="flex flex-col w-full mt-2">
              <h3 className="font-bold text-sm tracking-widest uppercase mb-2 text-white/50">
                PREVIEW
              </h3>
              <div className="pointer-events-none -mt-4">
                <GuessBoard
                  guesses={[SAMPLE_GUESS]}
                  overrideColumns={["enemy_name", "health", "appearance"]}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Guessboard Column Reordering */}
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
          <h2 className="text-left text-lg font-bold tracking-wider opacity-80 uppercase">
            Guessboard Columns
          </h2>
          <p className="opacity-50 text-left text-sm mb-2 uppercase tracking-widest">
            Reorder the columns displayed when you submit a guess.
          </p>
          <div className="flex flex-col gap-2 bg-black/40 border border-white/10 p-2">
            {settings.guessboardColumns.map((col, idx) => (
              <div
                key={col}
                className="flex justify-between items-center p-2 bg-white/5 border border-white/10"
              >
                <span className="uppercase tracking-widest text-sm font-bold opacity-80">
                  {COLUMN_LABELS[col] || col}
                </span>
                <div className="flex gap-2 text-xl">
                  <Button
                    className=""
                    variant="ghost"
                    disabled={idx === 0}
                    onClick={() => handleColumnMove(idx, "up")}
                  >
                    <span className="text-xl">▲</span>
                  </Button>
                  <div className="h-12 w-[1px] bg-white/20">
                  </div>
                  <Button
                    variant="ghost"
                    disabled={idx === settings.guessboardColumns.length - 1}
                    onClick={() => handleColumnMove(idx, "down")}
                  >
                    <span className="text-xl">▼</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual Section */}
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
          <h2 className="text-left text-lg font-bold tracking-wider opacity-80 uppercase">
            Visual
          </h2>
          <p className="opacity-50 text-left text-sm mb-2 uppercase tracking-widest">
            Change font displayed across the site.
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer uppercase text-sm tracking-widest">
              <input
                type="radio"
                name="fontFamily"
                checked={settings.fontFamily === "vcr"}
                onChange={() => updateSettings({ fontFamily: "vcr" })}
                className="accent-green-500"
              />
              <span style={{ fontFamily: "VCR OSD Mono, monospace" }}>
                VCR OSD Mono
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer uppercase text-sm tracking-widest">
              <input
                type="radio"
                name="fontFamily"
                checked={settings.fontFamily === "atkinson"}
                onChange={() => updateSettings({ fontFamily: "atkinson" })}
                className="accent-green-500"
              />
              <span style={{ fontFamily: "Atkinson Hyperlegible, sans-serif" }}>
                Atkinson Hyperlegible
              </span>
            </label>
          </div>
        </div>

        {/* Behavior Section */}
        <div className="flex flex-col gap-2 border-t border-white/10 pt-4 pb-8">
          <h2 className="text-lg text-left font-bold tracking-wider opacity-80 uppercase">
            Behavior
          </h2>
          <p className="opacity-50 text-left text-sm mb-4 uppercase tracking-widest">
            Adjust how the game handles guesses.
          </p>

          <div className="flex flex-col gap-6">
{/* Random Guess Setting */}
            <div className="flex flex-col gap-2">
              <p className="opacity-40 text-left text-xs mb-1 uppercase tracking-widest">
                Allow random selection to guess the correct enemy in these
                modes:
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                  <input
                    type="checkbox"
                    checked={settings.allowRandomGuess.classic}
                    onChange={(e) =>
                      updateSettings({
                        allowRandomGuess: {
                          ...settings.allowRandomGuess,
                          classic: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-green-500 shrink-0"
                  />
                  <span>Classic</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                  <input
                    type="checkbox"
                    checked={settings.allowRandomGuess.cybergrind}
                    onChange={(e) =>
                      updateSettings({
                        allowRandomGuess: {
                          ...settings.allowRandomGuess,
                          cybergrind: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-green-500 shrink-0"
                  />
                  <span>Cybergrind</span>
                </label>
              </div>
            </div>

            {/* Confirmation Dialogs */}
            <div className="flex flex-col gap-2">
              <p className="opacity-40 text-left text-xs mb-1 uppercase tracking-widest">
                Prompt for confirmation before submitting guesses in these
                modes.
              </p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                  <input
                    type="checkbox"
                    checked={settings.confirmDialogs.classic}
                    onChange={(e) =>
                      updateSettings({
                        confirmDialogs: {
                          ...settings.confirmDialogs,
                          classic: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-green-500"
                  />
                  <span>Classic</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                  <input
                    type="checkbox"
                    checked={settings.confirmDialogs.infernoguessr}
                    onChange={(e) =>
                      updateSettings({
                        confirmDialogs: {
                          ...settings.confirmDialogs,
                          infernoguessr: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-green-500"
                  />
                  <span>Infernoguessr</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                  <input
                    type="checkbox"
                    checked={settings.confirmDialogs.cybergrind}
                    onChange={(e) =>
                      updateSettings({
                        confirmDialogs: {
                          ...settings.confirmDialogs,
                          cybergrind: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-green-500"
                  />
                  <span>Cybergrind (classic)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                  <input
                    type="checkbox"
                    checked={settings.confirmDialogs.igCybergrind}
                    onChange={(e) =>
                      updateSettings({
                        confirmDialogs: {
                          ...settings.confirmDialogs,
                          igCybergrind: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-green-500"
                  />
                  <span>Cybergrind (infernoguessr)</span>
                </label>
              </div>
            </div>
{/* Image Control Persistence */}
            <div className="flex flex-col gap-2">
              <p className="opacity-40 text-left text-xs mb-1 uppercase tracking-widest">
                Persist these image controls between rounds in these modes:
              </p>
              <div className="flex flex-col gap-4">
                {/* Infernoguessr */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-left opacity-30 uppercase tracking-[0.2em] font-bold ml-2">
                    Infernoguessr
                  </span>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                      <input
                        type="checkbox"
                        checked={settings.persistImageControls.infernoguessr.gamma}
                        onChange={(e) =>
                          updateSettings({
                            persistImageControls: {
                              ...settings.persistImageControls,
                              infernoguessr: {
                                ...settings.persistImageControls.infernoguessr,
                                gamma: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 accent-green-500"
                      />
                      <span>Gamma</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                      <input
                        type="checkbox"
                        checked={settings.persistImageControls.infernoguessr.zoom}
                        onChange={(e) =>
                          updateSettings({
                            persistImageControls: {
                              ...settings.persistImageControls,
                              infernoguessr: {
                                ...settings.persistImageControls.infernoguessr,
                                zoom: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 accent-green-500"
                      />
                      <span>Zoom</span>
                    </label>
                  </div>
                </div>

                {/* Cybergrind (Infernoguessr) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-left opacity-30 uppercase tracking-[0.2em] font-bold ml-2">
                    Cybergrind (Infernoguessr)
                  </span>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                      <input
                        type="checkbox"
                        checked={settings.persistImageControls.igCybergrind.gamma}
                        onChange={(e) =>
                          updateSettings({
                            persistImageControls: {
                              ...settings.persistImageControls,
                              igCybergrind: {
                                ...settings.persistImageControls.igCybergrind,
                                gamma: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 accent-green-500"
                      />
                      <span>Gamma</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer opacity-80 hover:opacity-100 p-2 bg-white/5 w-fit rounded uppercase text-sm tracking-widest font-bold">
                      <input
                        type="checkbox"
                        checked={settings.persistImageControls.igCybergrind.zoom}
                        onChange={(e) =>
                          updateSettings({
                            persistImageControls: {
                              ...settings.persistImageControls,
                              igCybergrind: {
                                ...settings.persistImageControls.igCybergrind,
                                zoom: e.target.checked,
                              },
                            },
                          })
                        }
                        className="w-4 h-4 accent-green-500"
                      />
                      <span>Zoom</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
