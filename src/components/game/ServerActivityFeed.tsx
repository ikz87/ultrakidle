import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getGuildId } from '../../lib/discord';
import { LogGrid } from './LogGrid';
import { motion, AnimatePresence } from 'framer-motion';

interface ServerActivity {
    win_id: number;
    user_id: string;
    daily_choice_id: number;
    is_win: boolean;
    attempt_count: number;
    completed_at: string;
    discord_name: string;
    avatar_url: string;
    mission_log: any[];
}

export const ServerActivityFeed = () => {
    const [activities, setActivities] = useState<ServerActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const guildId = getGuildId();

    useEffect(() => {
        if (!guildId) {
            setLoading(false);
            return;
        }

        const fetchLogs = async () => {
            try {
                const { data, error } = await supabase
                    .from('server_activity_feed')
                    .select('*')
                    .eq('guild_id', guildId)
                    .order('completed_at', { ascending: false })
                    .limit(20);

                if (error) throw error;
                if (data) setActivities(data as ServerActivity[]);
            } catch (err) {
                console.error("[ServerActivity] Failed to fetch server activity", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();

        const channel = supabase
            .channel('server_activity_realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'user_wins'
            }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [guildId]);

    if (loading) return <div className="text-white/50 animate-pulse uppercase">ACCESSING SERVER ARCHIVES...</div>;
    if (!guildId) return <div className="text-red-500/50 uppercase">NOT RUNNING IN DISCORD CONTEXT</div>;
    if (activities.length === 0) return <div className="text-white/30 uppercase italic">NO RECENT ACTIVITY DETECTED.</div>;

    return (
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
                {activities.map((activity) => (
                    <motion.div
                        key={`${activity.user_id}-${activity.completed_at}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-4 p-3 bg-white/5 border border-white/10"
                    >
                        <img
                            src={activity.avatar_url || '/images/v1-plush.webp'}
                            alt={activity.discord_name}
                            className="w-12 h-12 border border-white/20"
                        />
                        <div className="flex flex-col flex-1 gap-1">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-white tracking-widest uppercase truncate max-w-[150px]">
                                    {activity.discord_name}
                                </span>
                                <span className="text-[10px] opacity-30">
                                    {new Date(activity.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex items-end justify-between">
                                <LogGrid hintData={activity.mission_log || []} size="sm" />
                                <div className="flex flex-col items-end">
                                    <span className={`text-[10px] font-bold ${activity.is_win ? 'text-green-500' : 'text-red-500'}`}>
                                        {activity.is_win ? 'IDENTIFIED' : 'FAILED'}
                                    </span>
                                    <span className="text-[10px] opacity-50 uppercase">
                                        {activity.attempt_count}/5
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
