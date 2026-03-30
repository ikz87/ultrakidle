import { useState, useEffect, useRef } from "react";
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

const defaultHintData = { value: "", result: "gray" } as any;

const mapHintDataToGuessResult = (
  guess_enemy_id: number,
  hint_data: any,
  is_penance: boolean,
): GuessResult => {
  const enemyData = enemies.find((e) => e.id === guess_enemy_id);
  const enemy_name = enemyData ? enemyData.name : "UNKNOWN";

  return {
    guess_id: guess_enemy_id,
    enemy_name,
    correct: hint_data.correct,
    is_penance,
    properties: {
      enemy_type: hint_data.properties.enemy_type || defaultHintData,
      weight_class: hint_data.properties.weight_class || defaultHintData,
      health: hint_data.properties.health || defaultHintData,
      level_count: hint_data.properties.level_count || defaultHintData,
      appearance: hint_data.properties.appearance || defaultHintData,
    },
  };
};

const CybergrindClassicPage = () => {
  const { setUpdateAvailable } = useVersion();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<
    "loading" | "no_run" | "active" | "game_over"
  >("loading");
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [radianceTarget, setRadianceTarget] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [guessCount, setGuessCount] = useState<number>(0);
  const [roundId, setRoundId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldFlash, setShouldFlash] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [stats, setStats] = useState<{
    waves_reached: number;
    is_new_record: boolean;
    correct_id?: number;
  } | null>(null);

  const handleNewRun = async () => {
    setStats(null);
    setGuesses([]);
    setGuessCount(0);
    setRoundId(null);
    setModifiers([]);
    setRadianceTarget(null);
    setCurrentWave(1);
    setStatus("loading");
    try {
      await handleStartRun();
    } catch {
      setStatus("no_run");
    }
  };

  const startingRef = useRef(false);

const handleStartRun = async () => {
  if (startingRef.current) return;
  startingRef.current = true;
  setIsSubmitting(true);
  try {
    const { data, error } = await supabase.rpc("start_cybergrind_run", {
      version: CURRENT_VERSION,
    });

    if (error) {
      if (error.message.includes("CLIENT_OUTDATED"))
        setUpdateAvailable(true);
      throw error;
    }

    setStatus("active");
    setRoundId(data.round_id);
    setCurrentWave(data.round_number);
    setModifiers(data.modifiers || []);
    setRadianceTarget(null);
    setGuesses([]);
    setGuessCount(0);
  } catch (err) {
    console.error("Error starting cybergrind run:", err);
    throw err;
  } finally {
    setIsSubmitting(false);
    startingRef.current = false;
  }
};

  const fetchState = async () => {
    try {
      const { data, error } = await supabase.rpc("get_cybergrind_state");
      if (error) throw error;

      if (data.status === "no_run") {
        await handleStartRun();
      } else if (data.status === "active") {
        setStatus("active");
        setRoundId(data.round_id);
        setCurrentWave(data.current_wave);
        setModifiers(data.modifiers || []);
        setRadianceTarget(data.radiance_target || null);
        setGuessCount(data.guess_count || 0);

        if (data.guesses) {
          const mappedGuesses = data.guesses.map((g: any) =>
            mapHintDataToGuessResult(
              g.guess_enemy_id,
              g.hint_data,
              g.is_penance,
            ),
          );
          setGuesses(mappedGuesses);
        } else {
          setGuesses([]);
        }
      }
    } catch (err) {
      console.error("Error fetching cybergrind state:", err);
      setStatus("no_run");
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const getLetheLimit = () => {
    if (!modifiers.includes("LETHE")) return Infinity;
    return radianceTarget === "LETHE" ? 1 : 2;
  };

  const handleGuess = async (enemyId: number) => {
    if (isSubmitting || status !== "active" || !roundId) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(
        "submit_cybergrind_guess",
        {
          guess_id: enemyId,
          p_round_id: roundId,
          version: CURRENT_VERSION,
        },
      );

      if (error) {
        if (error.message.includes("CLIENT_OUTDATED"))
          setUpdateAvailable(true);
        throw error;
      }

      const newGuess = mapHintDataToGuessResult(
        enemyId,
        data.hint_data,
        false,
      );
      const limit = getLetheLimit();
      setGuesses((prev) => {
        const updated = [...prev, newGuess];
        return limit < Infinity ? updated.slice(-limit) : updated;
      });
      setGuessCount((prev) => prev + 1);

      if (data.hint_data.correct) {
        setShouldFlash(true);
        setTimeout(() => setShouldFlash(false), 1500);
      } else if (data.game_over) {
        setStats({
          waves_reached: data.waves_reached,
          is_new_record: data.is_new_record,
          correct_id: data.correct_id,
        });
        setStatus("game_over");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbandon = () => {
    setIsAbandonModalOpen(true);
  };

  const confirmAbandon = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("abandon_cybergrind_run", {
        version: CURRENT_VERSION,
      });
      if (error) throw error;
      setStats({
        waves_reached: data.waves_reached,
        is_new_record: data.is_new_record,
        correct_id: data.correct_id,
      });
      setStatus("game_over");
      setIsAbandonModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextRound = async () => {
    setGuesses([]);
    setTimeout(async () => {
      await fetchState();
    }, 400);
  };

  const hasWon = guesses.some((g) => g.correct);
  const hasReachedLimit = guessCount >= 6 && !hasWon;
  const isRoundOver = hasWon || hasReachedLimit;
  const isGameOver = status === "game_over";

  const revealedEnemy =
    isGameOver && stats?.correct_id
      ? enemies.find((e) => e.id === stats.correct_id)
      : null;

  useEffect(() => {
    if (status !== "loading" && (isRoundOver || isGameOver)) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [status, isRoundOver, isGameOver]);

  if (status === "loading") {
    return (
      <>
        <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible"></div>
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
            <div className="flex items-baseline gap-2">
              <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">
                WAVE:
              </span>
              <span className="text-2xl font-black text-white italic leading-none">
                {currentWave}
              </span>
            </div>

            <div className="flex items-baseline gap-2 min-h-6">
              <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">
                MODIFIERS:
              </span>
              <div className="flex gap-2 items-center flex-wrap">
                {modifiers.length > 0 ? (
                  modifiers.map((mod) => {
                    const isRadiance = mod === "RADIANCE";
                    const isTarget = mod === radianceTarget;

                    const tooltipMap: Record<string, string> = {
                      PENANCE:
                      "Automatically select a wrong guess at the start of the round. Hints for this guess are always visible and truthful",
                      FALSIFIER:
                      "Flips the arrow of a random hint. Only triggers if there is a hint where this can be applied",
                      SETHE:
                      "You can only see your 2 most recent guesses",
                      ECLIPSE:
                      "Completely obscures a random column without arrows for the entire round",
                      RADIANCE:
                      "Double the effects of another randomly selected modifier",
                    };

                    const baseTooltip = tooltipMap[mod] || mod;
                    const tooltip = isTarget
                      ? `${baseTooltip} | RADIANCE: Effect is doubled`
                      : baseTooltip;

                    return (
                      <Tooltip
                        key={mod}
                        content={tooltip}
                        wrapperClassName=""
                      >
                        <span
                          className={`font-bold uppercase italic tracking-wider cursor-help ${
isRadiance
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
              disabled={isSubmitting || isRoundOver || isGameOver}
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
                : { backgroundColor: "rgba(255, 255, 255, 0)" }
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
                * All data mirrors that of the official wiki, which can
                be subject to change
              </span>
            </div>
            <GuessBoard guesses={guesses} modifiers={modifiers} />
          </motion.div>

          <div className="mt-2 text-white flex flex-col items-start gap-1 font-bold uppercase tracking-wider md:max-w-[1000px] w-full">
            <span className="opacity-50">
              GUESSES REMAINING: {Math.max(0, 6 - guessCount)} / 6
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

            {isGameOver && stats && (
              <div className="flex flex-col gap-1 items-start mt-2">
                <Typewriter
                  text="STATUS: TERMINATED"
                  className="text-red-500 opacity-50"
                  speed={0.02}
                />
                <Typewriter
                  text={`WAVES REACHED: ${stats.waves_reached}`}
                  className="opacity-50"
                  speed={0.02}
                  delay={0.4}
                />
                {stats.is_new_record && (
                  <Typewriter
                    text="★ NEW BEST ★"
                    className="text-yellow-500 font-black italic tracking-tighter animate-pulse"
                    speed={0.05}
                    delay={0.8}
                  />
                )}

                {revealedEnemy && (
                  <div className="flex flex-col gap-1 items-start mt-4">
                    <Typewriter
                      text="TARGET DESIGNATION: "
                      className="opacity-50 text-xs"
                      speed={0.02}
                      delay={1.2}
                    />
                    <div className="flex items-center gap-2">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2.2, duration: 0.5 }}
                      >
                        <EnemyIcon
                          icons={revealedEnemy.icon}
                          size={32}
                        />
                      </motion.div>
                      <Typewriter
                        text={revealedEnemy.name}
                        className="animate-pulse font-bold"
                        speed={0.04}
                        delay={1.8}
                      />
                    </div>
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    delay: revealedEnemy ? 2.5 : 1.2,
                  }}
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleNewRun}
                    className="mt-2"
                  >
                    NEW RUN
                  </Button>
                </motion.div>
              </div>
            )}
            <div ref={bottomRef} className="h-20" />
          </div>
        </motion.div>
      </div>

      {(!isGameOver && modifiers.some((m) => m === "ECLIPSE") && (
        <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/80"></div>
      )) || (
          <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/40"></div>
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
