import { useState, Fragment, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import SEO from "../../components/SEO";
import { CURRENT_VERSION, useVersion } from "../../context/VersionContext";
import Button from "../../components/ui/Button";
import { EnemySearch } from "../../components/game/EnemySearch";
import { GuessBoard } from "../../components/game/GuessBoard";
import type { GuessResult } from "../../components/game/GuessBoard";
import { enemies } from "../../lib/enemy_list";
import { Typewriter } from "../../components/Typewriter";
import { motion } from "framer-motion";
import AlertDialog from "../../components/ui/AlertDialog";
import { EnemyIcon } from "../../components/game/EnemyIcon";
import Tooltip from "../../components/ui/Tooltip";

const MODIFIER_DISPLAY_ORDER: string[] = [
  "PENANCE",
  "FALSIFIER",
  "LETHE",
  "ECLIPSE",
  "IDOL",
  "RADIANCE",
];

const RADIANCE_DESCRIPTIONS: Record<string, string> = {
  PENANCE: "RADIANCE: 2 wrong guesses instead of 1",
  FALSIFIER:
    "RADIANCE: Flips 2 arrows instead of 1. Can flip the same arrow twice, canceling itself out",
  LETHE: "RADIANCE: Only your most recent guess is visible",
  ECLIPSE: "RADIANCE: Both Type and Weight columns are hidden",
  IDOL: "RADIANCE: 6 guessed enemies from the previous 4 rounds become BLESSED",
};

const MODIFIER_TOOLTIPS: Record<string, string> = {
  PENANCE:
    "Automatically select a wrong guess at the start of the round",
  FALSIFIER:
    "For a random hint with arrows, flip its arrow to the opposite direction. The hint this applies to is re-rolled on every guess",
  LETHE: "You can only see your 2 most recent guesses",
  ECLIPSE:
    "Completely obscures a random column without arrows for the entire round",
  IDOL: "3 enemies guessed from the last 2 rounds become BLESSED. BLESSED enemies have all their hints obscured",
  RADIANCE:
    "Double the effects of 1 random modifier. Starting at wave 36, select 1 additional modifier every 15 waves",
};

const sortModifiers = (mods: string[]): string[] =>
  [...mods].sort(
    (a, b) =>
      MODIFIER_DISPLAY_ORDER.indexOf(a) -
      MODIFIER_DISPLAY_ORDER.indexOf(b),
  );

const defaultHintData = { value: "", result: "gray" } as any;

const mapGuess = (
  guess_enemy_id: number,
  hint_data: any,
  is_penance: boolean,
  is_blessed: boolean,
  created_at?: string,
): GuessResult => {
  const enemyData = enemies.find((e) => e.id === guess_enemy_id);
  return {
    guess_id: guess_enemy_id,
    enemy_name: enemyData?.name ?? "UNKNOWN",
    correct: hint_data.correct,
    is_penance,
    is_blessed,
    created_at,
    properties: {
      enemy_type: hint_data.properties.enemy_type || defaultHintData,
      weight_class:
        hint_data.properties.weight_class || defaultHintData,
      health: hint_data.properties.health || defaultHintData,
      level_count:
        hint_data.properties.level_count || defaultHintData,
      appearance: hint_data.properties.appearance || defaultHintData,
    },
  };
};

const mapGuessesFromServer = (guesses: any[]): GuessResult[] =>
  (guesses || []).map((g: any) =>
    mapGuess(
      g.guess_enemy_id,
      g.hint_data,
      g.is_penance,
      g.is_blessed,
      g.created_at,
    ),
  );

interface BestRecord {
  best_wave: number;
  total_guesses: number;
  hint_accuracy: number;
  avg_accuracy: number;
}

interface GameOverStats {
  waves_reached: number;
  is_new_record: boolean;
  correct_id?: number;
  total_guesses?: number;
  hint_accuracy?: number;
  avg_accuracy?: number;
}

const CybergrindClassicPage = () => {
  const { setUpdateAvailable } = useVersion();
  const bottomRef = useRef<HTMLDivElement>(null);
  const startingRef = useRef(false);
  const pendingNextState = useRef<any>(null);

  const [status, setStatus] = useState<
    "loading" | "no_run" | "active" | "game_over"
  >("loading");
  const [currentWave, setCurrentWave] = useState(1);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [radianceTargets, setRadianceTargets] = useState<string[]>(
    [],
  );
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [guessesLeft, setGuessesLeft] = useState(6);
  const [bestRecord, setBestRecord] = useState<BestRecord | null>(
    null,
  );

  const [startWaves, setStartWaves] = useState<number[]>([]);
  const [selectedStartWave, setSelectedStartWave] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldFlash, setShouldFlash] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [gameOverStats, setGameOverStats] =
    useState<GameOverStats | null>(null);

  const applyRoundState = (s: any) => {
    setCurrentWave(s.current_wave);
    setModifiers(s.modifiers || []);
    setRadianceTargets(s.radiance_targets || []);
    setGuessesLeft(
      s.guesses_left ?? Math.max(0, 6 - (s.guess_count || 0)),
    );
    setGuesses(mapGuessesFromServer(s.guesses));
  };

  const updateSelectedStartWave = (wave: number) => {
    setSelectedStartWave(wave);
    localStorage.setItem(
      "ultrakidle_cybergrind_start_wave",
      wave.toString(),
    );
  };

  const handleVersionError = (error: any) => {
    if (error?.message?.includes("CLIENT_OUTDATED"))
      setUpdateAvailable(true);
  };

  const handleStartRun = async (wave: number = 1) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(
        "start_cybergrind_run",
        { start_wave: wave, version: CURRENT_VERSION },
      );
      if (error) {
        handleVersionError(error);
        throw error;
      }

      if (data.status === "active") {
        setStatus("active");
        if (data.best) setBestRecord(data.best);
        applyRoundState(data);
        return;
      }

      setStatus("active");
      setCurrentWave(data.round_number);
      setModifiers(data.modifiers || []);
      setRadianceTargets(data.radiance_targets || []);
      setGuesses(mapGuessesFromServer(data.guesses));
      setGuessesLeft(Math.max(0, 6 - (data.guesses?.length || 0)));
    } catch (err) {
      console.error("Error starting cybergrind run:", err);
    } finally {
      setIsSubmitting(false);
      startingRef.current = false;
    }
  };

  const fetchState = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "get_cybergrind_state",
        { p_version: CURRENT_VERSION }
      );
      if (error) throw error;

      if (data.best) setBestRecord(data.best);

      if (data.status === "no_run") {
        const unlockedWaves = data.start_waves || [];
        setStartWaves(unlockedWaves);

        const savedWave = localStorage.getItem(
          "ultrakidle_cybergrind_start_wave",
        );
        if (savedWave) {
          const waveNum = parseInt(savedWave, 10);
          if (waveNum === 1 || unlockedWaves.includes(waveNum)) {
            setSelectedStartWave(waveNum);
          } else {
            localStorage.removeItem(
              "ultrakidle_cybergrind_start_wave",
            );
            setSelectedStartWave(1);
          }
        } else {
          setSelectedStartWave(1);
        }

        setStatus("no_run");
      } else if (data.status === "active") {
        setStatus("active");
        applyRoundState(data);
      }
    } catch (err) {
      console.error("Error fetching cybergrind state:", err);
      setStatus("no_run");
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleGuess = async (enemyId: number) => {
    if (isSubmitting || status !== "active") return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(
        "submit_cybergrind_guess",
        { guess_id: enemyId, version: CURRENT_VERSION },
      );
      if (error) {
        handleVersionError(error);
        if (error.message?.includes("No active Cybergrind run")) {
          setStatus("loading");
          await fetchState();
          return;
        }
        throw error;
      }

      if (data.result === "correct") {
        const roundGuesses = data.round_guesses || [];
        setGuesses(mapGuessesFromServer(roundGuesses));
        setGuessesLeft(Math.max(0, 6 - roundGuesses.length));

        pendingNextState.current = data.state;

        setShouldFlash(true);
        setTimeout(() => setShouldFlash(false), 1500);
      } else if (data.game_over) {
        setGuesses(mapGuessesFromServer(data.round_guesses));
        setGuessesLeft(0);
        setModifiers(data.state.modifiers || []);
        setRadianceTargets(data.state.radiance_targets || []);

        const stats: GameOverStats = {
          waves_reached: data.waves_reached,
          is_new_record: data.is_new_record,
          correct_id: data.correct_id,
          total_guesses: data.total_guesses,
          hint_accuracy: data.hint_accuracy,
          avg_accuracy: data.avg_accuracy,
        };
        setGameOverStats(stats);

        if (data.is_new_record) {
          setBestRecord({
            best_wave: data.waves_reached,
            total_guesses: data.total_guesses,
            hint_accuracy: data.hint_accuracy,
            avg_accuracy: data.avg_accuracy,
          });
        }

        setStatus("game_over");
      } else {
        applyRoundState(data.state);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextRound = async () => {
    setGuesses([]);
    setTimeout(async () => {
      if (pendingNextState.current) {
        applyRoundState(pendingNextState.current);
        pendingNextState.current = null;
        setStatus("active");
      } else {
        await fetchState();
      }
    }, 400);
  };

  const handleAbandon = () => setIsAbandonModalOpen(true);

  const confirmAbandon = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(
        "abandon_cybergrind_run",
        { version: CURRENT_VERSION },
      );
      if (error) {
        if (error.message?.includes("No active Cybergrind run")) {
          setIsAbandonModalOpen(false);
          setStatus("loading");
          await fetchState();
          return;
        }
        throw error;
      }

      const stats: GameOverStats = {
        waves_reached: data.waves_reached,
        is_new_record: data.is_new_record,
        correct_id: data.correct_id,
        total_guesses: data.total_guesses,
        hint_accuracy: data.hint_accuracy,
        avg_accuracy: data.avg_accuracy,
      };
      setGameOverStats(stats);

      if (data.is_new_record) {
        setBestRecord({
          best_wave: data.waves_reached,
          total_guesses: data.total_guesses,
          hint_accuracy: data.hint_accuracy,
          avg_accuracy: data.avg_accuracy,
        });
      }

      setStatus("game_over");
      setIsAbandonModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewRun = async () => {
    setGameOverStats(null);
    setGuesses([]);
    setGuessesLeft(6);
    setModifiers([]);
    setRadianceTargets([]);
    setCurrentWave(1);
    pendingNextState.current = null;
    setStatus("loading");
    await fetchState();
  };

  const hasWon = guesses.some((g) => g.correct);
  const isRoundOver = hasWon || guessesLeft <= 0;
  const isGameOver = status === "game_over";

  const revealedEnemy =
    isGameOver && gameOverStats?.correct_id
      ? enemies.find((e) => e.id === gameOverStats.correct_id)
      : null;

  const sortedModifiers = sortModifiers(modifiers);

  useEffect(() => {
    if (status !== "loading" && (isRoundOver || isGameOver)) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [status, isRoundOver, isGameOver]);

  if (status === "loading") {
    return (
      <>
        <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible" />
        <div className="flex flex-col w-full h-full items-start justify-start">
          <div className="z-40 flex flex-col w-full pt-4 justify-start items-start">
            <p className="text-xl opacity-50 animate-pulse mt-4">
              INITIALIZING BOARD...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (status === "no_run") {
    const allWaves = [5, 10, 15, 20, 25, 30, 35, 40];

    return (
      <>
        <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
          <SEO
            title="Cybergrind"
            description="Endless enemy-guessing mode."
          />
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col w-full items-start gap-6"
          >
            <div className="flex flex-col gap-0 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left">
              <h1 className="tracking-widest">
                CYBERGRIND_CLASSIC
              </h1>
            </div>

            {bestRecord && bestRecord.best_wave > 0 && (
              <div className="flex text-left flex-col gap-1 text-white/50 text-sm font-bold uppercase tracking-widest">
                <span>
                  PERSONAL BEST: WAVE {bestRecord.best_wave}
                </span>
                <span>
                  ACCURACY:{" "}
                  {(bestRecord.avg_accuracy * 20).toFixed(2)}%
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-white/50 text-sm font-bold uppercase tracking-widest">
                START WAVE:
              </span>
              <div className="gap-2 grid grid-cols-3">
                <Button
                  onClick={() => updateSelectedStartWave(1)}
                  variant={
                    selectedStartWave === 1
                      ? "primary"
                      : "outline"
                  }
                >
                  1
                </Button>
                {allWaves.map((w) => {
                  const unlocked = startWaves.includes(w);
                  const button = (
                    <span
                      className={
                        !unlocked ? "cursor-not-allowed" : ""
                      }
                    >
                      <Button
                        onClick={() =>
                          unlocked &&
                          updateSelectedStartWave(w)
                        }
                        variant={
                          selectedStartWave === w
                            ? "primary"
                            : "outline"
                        }
                        disabled={!unlocked}
                        className={
                          !unlocked
                            ? "opacity-30 pointer-events-none w-full"
                            : "w-full"
                        }
                      >
                        {w}
                      </Button>
                    </span>
                  );

                  return unlocked ? (
                    <Fragment key={w}>{button}</Fragment>
                  ) : (
                    <Tooltip
                      key={w}
                      content={`Reach wave ${w * 2} to unlock`}
                      wrapperClassName=""
                    >
                      {button}
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <Button
              variant="outline"
              size="lg"
              onClick={() => handleStartRun(selectedStartWave)}
              disabled={isSubmitting}
              className="mt-2"
            >
              {isSubmitting ? "INITIALIZING..." : "START RUN"}
            </Button>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
        <SEO
          title={`Cybergrind - Wave ${currentWave}`}
          description="Endless enemy-guessing mode."
        />

        <motion.div
          key="cybergrind-active"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col w-full items-start"
        >
          <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
            <div className="flex gap-2 items-baseline">
              <h1 className="tracking-widest flex-1">
                CYBERGRIND_CLASSIC
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 w-full md:max-w-[1000px] border-b border-white/5 pb-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">
                  WAVE:
                </span>
                <span className="text-2xl font-black text-white italic leading-none">
                  {currentWave}
                </span>
                {bestRecord && (
                  <span className="text-white/30 text-sm text-left font-bold uppercase tracking-wider">
                    (BEST: {bestRecord.best_wave})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-2 min-h-6">
              <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">
                MODIFIERS:
              </span>
              <div className="flex gap-1 items-center flex-wrap">
                {sortedModifiers.length > 0 ? (
                  sortedModifiers.map((mod, index) => {
                    const isRadiance = mod === "RADIANCE";
                    const isTarget =
                      radianceTargets.includes(mod);
                    const baseTooltip =
                      MODIFIER_TOOLTIPS[mod] || mod;
                    const tooltip = isTarget
                      ? `${baseTooltip} | ${RADIANCE_DESCRIPTIONS[mod]}`
                      : baseTooltip;

                    return (
                      <Fragment key={mod}>
                        {index > 0 && (
                          <span className="text-white">
                            |
                          </span>
                        )}
                        <Tooltip
                          content={tooltip}
                          wrapperClassName=""
                        >
                          <span
                            className={`font-bold uppercase italic tracking-wider cursor-help ${isRadiance
                                ? "text-purple-400"
                                : isTarget
                                  ? "text-yellow-400"
                                  : "text-red-500"
                              }`}
                          >
                            {mod}
                            {isTarget && (
                              <span className="text-[9px] text-purple-400 ml-0.5">
                                ×2
                              </span>
                            )}
                          </span>
                        </Tooltip>
                      </Fragment>
                    );
                  })
                ) : (
                  <span className="text-white/40 uppercase tracking-widest italic font-bold">
                    NONE
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full z-20">
            <EnemySearch
              onGuess={handleGuess}
              disabled={
                isSubmitting || isRoundOver || isGameOver
              }
            />
          </div>

          <motion.div
            animate={
              shouldFlash
                ? {
                  backgroundColor: [
                    "rgba(255, 255, 255, 0.6)",
                    "rgba(255, 255, 255, 0)",
                  ],
                }
                : {
                  backgroundColor:
                    "rgba(255, 255, 255, 0)",
                }
            }
            transition={
              shouldFlash
                ? { duration: 1.5, ease: "easeOut" }
                : { duration: 0 }
            }
            className="md:max-w-[1000px] w-full mt-4"
          >
            <div className="w-full flex justify-left">
              <span className="text-white/50 text-sm text-left place-self-start w-full justify-left">
                * All data mirrors that of the official wiki,
                which can be subject to change
              </span>
            </div>
            <GuessBoard
              guesses={guesses}
              modifiers={modifiers}
            />
          </motion.div>

          <div className="mt-2 text-white flex flex-col items-start gap-1 font-bold uppercase tracking-wider md:max-w-[1000px] w-full">
            <span className="opacity-50">
              GUESSES REMAINING: {guessesLeft} / 6
            </span>

            {!isRoundOver && !isGameOver && (
              <Button
                variant="danger"
                onClick={handleAbandon}
                className="mt-2 bg-white/20"
              >
                ABANDON RUN
              </Button>
            )}

            {hasWon && !isGameOver && (
              <div className="flex flex-col gap-1 items-start mt-2">
                <Typewriter
                  text="STATUS: SUCCESS"
                  className="text-green-500 opacity-50"
                  speed={0.02}
                />
                <Typewriter
                  text={`WAVE ${currentWave} CLEARED`}
                  className="opacity-50"
                  speed={0.02}
                  delay={0.4}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleNextRound}
                    className="opacity-50 hover:opacity-100 mt-2"
                  >
                    CONTINUE
                  </Button>
                </motion.div>
              </div>
            )}

            {isGameOver && gameOverStats && (
              <div className="flex flex-col gap-1 items-start mt-2">
                <Typewriter
                  text="STATUS: TERMINATED"
                  className="text-red-500 opacity-50"
                  speed={0.02}
                />
                <Typewriter
                  text={`WAVES COMPLETED: ${gameOverStats.waves_reached}`}
                  className="opacity-50"
                  speed={0.02}
                  delay={0.4}
                />
                <Typewriter
                  text={`TOTAL GUESSES: ${gameOverStats.total_guesses}`}
                  className="opacity-50"
                  speed={0.02}
                  delay={0.7}
                />
                <Typewriter
                  text={`GUESS ACCURACY: ${gameOverStats.avg_accuracy
                      ? (
                        gameOverStats.avg_accuracy * 20
                      ).toFixed(2)
                      : "0.00"
                    }%`}
                  className="opacity-50"
                  speed={0.02}
                  delay={1.0}
                />
                {gameOverStats.is_new_record && (
                  <Typewriter
                    text="★ NEW BEST ★"
                    className="text-yellow-500 font-black italic tracking-tighter animate-pulse"
                    speed={0.05}
                    delay={1.4}
                  />
                )}

                {revealedEnemy && (
                  <div className="flex flex-col gap-1 items-start mt-4">
                    <Typewriter
                      text="TARGET DESIGNATION: "
                      className="opacity-50 text-xs"
                      speed={0.02}
                      delay={
                        gameOverStats.is_new_record
                          ? 1.8
                          : 1.4
                      }
                    />
                    <div className="flex items-center gap-2">
                      <motion.div
                        initial={{
                          opacity: 0,
                          scale: 0.5,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                        }}
                        transition={{
                          delay:
                            gameOverStats.is_new_record
                              ? 2.8
                              : 2.4,
                          duration: 0.5,
                        }}
                      >
                        <EnemyIcon
                          icons={revealedEnemy.icon}
                          size={32}
                          isSpawn={
                            (revealedEnemy as any)
                              .isSpawn
                          }
                        />
                      </motion.div>
                      <Typewriter
                        text={revealedEnemy.name}
                        className="animate-pulse font-bold"
                        speed={0.04}
                        delay={
                          gameOverStats.is_new_record
                            ? 2.4
                            : 2.0
                        }
                      />
                    </div>
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: revealedEnemy
                      ? gameOverStats.is_new_record
                        ? 3.2
                        : 2.8
                      : gameOverStats.is_new_record
                        ? 1.8
                        : 1.4,
                  }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleNewRun}
                    className="mt-2"
                  >
                    OK
                  </Button>
                </motion.div>
              </div>
            )}
            <div ref={bottomRef} className="h-20" />
          </div>
        </motion.div>
      </div>

      {!isGameOver && modifiers.some((m) => m === "ECLIPSE") ? (
        <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/80" />
      ) : (
        <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/40" />
      )}

      <AlertDialog
        isOpen={isAbandonModalOpen}
        onClose={() => setIsAbandonModalOpen(false)}
        onConfirm={confirmAbandon}
        title="Acknowledge Abandonment"
        description="Are you sure you want to terminate the current run? Your progress will be recorded and the run will end."
        variant="danger"
        confirmText="Terminate Run"
        cancelText="Return"
        isConfirming={isSubmitting}
      />
    </>
  );
};

export default CybergrindClassicPage;
