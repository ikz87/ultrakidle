import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import GraphLevelGuessed from "../../components/ui/GraphLevelGuessed";
import { supabase } from "../../lib/supabaseClient";
import SEO from "../../components/SEO";
import { CURRENT_VERSION, useVersion } from "../../context/VersionContext";
import Button from "../../components/ui/Button";
import { motion, AnimatePresence, animate } from "framer-motion";
import AlertDialog from "../../components/ui/AlertDialog";
import Tooltip from "../../components/ui/Tooltip";
import ModeTabs from "../../components/ui/ModeTabs";
import type { GameMode } from "../../components/ui/ModeTabs";
import { useNavigate } from "react-router-dom";
import { Typewriter } from "../../components/Typewriter";
import { levels } from "../../lib/levels_list";
import { resolveExternalUrl } from "../../lib/urls";
import { useSettings } from "../../context/SettingsContext";
import { useTime } from "../../context/TimeContext";
import HealthBar from "../../components/game/HealthBar";
import RunSummaryModal from "../../components/game/RunSummaryModal";



interface Level {
  id: number;
  level_number: string;
  level_name: string;
}

interface RoundState {
  round_id: number;
  round_number: number;
  started_at: string | null;
  public_image_url: string;
  image_submission_id?: number | null;
  submitter_name: string;
  submitter_avatar: string;
  completed_at?: string | null;
  distance?: number | null;
  score?: number | null;
  time_spent_seconds?: number | null;
  correct_level?: Level | null;
  image_guess_stats?: Record<string, number>;
}

interface GameOverStats {
  highest_wave_reached: number;
  avg_score: number;
  new_record?: boolean;
}

interface BestRecord {
  best_wave: number;
  avg_accuracy: number;
  client_version: string;
}

interface GuessResult {
  round_number: number;
  guessed_level: Level;
  correct_level: Level;
  distance: number;
  score: number;
  time_spent_seconds: number;
  game_over: boolean;
  image_guess_stats?: Map<string, number>;
}

