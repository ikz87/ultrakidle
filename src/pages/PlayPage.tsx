import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useGameInit } from '../hooks/useGameInit';
import Button from '../components/ui/Button';
import { EnemySearch } from '../components/game/EnemySearch';
import { GuessBoard } from '../components/game/GuessBoard';
import type { GuessResult } from '../components/game/GuessBoard';
import { enemies } from '../lib/enemy_list';
import { Typewriter } from '../components/Typewriter';
import { motion } from 'framer-motion';
import Modal from '../components/ui/Modal';

const PlayPage = () => {
    const navigate = useNavigate();
    const { loading, guessHistory } = useGameInit();
    const [guesses, setGuesses] = useState<GuessResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shouldFlash, setShouldFlash] = useState(false);
    const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
    // Load initial guesses from history
    useEffect(() => {
        if (!loading && guessHistory.length > 0) {
            const initialGuesses: GuessResult[] = guessHistory.map(historyItem => {
                const enemyData = enemies.find(e => e.id === historyItem.guess_enemy_id);
                return {
                    guess_id: historyItem.guess_enemy_id,
                    enemy_name: enemyData ? enemyData.name : 'UNKNOWN',
                    ...historyItem.hint_data
                };
            });
            setGuesses(initialGuesses);
        }
    }, [guessHistory, loading]);

    const handleGuess = async (enemyId: number) => {
        if (isSubmitting) return;

        // Prevent duplicate guesses in the same session visually
        if (guesses.some(g => g.guess_id === enemyId)) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('submit_daily_guess', {
                guess_id: enemyId
            });

            if (error) {
                console.error('Submit guess error:', error.message);
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

    // The RPC returns correct_id only on the 5th failed guess.
    // We look for it in the history to reveal the enemy.
    const revealedId = guesses.find(g => g.correct_id)?.correct_id;
    const revealedEnemy = revealedId ? enemies.find(e => e.id === revealedId) : null;

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
            <div className="z-20  flex flex-col w-full pt-4  h-full justify-start items-start">
                <div className="mb-6">
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => navigate('/')}
                        className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100"
                    >
                        &lt; RETURN TO HOME
                    </Button>
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setIsHowToPlayOpen(true)}
                        className="text-xl flex items-center gap-2 opacity-50 hover:opacity-100 mt-2"
                    >
                        ? HOW TO PLAY
                    </Button>
                </div>

                <Modal
                    isOpen={isHowToPlayOpen}
                    onClose={() => setIsHowToPlayOpen(false)}
                    title="SYSTEM_GUIDE: HOW TO PLAY"
                >
                    <div className="space-y-4 font-mono text-sm">
                        <p>IDENTIFY THE TARGET ENEMY IN <span className="text-white font-bold">5 ATTEMPTS</span>.</p>

                        <div className="space-y-2">
                            <p className="opacity-50 underline uppercase">Color Indicators:</p>
                            <div className="flex gap-3 items-center">
                                <div className="w-4 h-4 bg-green-500/20 border border-green-500" />
                                <span>CORRECT PROPERTY MATCH</span>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="w-4 h-4 bg-red-500/20 border border-red-500" />
                                <span>INCORRECT PROPERTY MATCH</span>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <p className="opacity-50 underline uppercase">Properties Tracked:</p>
                            <ul className="list-disc [&>*]:text-left pl-4 list-outside  space-y-1 opacity-80 ">
                                <li>TYPE: ???, DEMON, MACHINE, HUSK, ANGEL OR PRIME SOUL</li>
                                <li>WEIGHT: LIGHT, MEDIUM, HEAVY OR SUPERHEAVY</li>
                                <li>HEALTH: NUMERIC COMPARISON. TARGET CAN BE HIGHER ▲ OR LOWER ▼</li>
                                <li>IS BOSS: ANY ENEMY THAT HAS APPEARED WITH A VISIBLE HEALTH BAR. IF AN ENEMY COUNTS AS A BOSS ITS HEALTH IS THAT OF THEIR BOSS APPEARANCE</li>
                                <li>REGISTERED AT: LEVEL OF FIRST ENCOUNTER</li>
                            </ul>
                        </div>
                    </div>
                </Modal>

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
                    className="lg:w-1/2 w-full "
                >
                    <GuessBoard guesses={guesses} />
                </motion.div>

                <div className="mt-2 text-white flex flex-col items-start gap-1  font-bold uppercase tracking-wider">
                    <span className="opacity-50">GUESSES REMAINING: {Math.max(0, 5 - guesses.length)} / 5</span>
                    {hasWon && (
                        <Typewriter
                            text="STATUS: TARGET IDENTIFIED"
                            className="text-green-500 opacity-50"
                            speed={0.02}
                        />
                    )}
                    {!hasWon && hasReachedLimit && (
                        <div className="flex flex-col gap-1 items-start">
                            <Typewriter
                                text="STATUS: MISSION FAILED - LIMIT REACHED"
                                className="text-red-500"
                                speed={0.02}
                            />
                            {revealedEnemy && (
                                <div className="text-white font-extrabold text-xl flex gap-2">
                                    <Typewriter
                                        text="TARGET DESIGNATION: "
                                        className="opacity-50"
                                        speed={0.02}
                                        delay={0.8}
                                    />
                                    <Typewriter
                                        text={revealedEnemy.name}
                                        className="animate-pulse"
                                        speed={0.04}
                                        delay={1.4}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {
                !hasWon && hasReachedLimit && (
                    <div className="-z-10 h-dvh w-dvw bg-black fixed top-0 left-0 flex items-center justify-center overflow-visible">
                        <div className="w-1/2 h-1/2 overflow-visible">
                            <img className="opacity-10 overflow-visible object-cover w-full h-full mx-auto " src="/images/ultrakill-death.gif" />
                        </div>
                    </div>) || (
                    <div className="-z-10 h-dvh w-dvw bg-black/40 fixed top-0 left-0  overflow-visible">
                    </div>)
            }
        </>
    );
};

export default PlayPage;
