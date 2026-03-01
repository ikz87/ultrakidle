import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface GuessHistoryEntry {
    guess_enemy_id: number;
    hint_data: {
        correct: boolean;
        correct_id?: number;
        properties: {
            enemy_type: { value: string; result: 'correct' | 'incorrect' };
            weight_class: { value: string; result: 'correct' | 'incorrect' };
            health: { value: number; result: 'correct' | 'higher' | 'lower' };
            is_boss: { value: boolean; result: 'correct' | 'incorrect' };
            appearance: { value: string; result: 'correct' | 'incorrect' };
        };
    };
}

export interface DailyStats {
    total_players: number;
    total_wins: number;
}

export function useGameInit() {
    const [loading, setLoading] = useState(true);
    const [dailyId, setDailyId] = useState<number | null>(null);
    const [guessHistory, setGuessHistory] = useState<GuessHistoryEntry[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
    const [streak, setStreak] = useState<number>(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const [dailyChanged, setDailyChanged] = useState(false);

    const refresh = () => {
        setLoading(true);
        setRefreshKey(prev => prev + 1);
    };

    useEffect(() => {
        async function init() {
            try {
                // 1. Check for session on mount
                const { data: { session } } = await supabase.auth.getSession();

                // 2. Only sign in if no session exists
                if (!session) {
                    const { error: authError } = await supabase.auth.signInAnonymously();
                    if (authError) {
                        console.error('Anonymous sign-in failed:', authError.message);
                        return;
                    }
                }

                // 3. Get today's daily challenge ID
                const { data: dailyIdData, error: dailyError } = await supabase.rpc('get_current_daily_id');
                if (dailyError) {
                    console.error('Failed to get daily ID:', dailyError.message);
                    return;
                }
                setDailyId(dailyIdData);

                // 4. Fetch any previous guesses for this daily challenge
                const { data: history, error: historyError } = await supabase
                    .from('user_guesses')
                    .select('guess_enemy_id, hint_data')
                    .eq('daily_choice_id', dailyIdData)
                    .order('created_at', { ascending: true });

                if (historyError) {
                    console.error('Failed to fetch guess history:', historyError.message);
                    return;
                }

                setGuessHistory((history as unknown as GuessHistoryEntry[]) ?? []);

                // 5. Fetch daily stats
                const { data: statsData, error: statsError } = await supabase.rpc('get_daily_stats');
                if (!statsError) {
                    setDailyStats(statsData);
                }

                // 6. Fetch user streak
                const { data: streakData, error: streakError } = await supabase.rpc('get_user_streak');
                if (!streakError && streakData !== null) {
                    setStreak(streakData);
                }
            } catch (err) {
                console.error('Game init error:', err);
            } finally {
                setLoading(false);
            }
        }

        init();
    }, [refreshKey]);
    useEffect(() => {
        // Subscribe to changes in the current_daily_choice table
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERTs and UPDATEs
                    schema: 'public',
                    table: 'current_daily_choice',
                },
                (payload) => {
                    console.log('Daily choice changed:', payload);
                    setDailyChanged(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { loading, dailyId, guessHistory, dailyStats, streak, refresh, dailyChanged, setDailyChanged };
}