const CybergrindInfernoGuessrPage = () => {
  const { setUpdateAvailable } = useVersion();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { getSyncedTime } = useTime();

  const listRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const nextRoundBtnRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const imgRetryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autoSelectedRef = useRef<number | null>(null);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const MAX_IMG_RETRIES = 5;

  // Global game states
  const [status, setStatus] = useState<"loading" | "no_run" | "active" | "game_over">("loading");
  const [startWaves, setStartWaves] = useState<number[]>([]);
  const [selectedStartWave, setSelectedStartWave] = useState(1);
  const [pagerWave, setPagerWave] = useState(30);
  const [bestRecord, setBestRecord] = useState<BestRecord | null>(null);

  // Active run states
  const [runId, setRunId] = useState<number | null>(null);
  const [currentWave, setCurrentWave] = useState(1);
  const [health, setHealth] = useState(100);
  const [rounds, setRounds] = useState<RoundState[]>([]);
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<GuessResult | null>(null);
  const [isFirstRound, setIsFirstRound] = useState(false);

  // UI interaction states
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingNextWave, setIsFetchingNextWave] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);

  // Play view states
  const [zoom, setZoom] = useState(() =>
    settings.persistImageControls.igCybergrind.zoom
      ? Number(localStorage.getItem("persist_zoom_ig_cybergrind") || 1)
      : 1,
  );
  const [gamma, setGamma] = useState(() =>
    settings.persistImageControls.igCybergrind.gamma
      ? Number(localStorage.getItem("persist_gamma_ig_cybergrind") || 1)
      : 1,
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgRetry, setImgRetry] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);
  const [isListVisible, setIsListVisible] = useState(false);
  const [activeTimer, setActiveTimer] = useState(0);

  const sortedLevels = useMemo(() => [...levels].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)), []);
  const maxSearchLength = useMemo(() => Math.max(...sortedLevels.map((l) => l.name.length)), [sortedLevels]);

  const filteredLevels = useMemo(() => {
    if (!searchQuery.trim()) return sortedLevels;
    const q = searchQuery.toLowerCase().trim().replace(/[-\s]+/g, " ");
    return sortedLevels.filter((l) => {
      const norm = (s: string) => s.toLowerCase().replace(/[-\s]+/g, " ");
      return norm(l.name).includes(q) || norm(l.levelNumber).includes(q);
    });
  }, [searchQuery, sortedLevels]);

  const prefetchImages = (roundsToPrefetch: RoundState[]) => {
    roundsToPrefetch.forEach((r) => {
      if (r.public_image_url) {
        const img = new Image();
        img.src = resolveExternalUrl(r.public_image_url);
      }
      if (r.submitter_avatar) {
        const img = new Image();
        img.src = r.submitter_avatar;
      }
    });
  };

  const handleVersionError = (error: any) => {
    if (error?.message?.includes("CLIENT_OUTDATED")) setUpdateAvailable(true);
  };

  const fetchState = async () => {
    try {
      const { data, error } = await supabase.rpc("get_ig_cybergrind_state");
      if (error) {
        handleVersionError(error);
        throw error;
      }

      if (data.status === "no_run") {
        setStartWaves(data.start_waves || []);
        setBestRecord(data.best || null);

        const savedWave = localStorage.getItem("ultrakidle_ig_cybergrind_start_wave");
        if (savedWave) {
          const waveNum = parseInt(savedWave, 10);
          if (waveNum === 1 || (data.start_waves || []).includes(waveNum)) {
            setSelectedStartWave(waveNum);
            if (waveNum >= 30) setPagerWave(waveNum);
          } else {
            localStorage.removeItem("ultrakidle_ig_cybergrind_start_wave");
            setSelectedStartWave(1);
          }
        } else {
          setSelectedStartWave(1);
        }

        setStatus("no_run");
      } else if (data.status === "active") {
        setStatus("active");
        setRunId(data.run_id);
        setBestRecord(data.best || null);
        setCurrentWave(data.current_wave);
        setHealth(data.health ?? 100);
        setIsFirstRound(data.is_first_round === true);
        setRounds(data.rounds || []);
        prefetchImages(data.rounds || []);

        const currentRound = data.rounds?.[0];
        if (currentRound && currentRound.completed_at !== null && currentRound.completed_at !== undefined) {
          const correctLevelInfo = currentRound.correct_level;
          let guessedLevel = null;

          if (correctLevelInfo) {
            const correctIdx = sortedLevels.findIndex((l) => l.id === correctLevelInfo.id);
            if (correctIdx !== -1) {
              let guessedIdx = correctIdx - (currentRound.distance || 0);
              if (guessedIdx < 0 || guessedIdx >= sortedLevels.length) {
                guessedIdx = correctIdx + (currentRound.distance || 0);
              }
              if (guessedIdx >= 0 && guessedIdx < sortedLevels.length) {
                const lvl = sortedLevels[guessedIdx];
                guessedLevel = {
                  id: lvl.id,
                  level_number: lvl.levelNumber,
                  level_name: lvl.name,
                };
              }
            }
          }

          setLastRoundResult({
            round_number: currentRound.round_number,
            guessed_level: guessedLevel || {
              id: correctLevelInfo?.id || 0,
              level_number: correctLevelInfo?.level_number || "",
              level_name: correctLevelInfo?.level_name || "",
            },
            correct_level: correctLevelInfo ? {
              id: correctLevelInfo.id,
              level_number: correctLevelInfo.level_number,
              level_name: correctLevelInfo.level_name,
            } : { id: 0, level_number: "", level_name: "" },
            distance: currentRound.distance ?? 0,
            score: currentRound.score ?? 0,
            time_spent_seconds: currentRound.time_spent_seconds ?? 0,
            game_over: false,
            image_guess_stats: currentRound.image_guess_stats
              ? new Map<string, number>(
                  Object.entries(currentRound.image_guess_stats).map(([k, v]) => [
                    k,
                    Number(v),
                  ]),
                )
              : undefined,
          });
        } else {
          setLastRoundResult(null);
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

  const updateSelectedStartWave = (wave: number) => {
    setSelectedStartWave(wave);
    localStorage.setItem("ultrakidle_ig_cybergrind_start_wave", wave.toString());
  };

  const handleStartRun = async (wave: number = 1) => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("start_ig_cybergrind_run_bucketless", {
        version: CURRENT_VERSION,
        start_wave: wave,
        caller_id: userData.user.id,
      });

      if (error) {
        handleVersionError(error);
        throw error;
      }

      setStatus("active");
      setRunId(data.run_id);
      if (data.rounds && data.rounds.length > 0) {
        setCurrentWave(data.rounds[0].round_number);
        if (data.started_at) data.rounds[0].started_at = data.started_at;
      } else {
        setCurrentWave(wave);
      }
      setHealth(data.health ?? 100);
      setIsFirstRound(data.is_first_round === true);
      setRounds(data.rounds || []);
      prefetchImages(data.rounds || []);
      setLastRoundResult(null);
      setImageLoaded(false);
      setImgRetry(0);
      setSearchQuery("");
      setZoom(1);
      setGamma(1);
      setPan({ x: 0, y: 0 });
    } catch (err) {
      console.error("Error starting run:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeGuess = async () => {
    if (!selectedLevelId || status !== "active") return;
    const currentRound = rounds[0];
    if (!currentRound) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("submit_ig_cybergrind_guess", {
        p_round_id: currentRound.round_id,
        p_guessed_level_id: selectedLevelId,
        version: CURRENT_VERSION,
      });

      if (error) {
        handleVersionError(error);
        if (error.message?.includes("No active Cybergrind run")) {
          setStatus("loading");
          await fetchState();
          return;
        }
        throw error;
      }

      const result = data as any;
      const processedResult: GuessResult = {
        ...result,
        image_guess_stats: new Map<string, number>(
          Object.entries(result.image_guess_stats || {}).map(([key, value]) => [
            String(key),
            typeof value === "number" ? value : Number(value),
          ]),
        ),
      };

      setLastRoundResult(processedResult);
      setIsFirstRound(false);
      setHealth(result.health);

      if (result.game_over) {
        setGameOverStats({
          highest_wave_reached: result.highest_wave_reached,
          avg_score: result.avg_score,
          new_record: result.new_record,
        });
        setStatus("game_over");
      }

      setSelectedLevelId(null);
      setSearchQuery("");
      const persist = settings.persistImageControls.igCybergrind;
      if (!persist.zoom) setZoom(1);
      if (!persist.gamma) setGamma(1);
      setPan({ x: 0, y: 0 });

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Error submitting guess:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuess = () => {
    if (!selectedLevelId || isSubmitting || status !== "active") return;
    if (settings.confirmDialogs?.igCybergrind) {
      setShowConfirm(true);
    } else {
      executeGuess();
    }
  };

  const handleNextWave = async () => {
    setIsFetchingNextWave(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("advance_ig_cybergrind_setup_bucketless", {
        version: CURRENT_VERSION,
        caller_id: userData.user.id,
      });

      if (error) throw error;

      setCurrentWave(data.current_wave);
      setIsFirstRound(data.is_first_round === true);
      setRounds(data.rounds || []);
      prefetchImages(data.rounds || []);
      setLastRoundResult(null);
      setImageLoaded(false);
      setImgRetry(0);
      setSearchQuery("");
      const persist = settings.persistImageControls.igCybergrind;
      if (!persist.zoom) setZoom(1);
      if (!persist.gamma) setGamma(1);
      setPan({ x: 0, y: 0 });

      setTimeout(() => {
        imageRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 10);
    } catch (err) {
      console.error("Error advancing wave:", err);
    } finally {
      setIsFetchingNextWave(false);
    }
  };

  const confirmAbandon = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("abandon_ig_cybergrind_run");
      if (error) {
        if (error.message?.includes("No active Cybergrind run")) {
          setIsAbandonModalOpen(false);
          setStatus("loading");
          await fetchState();
          return;
        }
        throw error;
      }

      setGameOverStats({
        highest_wave_reached: data.highest_wave_reached,
        avg_score: data.avg_score,
        new_record: data.new_record,
      });
      setStatus("game_over");
      setIsAbandonModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbandon = () => setIsAbandonModalOpen(true);

  const handleHealthDepleted = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("terminate_ig_cybergrind_run");
      if (error) throw error;

      setGameOverStats({
        highest_wave_reached: data.highest_wave_reached,
        avg_score: data.avg_score,
        new_record: data.new_record,
      });
      setStatus("game_over");
    } catch (err) {
      console.error("Error terminating run on health depleted:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer logic
  useEffect(() => {
    let animationFrame: number;

    const update = () => {
      if (status === "active" && !lastRoundResult && rounds.length > 0) {
        const currentRound = rounds[0];
        if (currentRound && currentRound.started_at) {
          const startMs = new Date(currentRound.started_at).getTime();
          const nowMs = getSyncedTime();
          const elapsed = Math.max(0, (nowMs - startMs) / 1000);
          setActiveTimer(elapsed);
        }
      }
      animationFrame = requestAnimationFrame(update);
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [status, lastRoundResult, rounds]);

  // UI Effects
  useEffect(() => {
    if (!listRef.current || status !== "active") return;

    const el = listRef.current;
    el.scrollLeft = el.scrollWidth;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsListVisible(true);
            setTimeout(() => {
              animate(el.scrollLeft, 0, {
                type: "tween",
                ease: "easeOut",
                duration: 0.67,
                onUpdate: (latest) => (el.scrollLeft = latest),
              });
            }, 100);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    if (!lastRoundResult && status === "active") {
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      if (isCoarsePointer) return;

      setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 100);
    }
  }, [lastRoundResult, status]);

  useEffect(() => {
    if (status === "game_over") {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);
    }
  }, [status]);

  useEffect(() => {
    if (lastRoundResult) return;
    if (filteredLevels.length === 1) {
      const id = filteredLevels[0].id;
      if (id !== selectedLevelId) {
        setSelectedLevelId(id);
        autoSelectedRef.current = id;
      }
    } else if (autoSelectedRef.current !== null && selectedLevelId === autoSelectedRef.current) {
      setSelectedLevelId(null);
      autoSelectedRef.current = null;
    }
  }, [filteredLevels, lastRoundResult]);

  useEffect(() => {
    if (zoom === 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  useEffect(() => {
    return () => {
      if (imgRetryTimer.current) clearTimeout(imgRetryTimer.current);
    };
  }, []);

  const handleImageError = () => {
    if (imgRetry >= MAX_IMG_RETRIES) return;
    const delay = Math.min(250 * Math.pow(2, imgRetry), 3000);
    imgRetryTimer.current = setTimeout(() => {
      setImgRetry((r) => r + 1);
    }, delay);
  };

  useEffect(() => {
    if (lastRoundResult && targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [lastRoundResult]);

  useEffect(() => {
    if (!lightboxUrl) return;
    setLightboxZoomed(false);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxUrl]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const selectedLevel = useMemo(
    () => sortedLevels.find((l) => l.id === selectedLevelId),
    [selectedLevelId, sortedLevels]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    const [whole, decimal] = secs.split(".");
    return `${mins}:${whole.padStart(2, "0")}.${decimal}`;
  };

  const tabs = [
    { id: "classic" as GameMode, label: "CLASSIC" },
    { id: "infernoguessr" as GameMode, label: "INFERNOGUESSR" },
  ];

  if (status === "loading") {
    return (
      <>
        <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible" />
        <div className="flex flex-col w-full h-full items-start justify-start">
          <div className="z-40 flex flex-col w-full pt-4 justify-start items-start">
            <p className="text-xl opacity-50 animate-pulse mt-4">INITIALIZING BOARD...</p>
          </div>
        </div>
      </>
    );
  }

  if (status === "no_run") {
    const staticWaves = [5, 10, 15, 20, 25];
    const hasAnyPagerWaves = startWaves.some((w) => w >= 30);
    const isPagerUnlocked = startWaves.includes(pagerWave);
    const maxStartWave = startWaves.length > 0 ? Math.max(...startWaves, 30) : 30;

    const handlePagerChange = (dir: number) => {
      const nextVal = Math.max(30, pagerWave + dir * 5);
      setPagerWave(nextVal);
      if (startWaves.includes(nextVal)) {
        updateSelectedStartWave(nextVal);
      }
    };

    return (
      <>
        <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
          <SEO title="Cybergrind InfernoGuessr" description="Endless enemy-guessing mode (InfernoGuessr style)." />
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col w-full items-start gap-6"
          >
            <div className="flex flex-col gap-0 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left">
              <h1 className="tracking-widest">CYBERGRIND_INFERNOGUESSR</h1>
            </div>

            <ModeTabs activeMode="infernoguessr" onModeChange={(m) => m === "classic" && navigate("/cybergrind/classic")} tabs={tabs} />

            {bestRecord && bestRecord.best_wave > 0 && (
              <div className="flex text-left flex-col gap-1 text-white/50 text-sm font-bold uppercase tracking-widest">
                <span>PERSONAL BEST: WAVE {bestRecord.best_wave}</span>
                <span>ACCURACY: {(bestRecord.avg_accuracy).toFixed(2)}%</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-white/50 text-sm font-bold uppercase tracking-widest">START WAVE:</span>
              <div className="gap-2 grid grid-cols-3">
                <Button onClick={() => updateSelectedStartWave(1)} variant={selectedStartWave === 1 ? "primary" : "outline"}>1</Button>
                {staticWaves.map((w) => {
                  const unlocked = startWaves.includes(w);
                  const button = (
                    <span className={!unlocked ? "cursor-not-allowed" : ""}>
                      <Button
                        onClick={() => unlocked && updateSelectedStartWave(w)}
                        variant={selectedStartWave === w ? "primary" : "outline"}
                        disabled={!unlocked}
                        className={!unlocked ? "opacity-30 pointer-events-none w-full" : "w-full"}
                      >{w}</Button>
                    </span>
                  );
                  return unlocked ? (
                    <Fragment key={w}>{button}</Fragment>
                  ) : (
                    <Tooltip key={w} content={`Reach wave ${w * 2} to unlock`} wrapperClassName="">{button}</Tooltip>
                  );
                })}
              </div>

              {hasAnyPagerWaves && (
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="outline" onClick={() => handlePagerChange(-1)} disabled={pagerWave <= 30}>&lt;&lt;</Button>
                  <div className="flex-1 min-w-[100px]">
                    {!isPagerUnlocked ? (
                      <Tooltip content={`Reach wave ${pagerWave * 2} to unlock`} wrapperClassName="w-full">
                        <Button variant="outline" disabled className="opacity-30 pointer-events-none w-full">{pagerWave}</Button>
                      </Tooltip>
                    ) : (
                      <Button onClick={() => updateSelectedStartWave(pagerWave)} variant={selectedStartWave === pagerWave ? "primary" : "outline"} className="w-full">{pagerWave}</Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => handlePagerChange(1)} disabled={pagerWave >= maxStartWave}>&gt;&gt;</Button>
                </div>
              )}
            </div>

            <Button variant="outline" size="lg" onClick={() => handleStartRun(selectedStartWave)} disabled={isSubmitting} className="mt-2">
              {isSubmitting ? "INITIALIZING..." : "START RUN"}
            </Button>
          </motion.div>
        </div>
      </>
    );
  }



  const currentRound = rounds[0];
  const displayLevels = searchQuery.trim() ? filteredLevels : sortedLevels;
  const isGameOver = lastRoundResult?.game_over === true || status === "game_over";

  return (
    <>
      <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
        <SEO title={`Cybergrind - Wave ${currentWave}`} description="Endless enemy-guessing mode." />
        
        <AlertDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            executeGuess();
          }}
          title="CONFIRM GUESS"
          description={
            selectedLevel ? (
              <span>Are you sure you want to guess <span className="text-white font-bold">{selectedLevel.levelNumber}: {selectedLevel.name}</span>?</span>
            ) : ("")
          }
          confirmText="SUBMIT"
          cancelText="CANCEL"
        />

        <AlertDialog
          isOpen={isAbandonModalOpen}
          onClose={() => setIsAbandonModalOpen(false)}
          onConfirm={confirmAbandon}
          title="ABANDON RUN"
          description="Are you sure you want to abandon the current run? Your progress will be saved."
          confirmText="ABANDON"
          cancelText="CANCEL"
        />

        <motion.div
          key="cybergrind-active"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col w-full items-start"
        >
          <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
            <h1 className="tracking-widest flex-1">CYBERGRIND_INFERNOGUESSR</h1>
          </div>

          <ModeTabs activeMode="infernoguessr" onModeChange={(m) => m === "classic" && navigate("/cybergrind/classic")} tabs={tabs} />

          <div className="flex flex-col md:flex-row justify-between w-full md:max-w-[1000px] border-b border-white/5 mb-2 mt-2">
             <div className="flex flex-col gap-1">
               <div className="flex items-baseline gap-2">
                 <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">WAVE:</span>
                 <span className="text-2xl font-black text-white italic leading-none">{currentWave}</span>
                 {bestRecord && (
                   <span className="text-white/30 text-sm text-left font-bold uppercase tracking-wider">
                     (BEST: {bestRecord.best_wave})
                   </span>
                 )}
               </div>
             </div>
             {!lastRoundResult && (
               <div className="flex items-baseline gap-2 mt-2 md:mt-0">
                 <span className="text-white/60 font-bold uppercase tracking-widest whitespace-nowrap">TIME:</span>
                 <span className="text-xl font-bold text-white leading-none">{formatTime(activeTimer)}</span>
               </div>
             )}
          </div>

          {currentRound && (
            <div className="flex flex-col md:max-w-[1000px] w-full gap-4">
              <div ref={imageRef} className="relative aspect-video bg-black border border-white/10 overflow-hidden group scroll-mt-10">
                <div
                  className="h-full w-full select-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    filter: `brightness(${gamma})`,
                    cursor: zoom > 1 ? (isDragging.current ? "grabbing" : "grab") : "default",
                    touchAction: zoom > 1 ? "none" : "auto",
                  }}
                >
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                      <span className="text-white/30 text-xs uppercase tracking-widest animate-pulse">LOADING IMAGE...</span>
                    </div>
                  )}
                  <img
                    src={
                      currentRound.public_image_url
                        ? resolveExternalUrl(currentRound.public_image_url) +
                          (imgRetry > 0
                            ? (currentRound.public_image_url.includes("?") ? "&" : "?") +
                              `_r=${imgRetry}`
                            : "")
                        : ""
                    }
                    alt="Target"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                    onLoad={() => {
                      setImageLoaded(true);
                      if (imgRetryTimer.current) clearTimeout(imgRetryTimer.current);
                    }}
                    onError={handleImageError}
                  />
                </div>
                <div className="absolute bottom-3 right-3 flex flex-col gap-2 transition-opacity z-10">
                  <div className="bg-black/80 p-2 border border-white/10 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest">Zoom: {zoom}x</label>
                      <input
                        type="range"
                        min="1"
                        max="4"
                        step="0.1"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-24 md:w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-white/40 uppercase tracking-widest">Gamma: {gamma}</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={gamma}
                        onChange={(e) => setGamma(parseFloat(e.target.value))}
                        className="w-24 md:w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 bg-black/60 border border-white/10 z-10">
                  <span className="text-[12px] text-white/50 uppercase tracking-widest">CAPTURED BY:</span>
                  <img src={currentRound.submitter_avatar} alt="" className="w-4 h-4 rounded-full border border-white/20" />
                  <span className="text-white font-bold text-[12px]">{currentRound.submitter_name}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center border border-white/10 p-3 gap-3 bg-white/[0.02]">
                <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="w-14 aspect-video bg-black/40 border border-white/10 overflow-hidden flex-shrink-0">
                    {selectedLevel?.thumbnail ? (
                      <img src={resolveExternalUrl(selectedLevel.thumbnail)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20 text-[6px]">—</div>
                    )}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest">Selection</span>
                    <span className="text-white/70 font-bold tracking-wider uppercase truncate max-w-full text-sm">
                      {selectedLevel ? `${selectedLevel.levelNumber}: ${selectedLevel.name}` : "—"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleGuess}
                  disabled={!selectedLevelId || lastRoundResult !== null || isSubmitting || status !== "active"}
                  className="px-8 w-full sm:w-auto"
                >
                  {isSubmitting ? "PROCESSING..." : "SUBMIT"}
                </Button>
              </div>

              <div className="w-full mb-2">
                <HealthBar
                  initialHealth={health}
                  waveNumber={currentWave}
                  startTime={currentRound?.started_at ?? null}
                  onHealthDepleted={handleHealthDepleted}
                  isGameOver={isGameOver}
                  isDecaying={!lastRoundResult}
                  isFirstRound={isFirstRound}
                />
              </div>

              {!lastRoundResult && status === "active" && (
                <div className="w-full">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (val.length <= maxSearchLength) setSearchQuery(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && selectedLevelId && !isSubmitting) {
                        handleGuess();
                      }
                    }}
                    placeholder="Search levels..."
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 uppercase tracking-wider outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              )}

              <motion.div
                className="w-full overflow-x-auto custom-scrollbar pb-2 will-change-transform"
                initial={{ opacity: 0 }}
                animate={{ opacity: isListVisible ? 1 : 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                ref={listRef}
              >
                <div className="flex px-2 gap-2 min-w-max py-2">
                  {displayLevels.map((level) => {
                    const globalIndex = sortedLevels.findIndex((l) => l.id === level.id);
                    const isCorrect = lastRoundResult && level.id === lastRoundResult.correct_level.id;
                    const isSelected = level.id === selectedLevelId;
                    const isGuessed = lastRoundResult && level.id === lastRoundResult.guessed_level.id;

                    const guessIdx = lastRoundResult ? sortedLevels.findIndex((l) => l.id === lastRoundResult.guessed_level.id) : -1;
                    const correctIdx = lastRoundResult ? sortedLevels.findIndex((l) => l.id === lastRoundResult.correct_level.id) : -1;
                    const minIdx = Math.min(guessIdx, correctIdx);
                    const maxIdx = Math.max(guessIdx, correctIdx);

                    const isInBetween = lastRoundResult && globalIndex >= minIdx && globalIndex <= maxIdx && !isCorrect && !isGuessed;

                    return (
                      <button
                        key={level.id}
                        ref={isCorrect ? targetRef : null}
                        onClick={() => !lastRoundResult && status === "active" && setSelectedLevelId(level.id)}
                        className={`group relative flex flex-col hover:cursor-pointer items-center gap-1 min-w-32 w-[15vw] max-w-48 flex-shrink-0 transition-all ${
                          isSelected ? "scale-105 opacity-100 grayscale-0" :
                          lastRoundResult && (isCorrect || isGuessed || isInBetween) ? "scale-105 opacity-100 grayscale-0" :
                          "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                        }`}
                      >
                        <div className={`w-full aspect-video border-2 transition-colors duration-500 overflow-hidden relative ${
                          isSelected ? "border-white/70" :
                          lastRoundResult && isCorrect ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]" :
                          isGuessed ? "border-red-400" :
                          isInBetween ? "border-red-500/50" : "border-white/10"
                        }`}>
                          <img
                            src={resolveExternalUrl(level.thumbnail || "")}
                            alt={level.name}
                            className={`w-full h-full object-cover transition-all duration-500 ${
                              lastRoundResult && isCorrect ? "brightness-110" : isInBetween ? "brightness-75" : ""
                            }`}
                          />
                          {isInBetween && <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none z-10" />}
                        </div>
                        <span className={`text-base truncate w-full text-center transition-colors ${
                          isSelected ? "text-white" :
                          lastRoundResult && isCorrect ? "text-green-500" :
                          isGuessed ? "text-red-400" :
                          isInBetween ? "text-red-400" : "text-white/50 group-hover:text-white"
                        }`}>
                          {level.levelNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              <div className="text-white flex flex-col items-start gap-1 font-bold uppercase tracking-wider md:max-w-[1000px] w-full">
                {!lastRoundResult && status === "active" && (
                  <Button variant="danger" onClick={handleAbandon} className="mt-2 bg-white/20">ABANDON RUN</Button>
                )}

                {status === "active" && lastRoundResult && (
                  <div className="flex flex-col gap-1 items-start mt-4 w-full">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 w-full">
                      <div className="flex flex-col gap-1 items-start flex-shrink-0">
                        <Typewriter
                          text={`DISTANCE: ${lastRoundResult.distance}`}
                          className="opacity-50"
                          speed={0.02}
                          delay={0.2}
                        />
                        <Typewriter
                          text={`TIME: ${(
                            lastRoundResult.time_spent_seconds ?? 0
                          ).toFixed(3)}`}
                          className="opacity-50"
                          speed={0.02}
                          delay={0.4}
                        />
                        {lastRoundResult.distance < 2 ? (
                          lastRoundResult.distance === 0 ? (
                            <Typewriter
                              text="HEALTH +20"
                              className="text-green-500 font-bold"
                              speed={0.02}
                              delay={0.6}
                            />
                          ) : (
                            <Typewriter
                              text="HEALTH +0"
                              className="text-green-500/50 font-bold"
                              speed={0.02}
                              delay={0.6}
                            />
                          )
                        ) : (
                          <Typewriter
                            text={`HEALTH -${
                              (100 - lastRoundResult.score) / 2
                            }`}
                            className="text-red-500 font-bold"
                            speed={0.02}
                            delay={0.6}
                          />
                        )}
                        <div className="md:block hidden">
                          <Typewriter
                            text={`(CLICK OR PRESS ENTER)`}
                            className="text-sm opacity-50"
                            speed={0.02}
                            delay={0.8}
                          />
                        </div>
                      </div>
                      {lastRoundResult.image_guess_stats && (
                        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                          <GraphLevelGuessed
                            guessesFromPlayers={lastRoundResult.image_guess_stats}
                            correct_level_id={lastRoundResult.correct_level.id}
                            player_guess_id={lastRoundResult.guessed_level.id}
                          />
                        </div>
                      )}
                    </div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      onAnimationComplete={() => {
                        nextRoundBtnRef.current?.focus({ preventScroll: true });
                      }}
                    >
                      {isGameOver ? (
                        <Button
                          ref={nextRoundBtnRef}
                          variant="outline"
                          size="lg"
                          onClick={() => {
                             setStatus("game_over");
                          }}
                          className="opacity-50 hover:opacity-100 mt-2"
                        >
                          CONTINUE
                        </Button>
                      ) : (
                        <Button
                          ref={nextRoundBtnRef}
                          variant="outline"
                          size="lg"
                          onClick={handleNextWave}
                          disabled={isFetchingNextWave}
                          className="opacity-50 hover:opacity-100 mt-2"
                        >
                          {isFetchingNextWave ? "LOADING..." : "NEXT WAVE"}
                        </Button>
                      )}
                    </motion.div>
                  </div>
                )}

                {/* If game over is due to a wrong guess, show the guess details above the game over stats */}
                {status === "game_over" && lastRoundResult?.game_over && (
                  <div className="flex flex-col gap-1 items-start mt-4 w-full">
                    <div className="flex flex-col md:flex-row md:items-end gap-4 w-full">
                      <div className="flex flex-col gap-1 items-start flex-shrink-0">
                        <Typewriter
                          text={`DISTANCE: ${lastRoundResult.distance}`}
                          className="opacity-50"
                          speed={0.02}
                          delay={0.2}
                        />
                        <Typewriter
                          text={`TIME: ${(
                            lastRoundResult.time_spent_seconds ?? 0
                          ).toFixed(3)}`}
                          className="opacity-50"
                          speed={0.02}
                          delay={0.4}
                        />
                        <Typewriter
                          text={`HEALTH -${
                            (100 - (lastRoundResult.score ?? 0)) / 2
                          }`}
                          className="text-red-500 font-bold"
                          speed={0.02}
                          delay={0.6}
                        />
                      </div>
                      {lastRoundResult.image_guess_stats && (
                        <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                          <GraphLevelGuessed
                            guessesFromPlayers={lastRoundResult.image_guess_stats}
                            correct_level_id={lastRoundResult.correct_level.id}
                            player_guess_id={lastRoundResult.guessed_level.id}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {status === "game_over" && gameOverStats && (() => {
                  const delayOffset = lastRoundResult?.game_over ? 0.8 : 0;
                  return (
                    <div className="flex flex-col gap-1 items-start mt-4 w-full">
                      <Typewriter
                        text="STATUS: TERMINATED"
                        className="text-red-500 opacity-50"
                        speed={0.02}
                      />
                      <Typewriter 
                        text={`WAVES COMPLETED: ${gameOverStats.highest_wave_reached}`}
                        className="opacity-50" 
                        speed={0.02} 
                        delay={delayOffset + 0.2} 
                      />
                      <Typewriter
                        text={`GUESS ACCURACY: ${(gameOverStats.avg_score ?? 0).toFixed(2)}%`}
                        className="opacity-50"
                        speed={0.02}
                        delay={delayOffset + 0.4}
                      />
                      {gameOverStats.new_record && (
                      <Typewriter
                        text="★ NEW BEST ★"
                        className="text-yellow-500 font-black italic tracking-tighter animate-pulse"
                        speed={0.05}
                        delay={1.4}
                      />
                      )}
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        transition={{ delay: delayOffset + 0.8 }} 
                        className="mt-6 flex flex-row gap-2"
                      >
                         <Button variant="outline" size="lg" onClick={() => setIsSummaryModalOpen(true)}>
                          VIEW SUMMARY
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => {
                          setStatus("loading");
                          fetchState();
                        }}>
                          OK
                        </Button>
                      </motion.div>
                    </div>
                  );
                })()}
                <div ref={resultsRef} />
              </div>

            </div>
          )}
        </motion.div>

        <RunSummaryModal 
          isOpen={isSummaryModalOpen} 
          onClose={() => setIsSummaryModalOpen(false)} 
          runId={runId} 
        />
        
        <AnimatePresence>
          {lightboxUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-50 bg-black/90 backdrop-blur-sm ${lightboxZoomed ? "overflow-auto" : "flex items-center justify-center"}`}
              onClick={() => setLightboxUrl(null)}
            >
              <div
                className={lightboxZoomed ? "min-h-full min-w-full flex items-center justify-center p-4" : "flex items-center justify-center"}
                onClick={(e) => {
                  if (lightboxZoomed) {
                    e.stopPropagation();
                    setLightboxUrl(null);
                  }
                }}
              >
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={lightboxUrl}
                  alt=""
                  className={lightboxZoomed ? "max-w-none cursor-zoom-out" : "max-w-[70vw] max-h-[70vh] object-contain cursor-zoom-in"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxZoomed((z) => !z);
                  }}
                  draggable={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CybergrindInfernoGuessrPage;
