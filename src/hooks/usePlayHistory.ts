import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface HistorySummary {
    dailyId: number;
    date: string | Date;
    guesses: number;
    won: boolean;
    targetEnemyId?: number;
}

export function usePlayHistory() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistorySummary[]>([]);

    useEffect(() => {
        async function fetchHistory() {
            try {
                // Ensure auth
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setLoading(false);
                    return;
                }

                // We fetch the join of user_guesses with daily_choices 
                // to get the actual date of the challenge rather than just the guess created_at
                const { data, error } = await supabase
                    .from('user_guesses')
                    .select(`
                        daily_choice_id,
                        guess_enemy_id,
                        hint_data,
                        created_at,
                        daily_choices ( chosen_at )
                    `)
                    .order('daily_choice_id', { ascending: false })
                    .order('created_at', { ascending: true })
                    .limit(2000); // larger limit for accurate client-side historical data

                if (error) throw error;

                if (data && data.length > 0) {
                    const grouped: Record<number, HistorySummary> = {};

                    data.forEach(row => {
                        const dailyId = row.daily_choice_id;

                        if (!grouped[dailyId]) {
                            // Extract date from related daily_choices if possible, fallback to guess created_at
                            // Data shape of join might be an object or array depending on relation setup
                            // Using type coercion any to bypass strict type checking for the join structure here
                            const joinData = row.daily_choices as any;
                            const choiceDate = joinData ? (Array.isArray(joinData) ? joinData[0]?.chosen_at : joinData.chosen_at) : null;
                            const actualDate = choiceDate || row.created_at;

                            grouped[dailyId] = {
                                dailyId,
                                date: new Date(actualDate),
                                guesses: 0,
                                won: false
                            };
                        }

                        grouped[dailyId].guesses += 1;

                        const hintData = row.hint_data as any;
                        // Treat the whole daily challenge as won if any guess was correct
                        if (hintData && hintData.correct === true) {
                            grouped[dailyId].won = true;
                            grouped[dailyId].targetEnemyId = row.guess_enemy_id;
                        } else if (hintData && hintData.correct_id) {
                            // If they lost and we got the correct_id on the last guess
                            grouped[dailyId].targetEnemyId = hintData.correct_id;
                        }
                    });

                    // Convert map to array and sort newest to oldest
                    const historyArray = Object.values(grouped).sort((a, b) => {
                        const timeA = new Date(a.date).getTime();
                        const timeB = new Date(b.date).getTime();
                        return timeB - timeA;
                    });

                    setHistory(historyArray);
                }

            } catch (err) {
                console.error("Failed to fetch play history", err);
            } finally {
                setLoading(false);
            }
        }

        fetchHistory();
    }, []);

    return { loading, history };
}
