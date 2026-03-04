import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface HistoryItem {
    is_win: boolean;
    attempt_count: number;
    daily_choice: {
        chosen_at: string;
        enemy: {
            name: string;
        }
    }
}

export function usePlayHistory() {
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        async function fetchHistory() {
            try {
                // Ensure auth
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('user_wins')
                    .select(`
                        is_win,
                        attempt_count,
                        daily_choice:daily_choices (
                            chosen_at,
                            enemy:ultrakill_enemies (
                                name
                            )
                        )
                    `)
                    .order('completed_at', { ascending: false });

                if (error) throw error;

                console.log('Raw user_wins data:', JSON.stringify(data, null, 2));

                if (data) {
                    interface RawWinData {
                        is_win: boolean;
                        attempt_count: number;
                        daily_choice: unknown; // Allow any here temporarily or define complex join type
                    }
                    const mappedData = (data as unknown as RawWinData[]).map((item) => {
                        const daily_choice = Array.isArray(item.daily_choice) ? (item.daily_choice[0] as Record<string, unknown>) : (item.daily_choice as Record<string, unknown>);
                        if (daily_choice) {
                            daily_choice.enemy = Array.isArray(daily_choice.enemy) ? daily_choice.enemy[0] : daily_choice.enemy;
                        }
                        return {
                            ...item,
                            daily_choice
                        };
                    });
                    setHistory(mappedData as HistoryItem[]);
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
