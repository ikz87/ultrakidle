import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useGameInit } from '../hooks/useGameInit';
import Button from '../components/ui/Button';
import { EnemySearch } from '../components/game/EnemySearch';
import { GuessBoard } from '../components/game/GuessBoard';
import type { GuessResult } from '../components/game/GuessBoard';
import { enemies } from '../lib/enemy_list';

const PlayPage = () => {
    const navigate = useNavigate();
    const { loading, guessHistory } = useGameInit();
    const [guesses, setGuesses] = useState<GuessResult[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (loading) {
        return (
            <>
          <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0  overflow-visible">
          </div> ) 
            <div className="flex flex-col w-full h-full items-center justify-center">
                <p className="text-2xl opacity-50 animate-pulse">INITIALIZING BOARD...</p>
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
                    className="flex items-center gap-2 opacity-50 hover:opacity-100"
                >
                    &lt; RETURN TO HOME
                </Button>
            </div>

            <div className="w-full z-10">
                <EnemySearch
                    onGuess={handleGuess}
                    disabled={isSubmitting || isGameOver}
                    excludeIds={guesses.map((g: GuessResult) => g.guess_id).filter((id): id is number => id !== undefined)}
                />
            </div>

            <GuessBoard guesses={guesses} />

            <div className="mt-6 flex flex-col items-start gap-2 opacity-50 font-bold uppercase tracking-wider">
                <span>GUESSES REMAINING: {Math.max(0, 5 - guesses.length)} / 5</span>
                {hasWon && <span className="text-green-400">STATUS: TARGET IDENTIFIED</span>}
                {!hasWon && hasReachedLimit && <span className="text-red-400">STATUS: MISSION FAILED - LIMIT REACHED</span>}
            </div>
        </div>
            {   
                !hasWon && hasReachedLimit && (
          <div className="-z-10 h-dvh w-dvw bg-black fixed top-0 left-0 flex items-center justify-center overflow-visible">
            <div className="w-1/2 h-1/2 overflow-visible">
                <img className="opacity-10 overflow-visible object-cover w-full h-full mx-auto " src="/images/ultrakill-death.gif" />
                        </div>
          </div> ) || (
          <div className="-z-10 h-dvh w-dvw bg-black/40 fixed top-0 left-0  overflow-visible">
          </div> ) 
            }
        </>
    );
};

export default PlayPage;
