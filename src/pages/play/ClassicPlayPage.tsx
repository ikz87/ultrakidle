import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { CURRENT_VERSION, useVersion } from "../../context/VersionContext";
import { useSettings } from "../../context/SettingsContext";
import Button from "../../components/ui/Button";
import { EnemySearch } from "../../components/game/EnemySearch";
import { GuessBoard } from "../../components/game/GuessBoard";
import type { GuessResult } from "../../components/game/GuessBoard";
import { EnemyIcon } from "../../components/game/EnemyIcon";
import { enemies } from "../../lib/enemy_list";
import { Typewriter } from "../../components/Typewriter";
import { motion } from "framer-motion";
import { copyToClipboard } from "../../lib/clipboard";
import { getMsUntilNicaraguaMidnight } from "../../lib/time";
import { EnemyBoardModal } from "../../components/game/EnemyBoardModal";
import PlayLayout from "../../layouts/PlayLayout";

const ClassicPlayPage = () => {
    const { setUpdateAvailable } = useVersion();

    const [loading, setLoading] = useState(true);
    const [dayNumber, setDayNumber] = useState<number | null>(null);
    const [guessHistory, setGuessHistory] = useState<any[]>([]);
    const { settings, syncWithDbSettings } = useSettings();
    const [dailyChanged, setDailyChanged] = useState(false);

    const [guesses, setGuesses] = useState<GuessResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shouldFlash, setShouldFlash] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioRankPlayed, setAudioRankPlayed] = useState(false)

    const [isBoardOpen, setIsBoardOpen] = useState(false);
    const [excludedEnemyIds, setExcludedEnemyIds] = useState<number[]>([]);

    const toggleEnemyHighlight = (id: number) => {
        setExcludedEnemyIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const highlightAll = () => setExcludedEnemyIds([]);
    const clearAll = () => setExcludedEnemyIds(enemies.map((e) => e.id));

    const event = dayNumber === 100 ? 'PARTY' : undefined;

    const fetchInit = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_classic_init", {
            version: CURRENT_VERSION,
        });

        if (error) {
            if (error.message.includes("CLIENT_OUTDATED"))
                setUpdateAvailable(true);
            setLoading(false);
            return;
        }

        setDayNumber(data.day_number);
        setGuessHistory(data.history ?? []);
        syncWithDbSettings(data.settings ?? null);
        setLoading(false);
    }, [setUpdateAvailable]);

    useEffect(() => {
        fetchInit();
    }, [fetchInit]);

    useEffect(() => {
        const ms = getMsUntilNicaraguaMidnight();
        const t = setTimeout(() => setDailyChanged(true), ms);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (audioRef.current && !audioRankPlayed) {
            audioRef.current.volume = 0.4;
            audioRef.current.play();
            setAudioRankPlayed(true);
        }
    })

    useEffect(() => {
        if (!loading) {
            if (guessHistory.length > 0) {
                const initialGuesses: GuessResult[] = guessHistory.map(
                    (historyItem) => {
                        const enemyData = enemies.find(
                            (e) => e.id === historyItem.guess_enemy_id
                        );
                        return {
                            guess_id: historyItem.guess_enemy_id,
                            enemy_name: enemyData ? enemyData.name : "UNKNOWN",
                            ...historyItem.hint_data,
                        };
                    }
                );
                setGuesses(initialGuesses);
            } else {
                setGuesses([]);
            }
        }
    }, [guessHistory, loading]);

    const handleGuess = async (enemyId: number) => {
        if (isSubmitting) return;
        if (guesses.some((g) => g.guess_id === enemyId)) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc("submit_daily_guess", {
                guess_id: enemyId,
                version: CURRENT_VERSION,
            });

            if (error) {
                console.error("Submit guess error:", error.message);
                if (error.message.includes("CLIENT_OUTDATED")) {
                    setUpdateAvailable(true);
                }
                return;
            }

            const actualEnemyId = enemyId === 0 ? (data.guess_enemy_id || data.guess_id) : enemyId;
            const enemyData = enemies.find((e) => e.id === actualEnemyId);

            if (data && enemyData) {
                const newGuess: GuessResult = {
                    guess_id: actualEnemyId,
                    enemy_name: enemyData.name,
                    ...data,
                };
                setGuesses((prev) => [...prev, newGuess]);

                if (data.correct || guesses.length + 1 >= 5) {
                    setShouldFlash(true);
                    setTimeout(() => setShouldFlash(false), 500);
                }
            }
        } catch (err) {
            console.error("Unexpected error during guess:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasWon = guesses.some((g) => g.correct);
    const hasReachedLimit = guesses.length >= 5;
    const isGameOver = hasWon || hasReachedLimit;

    useEffect(() => {
        if (!loading && isGameOver) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [loading, isGameOver]);

    const revealedId = guesses.find((g) => g.correct_id)?.correct_id;
    const revealedEnemy = revealedId
        ? enemies.find((e) => e.id === revealedId)
        : null;

    const guessGridData = guesses.map((g) => {
        const getStatus = (
            value: any,
            result: string | null,
            color?: string
        ) => {
            if (value === undefined || value === null) return "gray";
            if (color === "green" || result === "correct") return "green";
            if (color === "yellow") return "yellow";
            return "red";
        };

        return [
            getStatus(true, g.correct ? "correct" : "incorrect"),
            getStatus(
                g.properties.enemy_type.value,
                g.properties.enemy_type.result
            ),
            getStatus(
                g.properties.weight_class.value,
                g.properties.weight_class.result
            ),
            getStatus(
                g.properties.health.value,
                g.properties.health.result,
                g.properties.health.color
            ),
            getStatus(
                g.properties.level_count.value,
                g.properties.level_count.result,
                g.properties.level_count.color
            ),
            getStatus(
                g.properties.appearance.value,
                g.properties.appearance.result,
                g.properties.appearance.color
            ),
        ];
    });

    const emojiGrid = guessGridData
        .map((row) =>
            row
                .map((status) => {
                    if (status === "green") return "🟩";
                    if (status === "yellow") return "🟧";
                    if (status === "gray") return "⬛";
                    return "🟥";
                })
                .join("")
        )
        .join("\n");

    const copyMissionLog = async () => {
        const attempts = hasWon
            ? guesses.length
            : hasReachedLimit
                ? "X"
                : guesses.length;
        const header = `ULTRAKIDLE #${dayNumber || ""} ${attempts}/5\n\n`;
        const success = await copyToClipboard(
            `${header}${emojiGrid}\n\nhttps://ultrakidle.online/`
        );
        if (success) {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    return (
        <PlayLayout
            activeMode="classic"
            loading={loading}
            seoTitle="Daily Mission"
            seoDescription="Identify the target enemy in the standard daily guessing mode."
            dailyChanged={dailyChanged}
            onResetDaily={() => {
                setDailyChanged(false);
                fetchInit();
            }}
            showDeathBackground={!hasWon && hasReachedLimit}
        >

            { event === "PARTY" &&
            <div className="flex items-center gap-2 mb-4 px-2 py-1 bg-amber-500/10 border-2 border-amber-500/20 w-fit">
                Happy 100th classic ULTRAKIDLE! Everyone gets to wear a hat :)
            </div>
            }
            <motion.div
                key="classic"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col w-full items-start"
            >
                <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
                    <div className="flex gap-2 items-baseline">
                        <h1 className="tracking-widest flex-1">DAILY_ENEMY #{dayNumber}</h1>
                    </div>
                </div>

                <div className="w-full z-20">
                    <EnemySearch
                        onGuess={handleGuess}
                        disabled={isSubmitting || isGameOver}
                        excludeIds={guesses
                            .map((g: GuessResult) => g.guess_id)
                            .filter((id): id is number => id !== undefined)}
                        event={event}
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
                                backgroundColor: "rgba(255, 255, 255, 0)",
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
                            * All data mirrors that of the official wiki, which can
                            be subject to change
                        </span>
                    </div>
                    <GuessBoard guesses={guesses} event={event}/>
                </motion.div>

                <div className="mt-2 text-white flex flex-col items-start gap-1 font-bold uppercase tracking-wider">
                    <Button
                        variant="outline"
                        onClick={() => setIsBoardOpen(true)}
                        className="mb-4"
                    >
                        OPEN JOURNAL
                    </Button>
                    <span>
                        <span className="opacity-50">
                            GUESSES REMAINING: {Math.max(0, 5 - guesses.length)} / 5
                        </span>
                        {(hasWon || hasReachedLimit) && (
                            <div className="ml-4 w-6 float-right items-center rounded-sm bg-white/5">
                                {
                                    {
                                        '0': <div className="text-blue-500">D</div>,
                                        '-1': <div className="text-green-500">C</div>,
                                        '1': <div className="text-yellow-500">B</div>,
                                        '2': <div className="text-orange-500">A</div>,
                                        '3': <div className="text-red-500">S</div>,
                                        '4': <div className="text-white rounded-sm" style={{ backgroundColor: '#FFAE00' }}>P</div>
                                    }[Math.max(0, 5 - guesses.length)]
                                }
                                <audio ref={audioRef}>
                                    <source src="/audios/final_rank.mp3" type="audio/mp3" />
                                </audio>
                            </div>
                        )}
                    </span>
                    {hasWon && (
                        <div className="flex items-center gap-4">
                            <Typewriter
                                text="STATUS: TARGET IDENTIFIED"
                                className="text-green-500 opacity-50"
                                speed={0.02}
                            />
                            {guesses.find((g) => g.correct) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        delay: 0.5,
                                        duration: 0.5,
                                    }}
                                >
                                    {(() => {
                                        const enemy = enemies.find(
                                            (e) =>
                                                e.name ===
                                                guesses.find((g) => g.correct)?.enemy_name
                                        );
                                        return (
                                            <EnemyIcon
                                                icons={enemy?.icon || []}
                                                size={32}
                                                isSpawn={(enemy as any)?.isSpawn}
                                                className="border border-green-500/20 p-0.5 bg-green-500/5"
                                                event={event}
                                            />
                                        );
                                    })()}
                                </motion.div>
                            )}
                        </div>
                    )}
                    {!hasWon && hasReachedLimit && (
                        <div className="flex flex-col gap-1 items-start">
                            <Typewriter
                                text="STATUS: MISSION FAILED - LIMIT REACHED"
                                className="text-red-500"
                                speed={0.02}
                            />
                            {revealedEnemy && (
                                <div className="flex flex-col gap-1 items-start">
                                    <Typewriter
                                        text="TARGET DESIGNATION: "
                                        className="opacity-50"
                                        speed={0.02}
                                        delay={0.8}
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
                                                delay: 1.8,
                                                duration: 0.5,
                                            }}
                                        >
                                            <EnemyIcon
                                                icons={revealedEnemy.icon}
                                                size={32}
                                                isSpawn={
                                                    (revealedEnemy as any).isSpawn
                                                }
                                                event={event}
                                                className=""
                                            />
                                        </motion.div>
                                        <Typewriter
                                            text={revealedEnemy.name}
                                            className="animate-pulse"
                                            speed={0.04}
                                            delay={1.4}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {isGameOver && (
                        <div className="flex flex-col gap-2 items-start mt-4 border-t border-white/10 pt-4 w-full">
                            <Typewriter
                                text="COMPRESSED MISSION LOG:"
                                className="text-white opacity-50 text-sm"
                                speed={0.01}
                                delay={isGameOver ? 0.5 : 0}
                            />
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.8,
                                        },
                                    },
                                }}
                                className="flex flex-col gap-1 mt-1"
                            >
                                {Array.from({ length: 5 }).map((_, rowIndex) => {
                                    const row = guessGridData[rowIndex];
                                    return (
                                        <div key={rowIndex} className="flex gap-1">
                                            {Array.from({ length: 6 }).map(
                                                (_, colIndex) => {
                                                    const status = row
                                                        ? row[colIndex]
                                                        : "gray";
                                                    return (
                                                        <motion.div
                                                            key={colIndex}
                                                            variants={{
                                                                hidden: {
                                                                    opacity: 0,
                                                                    scale: 0.5,
                                                                },
                                                                visible: {
                                                                    opacity: 1,
                                                                    scale: 1,
                                                                },
                                                            }}
                                                            className={`h-6 w-6 border flex items-center justify-center ${status === "green"
                                                                ? "border-green-500 bg-green-500/20"
                                                                : status === "yellow"
                                                                    ? settings.cellColors === 'colorblind'
                                                                        ? "border-blue-500 bg-blue-500/20"
                                                                        : "border-yellow-500 bg-yellow-500/20"
                                                                    : status === "gray"
                                                                        ? "border-zinc-500/30 bg-zinc-800/20"
                                                                        : "border-red-500 bg-red-500/20"
                                                                }`}
                                                        >
                                                            {settings.cellColors === 'colorblind' &&
                                                                status !== "gray" && (
                                                                    <span
                                                                        className={`text-[10px] font-bold ${status === "green"
                                                                            ? "text-green-500"
                                                                            : status === "yellow"
                                                                                ? "text-blue-500"
                                                                                : "text-red-500"
                                                                            }`}
                                                                    >
                                                                        {status === "green"
                                                                            ? "✓"
                                                                            : status === "yellow"
                                                                                ? "ǃ"
                                                                                : "⨯"}
                                                                    </span>
                                                                )}
                                                        </motion.div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    );
                                })}
                            </motion.div>
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={copyMissionLog}
                                className="mb-4 flex items-center gap-2 text-xl opacity-50 hover:opacity-100"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                    delay: 1.2 + guessGridData.length * 0.05,
                                }}
                            >
                                {copySuccess ? <>✓ COPIED</> : <>⎘ COPY LOG</>}
                            </Button>
                        </div>
                    )}
                </div>
                <div ref={bottomRef} />
            </motion.div >
                <EnemyBoardModal
                isOpen={isBoardOpen}
                onClose={() => setIsBoardOpen(false)}
                excludedIds={excludedEnemyIds}
                onToggleEnemy={toggleEnemyHighlight}
                onHighlightAll={highlightAll}
                onClearAll={clearAll}
            />
        </PlayLayout >
    );
};

export default ClassicPlayPage;
