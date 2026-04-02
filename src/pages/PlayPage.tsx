import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import SEO from '../components/SEO';
import { CURRENT_VERSION, useVersion } from '../context/VersionContext';
import { useGameInit } from '../hooks/useGameInit';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/ui/Button';
import { EnemySearch } from '../components/game/EnemySearch';
import { GuessBoard } from '../components/game/GuessBoard';
import type { GuessResult } from '../components/game/GuessBoard';
import { EnemyIcon } from '../components/game/EnemyIcon';
import { enemies } from '../lib/enemy_list';
import { Typewriter } from '../components/Typewriter';
import { motion } from 'framer-motion';
import { copyToClipboard } from '../lib/clipboard';

const PlayPage = () => {
    const { loading, dayNumber, guessHistory, dailyChanged, setDailyChanged, refresh } = useGameInit();
    const { setUpdateAvailable } = useVersion();
    const { colorblindMode } = useSettings();
    const [guesses, setGuesses] = useState<GuessResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shouldFlash, setShouldFlash] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Load initial guesses from history
    useEffect(() => {
        if (!loading) {
            if (guessHistory.length > 0) {
                const initialGuesses: GuessResult[] = guessHistory.map(historyItem => {
                    const enemyData = enemies.find(e => e.id === historyItem.guess_enemy_id);
                    return {
                        guess_id: historyItem.guess_enemy_id,
                        enemy_name: enemyData ? enemyData.name : 'UNKNOWN',
                        ...historyItem.hint_data
                    };
                });
                setGuesses(initialGuesses);
            } else {
                setGuesses([]);
            }
        }
    }, [guessHistory, loading]);

    const handleGuess = async (enemyId: number) => {
        if (isSubmitting) return;

        // Prevent duplicate guesses in the same session visually
        if (guesses.some(g => g.guess_id === enemyId)) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('submit_daily_guess', {
                guess_id: enemyId,
                version: CURRENT_VERSION
            });

            if (error) {
                console.error('Submit guess error:', error.message);
                if (error.message.includes('CLIENT_OUTDATED')) {
                    setUpdateAvailable(true);
                }
                return;
            }

            const enemyData = enemies.find(e => e.id === enemyId);

            if (data && enemyData) {
                const newGuess: GuessResult = {
                    guess_id: enemyId,
                    enemy_name: enemyData.name,
                    ...data
                };
                setGuesses(prev => [...prev, newGuess]);

                // Flash the table if game ends with this guess
                if (data.correct || guesses.length + 1 >= 5) {
                    setShouldFlash(true);
                    setTimeout(() => setShouldFlash(false), 500);
                }
            }
        } catch (err) {
            console.error('Unexpected error during guess:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasWon = guesses.some(g => g.correct);
    const hasReachedLimit = guesses.length >= 5;
    const isGameOver = hasWon || hasReachedLimit;

    // Scroll to bottom if game is over on mount
    useEffect(() => {
        if (!loading && isGameOver) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [loading, isGameOver]);


    // The RPC returns correct_id only on the 5th failed guess.
    // We look for it in the history to reveal the enemy.
    const revealedId = guesses.find(g => g.correct_id)?.correct_id;
    const revealedEnemy = revealedId ? enemies.find(e => e.id === revealedId) : null;

    const guessGridData = guesses.map(g => {
        const getStatus = (value: any, result: string | null, color?: string) => {
            if (value === undefined || value === null) return 'gray';
            if (color === 'green' || result === 'correct') return 'green';
            if (color === 'yellow') return 'yellow';
            return 'red';
        };

        return [
            getStatus(true, g.correct ? 'correct' : 'incorrect'), // Name (always present if it's a guess)
            getStatus(g.properties.enemy_type.value, g.properties.enemy_type.result), // Type
            getStatus(g.properties.weight_class.value, g.properties.weight_class.result), // Weight
            getStatus(g.properties.health.value, g.properties.health.result, g.properties.health.color), // Health
            getStatus(g.properties.level_count.value, g.properties.level_count.result, g.properties.level_count.color), // Level Count
            getStatus(g.properties.appearance.value, g.properties.appearance.result, g.properties.appearance.color) // Appearance
        ];
    });

    const emojiGrid = guessGridData.map(row =>
        row.map(status => {
            if (status === 'green') return '🟩';
            if (status === 'yellow') return '🟧';
            if (status === 'gray') return '⬛';
            return '🟥';
        }).join('')
    ).join('\n');

    const copyMissionLog = async () => {
        const attempts = hasWon ? guesses.length : (hasReachedLimit ? 'X' : guesses.length);
        const header = `ULTRAKIDLE #${dayNumber || ''} ${attempts}/5\n\n`;
        const success = await copyToClipboard(`${header}${emojiGrid}\n\nhttps://ultrakidle.online/`);
        if (success) {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    if (loading) {
        return (
            <>
                <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0  overflow-visible">
                </div>
                <div className="flex flex-col w-full h-full items-start justify-start mt-2">
                    <p className="text-xl opacity-50 animate-pulse">INITIALIZING BOARD...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
                <SEO title="Daily Mission" description="Identify the target enemy in the standard daily guessing mode." />

                <div className="flex flex-col gap-0 mb-4 w-full lg:text-xl md:text-lg text-sm opacity-50 text-left flex-shrink-0">
                    <div className="flex gap-2 items-baseline">
                        <h1 className="tracking-widest flex-1">DAILY_ENEMY</h1>
                    </div>
                </div>

                <div className="w-full z-10">
                    <EnemySearch
                        onGuess={handleGuess}
                        disabled={isSubmitting || isGameOver}
                        excludeIds={guesses.map((g: GuessResult) => g.guess_id).filter((id): id is number => id !== undefined)}
                    />
                </div>


                <motion.div
                    animate={shouldFlash ? { backgroundColor: ["rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0)"] } : { backgroundColor: "rgba(255, 255, 255, 0)" }}
                    transition={shouldFlash ? { duration: 1.5, ease: "easeOut" } : { duration: 0 }}
                    className="md:max-w-[1000px] w-full mt-4"
                >
                    <div className="w-full flex justify-left">
                        <span className="text-white/50 text-sm text-left place-self-start w-full justify-left">* All data mirrors that of the official wiki, which can be subject to change</span>
                    </div>
                    <GuessBoard guesses={guesses} />
                </motion.div>

                <div className="mt-2 text-white flex flex-col items-start gap-1  font-bold uppercase tracking-wider">
                    <span className="opacity-50">GUESSES REMAINING: {Math.max(0, 5 - guesses.length)} / 5</span>
                    {hasWon && (
                        <div className="flex items-center gap-4">
                            <Typewriter
                                text="STATUS: TARGET IDENTIFIED"
                                className="text-green-500 opacity-50"
                                speed={0.02}
                            />
                            {guesses.find(g => g.correct) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                >
                                    <EnemyIcon
                                        icons={enemies.find(e => e.name === guesses.find(g => g.correct)?.enemy_name)?.icon || []}
                                        size={32}
                                        className="border border-green-500/20 p-0.5 bg-green-500/5"
                                    />
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
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 1.8, duration: 0.5 }}
                                        >
                                            <EnemyIcon icons={revealedEnemy.icon} size={32} className="" />
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
                                            delayChildren: 0.8
                                        }
                                    }
                                }}
                                className="flex flex-col gap-1 mt-1"
                            >
                                {Array.from({ length: 5 }).map((_, rowIndex) => {
                                    const row = guessGridData[rowIndex];
                                    return (
                                        <div key={rowIndex} className="flex gap-1">
                                            {Array.from({ length: 6 }).map((_, colIndex) => {
                                                const status = row ? row[colIndex] : 'gray';
                                                return (
                                                    <motion.div
                                                        key={colIndex}
                                                        variants={{
                                                            hidden: { opacity: 0, scale: 0.5 },
                                                            visible: { opacity: 1, scale: 1 }
                                                        }}
                                                        className={`w-6 h-6 border ${status === 'green' ? 'bg-green-500/20 border-green-500' :
                                                            status === 'yellow' ? (colorblindMode ? 'bg-blue-500/20 border-blue-500' : 'bg-yellow-500/20 border-yellow-500') :
                                                                status === 'gray' ? 'bg-zinc-800/20 border-zinc-500/30' :
                                                                    'bg-red-500/20 border-red-500'
                                                            }`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </motion.div>
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={copyMissionLog}
                                className="text-xl  flex items-center gap-2 opacity-50 hover:opacity-100 mb-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2 + (guessGridData.length * 0.05) }}
                            >
                                {copySuccess ? (
                                    <>✓ COPIED</>
                                ) : (
                                    <>⎘ COPY LOG</>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
                <div ref={bottomRef} />
            </div>
            {
                (!hasWon && hasReachedLimit && (
                    <div className="-z-10 h-dvh w-dvw bg-black fixed top-0 left-0 flex items-center justify-center overflow-visible">
                        <div className="w-1/3 h-1/3 overflow-visible">
                            <img className="opacity-10 overflow-visible object-cover w-full h-full mx-auto " src={`${import.meta.env.BASE_URL}images/ultrakill-death.gif`} />
                        </div>
                    </div>)) || (
                    <div className="-z-10 h-dvh w-dvw bg-black/40 fixed top-0 left-0  overflow-visible">
                    </div>)
            }
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
                        <Typewriter
                            text="A NEW DAILY CHALLENGE IS AVAILABLE"
                            className="text-white/70 text-center"
                            speed={0.03}
                            delay={0.5}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5 }}
                        >
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={() => {
                                    setDailyChanged(false);
                                    refresh();
                                }}
                            >
                                START NEW MISSION
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default PlayPage;
