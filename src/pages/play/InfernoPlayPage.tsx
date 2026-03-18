import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "../../components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import ModeTabs from "../../components/ui/ModeTabs";
import type { GameMode } from "../../components/ui/ModeTabs";
import { levels } from "../../lib/levels_list";
import { resolveExternalUrl } from "../../lib/urls";
import Button from "../../components/ui/Button";
import { supabase } from "../../lib/supabaseClient";
import { CURRENT_VERSION, useVersion } from "../../context/VersionContext";
import { Typewriter } from "../../components/Typewriter";
import { getMsUntilNicaraguaMidnight } from "../../lib/time";

interface Submitter {
  name: string;
  avatar_url: string;
}

interface Level {
  id: number;
  level_number: string;
  level_name: string;
}

interface RoundResult {
  round_number: number;
  image_url: string;
  distance: number;
  score: number;
  time_spent_seconds: number;
  guessed_level: Level;
  correct_level: Level;
  submitted_by: Submitter;
}

interface GameInProgress {
  status: "in_progress";
  set_id: number;
  round_number: number;
  round_id: string;
  image_url: string;
  elapsed_seconds: number;
  submitted_by: Submitter;
  previous_rounds: RoundResult[];
}

interface GameCompleted {
  status: "completed";
  set_id: number;
  total_score: number;
  rounds: RoundResult[];
}

interface NoGameToday {
  status: "no_game_today";
}

type GameData = GameInProgress | GameCompleted | NoGameToday;

