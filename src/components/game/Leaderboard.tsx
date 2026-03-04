import { LogGrid } from './LogGrid';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserState } from '../../hooks/useLeaderboard';

interface LeaderboardProps {
    layout?: 'vertical' | 'horizontal';
    users: Record<string, UserState>;
    loading: boolean;
}

export const Leaderboard = ({ layout = 'vertical', users, loading }: LeaderboardProps) => {
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

    const getRankColor = () => {
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
                                <span className={`text-xs font-bold ${getRankColor()}`}>
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
                        className={`flex items-start gap-3 p-2 border transition-colors h-[107px] ${user.status === 'won' ? 'bg-green-500/10 border-green-500/30' :
                            user.status === 'lost' ? 'bg-red-500/10 border-red-500/30' :
                                'bg-white/5 border-white/10'
                            }`}
                    >
                        <span className={`text-sm font-bold w-5 text-center flex-shrink-0 pt-0.5 ${getRankColor()}`}>
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
