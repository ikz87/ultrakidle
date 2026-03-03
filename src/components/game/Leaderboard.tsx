import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { LogGrid } from './LogGrid';
import { motion, AnimatePresence } from 'framer-motion';

interface UserState {
    user_id: string;
    discord_name: string;
    avatar_url: string;
    guesses: string[][];
    status: 'playing' | 'won' | 'lost';
    attempt_count: number;
    last_guess_at: string;
}

interface LeaderboardProps {
    layout?: 'vertical' | 'horizontal';
}

export const Leaderboard = ({ layout = 'vertical' }: LeaderboardProps) => {
    const [users, setUsers] = useState<Record<string, UserState>>({});
    const [dailyId, setDailyId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfileForUser = async (userId: string) => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('discord_name, avatar_url')
            .eq('id', userId)
            .single();

        if (profile) {
            setUsers(prev => {
                if (!prev[userId]) return prev;
                return {
                    ...prev,
                    [userId]: {
                        ...prev[userId],
                        discord_name: profile.discord_name,
                        avatar_url: profile.avatar_url || '/images/v1-plush.webp'
                    }
                };
            });
        }
    };

    useEffect(() => {
        const initLeaderboard = async () => {
            try {
                const { data: dailyData, error: dailyError } = await supabase
                    .from('current_daily_choice')
                    .select('daily_choice_id')
                    .single();

                if (dailyError) throw dailyError;
                const todayId = dailyData.daily_choice_id;
                setDailyId(todayId);

                const { data: guessData, error: guessError } = await supabase
                    .from('guess_colors')
                    .select('user_id, guess_number, colors, created_at')
                    .eq('daily_choice_id', todayId)
                    .order('user_id')
                    .order('guess_number');

                if (guessError) throw guessError;

                const userIds = Array.from(new Set(guessData?.map(g => g.user_id) || []));
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, discord_name, avatar_url')
                    .in('id', userIds.length > 0 ? userIds : ['__none__']);

                if (profileError) console.error('[Leaderboard] Profile fetch error:', profileError);

                const { data: winData, error: winError } = await supabase
                    .from('user_wins')
                    .select('user_id, is_win, attempt_count')
                    .eq('daily_choice_id', todayId);

                if (winError) throw winError;

                const profileMap = (profileData || []).reduce((acc: any, p) => {
                    acc[p.id] = p;
                    return acc;
                }, {});

                const initialUsers: Record<string, UserState> = {};

                guessData?.forEach((row: any) => {
                    if (!initialUsers[row.user_id]) {
                        const profile = profileMap[row.user_id];
                        initialUsers[row.user_id] = {
                            user_id: row.user_id,
                            discord_name: profile?.discord_name || row.user_id.slice(0, 8),
                            avatar_url: profile?.avatar_url || '/images/v1-plush.webp',
                            guesses: [],
                            status: 'playing',
                            attempt_count: 0,
                            last_guess_at: row.created_at || '',
                        };
                    }
                    initialUsers[row.user_id].guesses.push(row.colors.map((c: string) => c.toLowerCase()));
                    initialUsers[row.user_id].attempt_count = initialUsers[row.user_id].guesses.length;
                    if (row.created_at) {
                        initialUsers[row.user_id].last_guess_at = row.created_at;
                    }
                });

                winData?.forEach((row: any) => {
                    if (initialUsers[row.user_id]) {
                        initialUsers[row.user_id].status = row.is_win ? 'won' : 'lost';
                        initialUsers[row.user_id].attempt_count = row.attempt_count;
                    }
                });

                setUsers(initialUsers);
            } catch (err) {
                console.error('[Leaderboard] Failed to initialize', err);
            } finally {
                setLoading(false);
            }
        };

        initLeaderboard();
    }, []);

    useEffect(() => {
        if (!dailyId) return;

        const guessChannel = supabase
            .channel('leaderboard_guesses')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'guess_colors',
                    filter: `daily_choice_id=eq.${dailyId}`,
                },
                (payload) => {
                    const newGuess = payload.new as any;
                    const guessColors = newGuess.colors.map((c: string) => c.toLowerCase());
                    const createdAt = newGuess.created_at || new Date().toISOString();

                    setUsers(prev => {
                        const existing = prev[newGuess.user_id];
                        if (existing) {
                            return {
                                ...prev,
                                [newGuess.user_id]: {
                                    ...existing,
                                    guesses: [...existing.guesses, guessColors],
                                    attempt_count: existing.guesses.length + 1,
                                    last_guess_at: createdAt,
                                }
                            };
                        } else {
                            fetchProfileForUser(newGuess.user_id);
                            return {
                                ...prev,
                                [newGuess.user_id]: {
                                    user_id: newGuess.user_id,
                                    discord_name: 'Anonymous',
                                    avatar_url: '/images/v1-plush.webp',
                                    guesses: [guessColors],
                                    status: 'playing',
                                    attempt_count: 1,
                                    last_guess_at: createdAt,
                                }
                            };
                        }
                    });
                }
            )
            .subscribe();

        const winChannel = supabase
            .channel('leaderboard_wins')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_wins',
                    filter: `daily_choice_id=eq.${dailyId}`,
                },
                (payload) => {
                    const newWin = payload.new as any;
                    setUsers(prev => {
                        const existing = prev[newWin.user_id];
                        if (!existing) {
                            fetchProfileForUser(newWin.user_id);
                            return {
                                ...prev,
                                [newWin.user_id]: {
                                    user_id: newWin.user_id,
                                    discord_name: 'Anonymous',
                                    avatar_url: '/images/v1-plush.webp',
                                    guesses: [],
                                    status: newWin.is_win ? 'won' : 'lost',
                                    attempt_count: newWin.attempt_count,
                                    last_guess_at: newWin.completed_at || new Date().toISOString(),
                                }
                            };
                        }
                        return {
                            ...prev,
                            [newWin.user_id]: {
                                ...existing,
                                status: newWin.is_win ? 'won' : 'lost',
                                attempt_count: newWin.attempt_count,
                            }
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(guessChannel);
            supabase.removeChannel(winChannel);
        };
    }, [dailyId]);

    if (loading) return <div className="text-white/50 animate-pulse uppercase text-xs">SYNCHRONIZING...</div>;

    const sortedUsers = Object.values(users).sort((a, b) => {
        const statusScore = { won: 2, playing: 1, lost: 0 };
        if (statusScore[a.status] !== statusScore[b.status]) {
            return statusScore[b.status] - statusScore[a.status];
        }
        if (a.attempt_count !== b.attempt_count) {
            return a.attempt_count - b.attempt_count;
        }
        return (a.last_guess_at || '').localeCompare(b.last_guess_at || '');
    });

    const getRankColor = (_index: number) => {
        return 'text-white/80';
    };

    // ── Horizontal layout (mobile) ──
    if (layout === 'horizontal') {
        return (
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {sortedUsers.map((user, index) => (
                        <motion.div
                            key={user.user_id}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-start justify-center gap-1 p-2 border w-36 flex-shrink-0 transition-colors ${user.status === 'won' ? 'bg-green-500/10 border-green-500/30' :
                                user.status === 'lost' ? 'bg-red-500/10 border-red-500/30' :
                                    'bg-white/5 border-white/10'
                                }`}
                        >
                            {/* Column 1: Rank, Avatar, Stats */}
                            <div className="flex flex-col items-center gap-1">
                                <span className={`text-xs font-bold ${getRankColor(index)}`}>
                                    #{index + 1}
                                </span>
                                <img
                                    src={user.avatar_url}
                                    alt={user.discord_name}
                                    className="w-8 h-8 border border-white/20"
                                />
                            </div>

                            {/* Column 2: Name & Grid */}
                            <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-xs font-bold text-white truncate">
                                    {user.discord_name}
                                </span>
                                <LogGrid hintData={user.guesses} size="sm" />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {sortedUsers.length === 0 && (
                    <div className="text-white/30 uppercase italic text-xs py-2 w-full text-center">
                        NO GUILD DATA.
                    </div>
                )}
            </div>
        );
    }

    // ── Vertical layout (desktop) ──
    return (
        <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
                {sortedUsers.map((user, index) => (
                    <motion.div
                        key={user.user_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-3 p-2 border transition-colors ${user.status === 'won' ? 'bg-green-500/10 border-green-500/30' :
                            user.status === 'lost' ? 'bg-red-500/10 border-red-500/30' :
                                'bg-white/5 border-white/10'
                            }`}
                    >
                        <span className={`text-sm font-bold w-5 text-center flex-shrink-0 ${getRankColor(index)}`}>
                            {index + 1}
                        </span>
                        <img
                            src={user.avatar_url}
                            alt={user.discord_name}
                            className="w-8 h-8 border border-white/20 flex-shrink-0"
                        />
                        <div className="flex flex-col flex-1 gap-0.5 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                                <span className="font-bold text-white tracking-widest uppercase truncate text-xs">
                                    {user.discord_name}
                                </span>
                            </div>
                            <LogGrid hintData={user.guesses} size="sm" />
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            {sortedUsers.length === 0 && (
                <div className="text-white/30 uppercase italic text-center py-4 text-xs">
                    NO DATA RECEIVED FROM GUILD MEMBERS.
                </div>
            )}
        </div>
    );
};