const InfernoPlayPage = () => {
  const navigate = useNavigate();
  const { setUpdateAvailable } = useVersion();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isFetchingNextRound, setIsFetchingNextRound] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [gamma, setGamma] = useState(1);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<RoundResult | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  //   const [pendingNextRound, setPendingNextRound] =
  //     useState<GameInProgress | null>(null);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [imgRetry, setImgRetry] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [dailyChanged, setDailyChanged] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  const [activeTimer, setActiveTimer] = useState(0);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const imgRetryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const MAX_IMG_RETRIES = 5;

  const tabs: { id: GameMode; label: string }[] = [
    { id: "classic", label: "CLASSIC" },
    { id: "infernoguessr", label: "INFERNOGUESSR" },
  ];

  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    []
  );

  const filteredLevels = useMemo(() => {
    if (!searchQuery.trim()) return sortedLevels;
    const q = searchQuery.toLowerCase().trim();
    return sortedLevels.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.levelNumber.toLowerCase().includes(q)
    );
  }, [searchQuery, sortedLevels]);

  const fetchGameState = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "get_inferno_round",
        { version: CURRENT_VERSION }
      );

      if (rpcError) {
        if (rpcError.message.includes("CLIENT_OUTDATED")) {
          setUpdateAvailable(true);
          if (!silent) setError("Client version is outdated. Please refresh.");
        } else {
          if (!silent) setError(rpcError.message);
        }
        return;
      }

      const res = data as GameData;
      setGameData(res);

      if (res.status === "in_progress") {
        setActiveTimer(res.elapsed_seconds);
      } else if (res.status === "completed") {
        setIsGameFinished(true);
        setShowFinalResults(true);
      }
    } catch (err) {
      console.error("Fetch game state error:", err);
      if (!silent) setError("Failed to load game state.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let animationFrame: number;
    let lastUpdate = Date.now();

    const update = () => {
      if (gameData?.status === "in_progress" && !lastRoundResult) {
        const now = Date.now();
        const delta = (now - lastUpdate) / 1000;
        setActiveTimer((prev) => prev + delta);
        lastUpdate = now;
        animationFrame = requestAnimationFrame(update);
      }
    };

    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [gameData?.status, lastRoundResult]);

  useEffect(() => {
    if (
      !lastRoundResult &&
      filteredLevels.length === 1 &&
      filteredLevels[0].id !== selectedLevelId
    ) {
      setSelectedLevelId(filteredLevels[0].id);
    }
  }, [filteredLevels, lastRoundResult]);

  useEffect(() => {
    fetchGameState();
  }, []);

  useEffect(() => {
    let timeoutId: any;

    const scheduleReset = () => {
      const msUntilMidnight = getMsUntilNicaraguaMidnight();
      timeoutId = setTimeout(() => {
        setDailyChanged(true);
        scheduleReset();
      }, msUntilMidnight);
    };

    scheduleReset();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleGuess = async () => {
    if (!selectedLevelId || isSubmitting || gameData?.status !== "in_progress")
      return;

    setIsSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "submit_inferno_guess",
        {
          p_round_id: gameData.round_id,
          p_guessed_level_id: selectedLevelId,
          version: CURRENT_VERSION,
        }
      );

      if (rpcError) {
        if (rpcError.message.includes("CLIENT_OUTDATED")) {
          setUpdateAvailable(true);
          setError("Client version is outdated. Please refresh.");
        } else if (
          rpcError.message.includes("Game already completed") ||
          rpcError.message.includes("Invalid round sequence") ||
          rpcError.message.includes("Duplicate guess detected") ||
          rpcError.message.includes("Round not found")
        ) {
          await fetchGameState();
        } else {
          setError(rpcError.message);
        }
        return;
      }

      const result = data as any;
      const currentRoundResult: RoundResult = {
        round_number: result.round_number,
        guessed_level: result.guessed_level,
        correct_level: result.correct_level,
        distance: result.distance,
        score: result.score,
        time_spent_seconds: result.time_spent_seconds,
        image_url: gameData.image_url,
        submitted_by: gameData.submitted_by,
      };

      setLastRoundResult(currentRoundResult);

      if (result.game_complete) {
        setIsGameFinished(true);
      }
      setSelectedLevelId(null);
      setSearchQuery("");
      setZoom(1);
      setGamma(1);
      setPan({ x: 0, y: 0 });

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Submit guess error:", err);
      setError("Failed to submit guess.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextRound = async () => {
    setIsFetchingNextRound(true);
    try {
      await fetchGameState({ silent: true });
      setLastRoundResult(null);
      setImageLoaded(false);
      setImgRetry(0);
      setSearchQuery("");
      setTimeout(() => {
        document
          .getElementById("main-scroll-container")
          ?.scrollTo({ top: 0, behavior: "smooth" });
      }, 10);
    } finally {
      setIsFetchingNextRound(false);
    }
  };

  const viewFinalResults = async () => {
    await fetchGameState({ silent: true });
    setLastRoundResult(null);
    setImageLoaded(false);
    setImgRetry(0);
    setSearchQuery("");
    setTimeout(() => {
      document
        .getElementById("main-scroll-container")
        ?.scrollTo({ top: 0, behavior: "smooth" });
    }, 10);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1); // Show 1 decimal point for "active" feel
    const [whole, decimal] = secs.split(".");
    return `${mins}:${whole.padStart(2, "0")}.${decimal}`;
  };

  const totalTimeSeconds = useMemo(() => {
    if (gameData?.status !== "completed") return 0;
    return gameData.rounds.reduce((acc, r) => acc + r.time_spent_seconds, 0);
  }, [gameData]);

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

  if (loading) {
    return (
      <>
        <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible" />
        <div className="flex flex-col w-full h-full items-start justify-start">
          <div className="z-40 flex flex-col w-full pt-4 justify-start items-start">
            <ModeTabs
              activeMode="infernoguessr"
              onModeChange={(mode) => navigate(`/play/${mode}`)}
              tabs={tabs}
            />
            <p className="text-xl opacity-50 animate-pulse mt-4">
              INITIALIZING BOARD...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible" />
        <div className="z-40 flex flex-col w-full pt-4 min-h-screen justify-start items-start text-white">
          <ModeTabs
            activeMode="infernoguessr"
            onModeChange={(mode) => navigate(`/play/${mode}`)}
            tabs={tabs}
          />
          <div className="mt-4 flex flex-col items-start gap-4">
            <span className="text-red-500 opacity-50 font-bold tracking-widest uppercase">
              ERROR: {error}
            </span>
            <Button variant="ghost" onClick={() => fetchGameState()}>
              ↻ RETRY
            </Button>
          </div>
        </div>
      </>
    );
  }

  const safeGameData = gameData!;

  if (safeGameData.status === "no_game_today") {
    return (
      <>
        <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible" />
        <div className="z-40 flex flex-col w-full pt-4 min-h-screen justify-start items-start text-white">
          <ModeTabs
            activeMode="infernoguessr"
            onModeChange={(mode) => navigate(`/play/${mode}`)}
            tabs={tabs}
          />
          <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0 mt-4">
            <h1 className="tracking-widest">DAILY_LOCATION</h1>
          </div>
          <span className="opacity-30 uppercase tracking-widest">
            No mission available
          </span>
        </div>
      </>
    );
  }

  const currentInProgressRound =
    safeGameData.status === "in_progress"
      ? (safeGameData as GameInProgress)
      : null;

  const displayRound =
    currentInProgressRound ||
    (safeGameData.status === "completed"
      ? safeGameData.rounds[safeGameData.rounds.length - 1]
      : null);

  if (!displayRound) return null;

  const displayLevels = searchQuery.trim() ? filteredLevels : sortedLevels;

  return (
    <>
      <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start text-white">
        <SEO
          title={
            showFinalResults
              ? "InfernoGuessr - Results"
              : `InfernoGuessr - Round ${displayRound.round_number}`
          }
          description="Identify the level from the screenshot."
        />

        <ModeTabs
          activeMode="infernoguessr"
          onModeChange={(mode) => navigate(`/play/${mode}`)}
          tabs={tabs}
        />

        <motion.div
          key="infernoguessr"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col w-full items-start"
        >
          <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
            <div className="flex md:flex-row flex-col justify-between items-baseline w-full md:max-w-[1000px]">
              <div className="flex gap-4 items-baseline">
                <h1 className="tracking-widest">DAILY_LOCATION</h1>
                <span className="text-sm tracking-widest opacity-70">
                  {showFinalResults
                    ? "COMPLETE"
                    : `ROUND ${displayRound.round_number} / 5`}
                </span>
              </div>
              {!showFinalResults && (
                <span className="text-sm lg:text-base  tracking-widest">
                  TIME: {formatTime(activeTimer)}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col md:max-w-[1000px] w-full gap-4">
            {!showFinalResults ? (
              <>
                <div className="relative aspect-video bg-black border border-white/10 overflow-hidden group">
                  <div
                    className="h-full w-full select-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      filter: `brightness(${gamma})`,
                      cursor:
                        zoom > 1
                          ? isDragging.current
                            ? "grabbing"
                            : "grab"
                          : "default",
                      touchAction: zoom > 1 ? "none" : "auto",
                    }}
                  >
                    {!imageLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                        <span className="text-white/30 text-xs uppercase tracking-widest animate-pulse">
                          LOADING IMAGE...
                        </span>
                      </div>
                    )}
                    <img
                      src={
                        resolveExternalUrl(displayRound.image_url) +
                        (imgRetry > 0
                          ? `${displayRound.image_url.includes("?") ? "&" : "?"}_r=${imgRetry}`
                          : "")
                      }
                      alt="Target"
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                      onLoad={() => {
                        setImageLoaded(true);
                        if (imgRetryTimer.current)
                          clearTimeout(imgRetryTimer.current);
                      }}
                      onError={handleImageError}
                    />
                  </div>

                  <div className="absolute bottom-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="bg-black/80 p-2 border border-white/10 flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest">
                          Zoom: {zoom}x
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="4"
                          step="0.5"
                          value={zoom}
                          onChange={(e) => setZoom(parseFloat(e.target.value))}
                          className="w-24 md:w-32 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-white/40 uppercase tracking-widest">
                          Gamma: {gamma}
                        </label>
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
                    <span className="text-[12px] text-white/50 uppercase tracking-widest">
                      CAPTURED BY:
                    </span>
                    <img
                      src={displayRound.submitted_by.avatar_url}
                      alt=""
                      className="w-4 h-4 rounded-full border border-white/20"
                    />
                    <span className="text-white font-bold text-[12px]">
                      {displayRound.submitted_by.name}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center border border-white/10 p-3 gap-3 bg-white/[0.02]">
                  <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="w-14 aspect-video bg-black/40 border border-white/10 overflow-hidden flex-shrink-0">
                      {selectedLevel?.thumbnail ? (
                        <img
                          src={resolveExternalUrl(selectedLevel.thumbnail)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20 text-[6px]">
                          —
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">
                        Selection
                      </span>
                      <span className="text-white/70 font-bold tracking-wider uppercase truncate max-w-full text-sm">
                        {selectedLevel
                          ? `${selectedLevel.levelNumber}: ${selectedLevel.name}`
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleGuess}
                    disabled={
                      !selectedLevelId ||
                      lastRoundResult !== null ||
                      isSubmitting ||
                      isGameFinished
                    }
                    className="px-8 w-full sm:w-auto"
                  >
                    {isSubmitting
                      ? "PROCESSING..."
                      : isGameFinished
                        ? "COMPLETE"
                        : "SUBMIT"}
                  </Button>
                </div>

                {!lastRoundResult && (
                  <div className="w-full">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          selectedLevelId &&
                          !isSubmitting
                        ) {
                          handleGuess();
                        }
                      }}
                      placeholder="Search levels..."
                      className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 font-mono uppercase tracking-wider outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                )}

                <div
                  className="w-full overflow-x-auto custom-scrollbar pb-2 will-change-transform"
                  style={{ transform: "translateZ(0)" }}
                  ref={listRef}
                >
                  <div className="flex px-2 gap-2 min-w-max py-2">
                    {displayLevels.map((level) => {
                      const globalIndex = sortedLevels.findIndex(
                        (l) => l.id === level.id
                      );
                      const isCorrect =
                        lastRoundResult &&
                        level.id === lastRoundResult.correct_level.id;
                      const isSelected = level.id === selectedLevelId;
                      const isGuessed =
                        lastRoundResult &&
                        level.id === lastRoundResult.guessed_level.id;

                      const guessIdx = lastRoundResult
                        ? sortedLevels.findIndex(
                          (l) => l.id === lastRoundResult.guessed_level.id
                        )
                        : -1;
                      const correctIdx = lastRoundResult
                        ? sortedLevels.findIndex(
                          (l) => l.id === lastRoundResult.correct_level.id
                        )
                        : -1;
                      const minIdx = Math.min(guessIdx, correctIdx);
                      const maxIdx = Math.max(guessIdx, correctIdx);

                      const isInBetween =
                        lastRoundResult &&
                        globalIndex >= minIdx &&
                        globalIndex <= maxIdx &&
                        !isCorrect &&
                        !isGuessed;

                      return (
                        <button
                          key={level.id}
                          ref={isCorrect ? targetRef : null}
                          onClick={() =>
                            !lastRoundResult && setSelectedLevelId(level.id)
                          }
                          className={`group relative flex flex-col hover:cursor-pointer items-center gap-1 min-w-32 w-[15vw] max-w-48 flex-shrink-0 transition-all ${isSelected
                              ? "scale-105 opacity-100 grayscale-0"
                              : lastRoundResult &&
                                (isCorrect || isGuessed || isInBetween)
                                ? "scale-105 opacity-100 grayscale-0"
                                : "opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                            }`}
                        >
                          <div
                            className={`w-full aspect-video border-2 transition-colors duration-500 overflow-hidden relative ${isSelected
                                ? "border-white/70"
                                : lastRoundResult && isCorrect
                                  ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                                  : isGuessed
                                    ? "border-red-400"
                                    : isInBetween
                                      ? "border-red-500/50"
                                      : "border-white/10"
                              }`}
                          >
                            <img
                              src={resolveExternalUrl(level.thumbnail || "")}
                              alt={level.name}
                              className={`w-full h-full object-cover transition-all duration-500 ${lastRoundResult && isCorrect
                                  ? "brightness-110"
                                  : isInBetween
                                    ? "brightness-75"
                                    : ""
                                }`}
                            />
                            {isInBetween && (
                              <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none z-10" />
                            )}
                          </div>
                          <span
                            className={`text-base truncate w-full text-center transition-colors ${isSelected
                                ? "text-white"
                                : lastRoundResult && isCorrect
                                  ? "text-green-500"
                                  : isGuessed
                                    ? "text-red-400"
                                    : isInBetween
                                      ? "text-red-400"
                                      : "text-white/50 group-hover:text-white"
                              }`}
                          >
                            {level.levelNumber}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-white flex flex-col items-start gap-1 font-bold uppercase tracking-wider">
                  <span className="opacity-50">
                    ROUND: {displayRound.round_number} / 5
                  </span>

                  {lastRoundResult && (
                    <div className="flex flex-col gap-1 items-start">
                      <Typewriter
                        text={
                          lastRoundResult.distance === 0
                            ? "STATUS: SUCCESS"
                            : "STATUS: FAILED"
                        }
                        className={
                          lastRoundResult.distance === 0
                            ? "text-green-500 opacity-50"
                            : "text-red-500 opacity-50"
                        }
                        speed={0.02}
                      />
                      <Typewriter
                        text={`DISTANCE: ${lastRoundResult.distance}`}
                        className="opacity-50"
                        speed={0.02}
                        delay={0.4}
                      />
                      <Typewriter
                        text={`TIME: ${lastRoundResult.time_spent_seconds.toFixed(3)}`}
                        className="opacity-50"
                        speed={0.02}
                        delay={0.6}
                      />
                      <Typewriter
                        text={`SCORE: +${lastRoundResult.score}`}
                        className="text-green-500 opacity-50"
                        speed={0.02}
                        delay={0.8}
                      />
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                      >
                        {isGameFinished ? (
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={viewFinalResults}
                            className="opacity-50 hover:opacity-100 mt-2"
                          >
                            VIEW RESULTS
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={nextRound}
                            disabled={isFetchingNextRound}
                            className="opacity-50 hover:opacity-100 mt-2"
                          >
                            {isFetchingNextRound ? "LOADING..." : "NEXT ROUND"}
                          </Button>
                        )}
                      </motion.div>
                    </div>
                  )}
                  <div ref={resultsRef} />
                </div>
              </>
            ) : (
              safeGameData.status === "completed" && (
                <motion.div className="flex flex-col w-full gap-6">
                  <div className="flex flex-col items-start gap-1">
                    <Typewriter
                      text="MISSION EVALUATION"
                      className="text-white opacity-50 font-bold uppercase tracking-widest"
                    />
                    <div className="flex flex-col">
                      <Typewriter
                        delay={0.4}
                        className="text-green-500 opacity-50 font-bold tracking-wider uppercase"
                        text={`TOTAL SCORE: ${(safeGameData as GameCompleted).total_score} / 500`}
                      />
                      <Typewriter
                        delay={0.6}
                        className="text-white opacity-50 font-bold tracking-wider uppercase "
                        text={`TOTAL TIME: ${formatTime(totalTimeSeconds)}`}
                      />
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    {(safeGameData as GameCompleted).rounds.map((round) => (
                      <div
                        key={round.round_number}
                        className="border border-white/10 p-3 flex flex-col gap-3 bg-white/[0.02]"
                      >
                        <div className="flex justify-between items-center text-sm text-white/30 uppercase tracking-widest">
                          <span>Round {round.round_number}</span>
                          <span
                            className={`font-bold ${round.score === 100
                                ? "text-green-500"
                                : round.score >= 50
                                  ? "text-yellow-500"
                                  : "text-red-500"
                              }`}
                          >
                            +{round.score}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/30 uppercase">
                            Captured by
                          </span>
                          <div className="flex items-center gap-1.5">
                            <img
                              src={round.submitted_by.avatar_url}
                              alt=""
                              className="w-3 h-3 rounded-full"
                            />
                            <span className="text-sm text-white/50 font-bold">
                              {round.submitted_by.name}
                            </span>
                          </div>
                        </div>

                        <div
                          className="aspect-video border border-white/10 overflow-hidden cursor-pointer hover:border-white/30 transition-colors"
                          onClick={() => setLightboxUrl(round.image_url)}
                        >
                          <img
                            src={round.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-white/30 uppercase">
                              Time
                            </span>
                            <span className="font-bold text-white/70 uppercase">
                              {round.time_spent_seconds.toFixed(3)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/30 uppercase">
                              Target
                            </span>
                            <span className="font-bold text-green-400 uppercase truncate max-w-[120px]">
                              {round.correct_level.level_number}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white/30 uppercase">
                              Distance
                            </span>
                            <span
                              className={`font-bold ${round.distance === 0
                                  ? "text-green-400"
                                  : "text-red-400"
                                }`}
                            >
                              {round.distance}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>
              )
            )}
          </div>
        </motion.div>
      </div>

      <div className="-z-10 h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible" />

      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 bg-black/90 backdrop-blur-sm ${lightboxZoomed
                ? "overflow-auto"
                : "flex items-center justify-center"
              }`}
            onClick={() => setLightboxUrl(null)}
          >
            <div
              className={
                lightboxZoomed
                  ? "min-h-full min-w-full flex items-center justify-center p-4"
                  : "flex items-center justify-center"
              }
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
                className={
                  lightboxZoomed
                    ? "max-w-none cursor-zoom-out"
                    : "max-w-[70vw] max-h-[70vh] object-contain cursor-zoom-in"
                }
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

      {dailyChanged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-red-500/30 p-8 max-w-md w-full flex flex-col items-center gap-6"
          >
            <Typewriter
              text="TIME IS UP"
              className="text-3xl text-red-500 font-bold tracking-widest"
              speed={0.05}
            />
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setDailyChanged(false);
                fetchGameState();
              }}
            >
              START NEW MISSION
            </Button>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default InfernoPlayPage;
