import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function usePlayerPresence(dailyId: number | null) {
    useEffect(() => {
        if (!dailyId) {
            console.log('[usePlayerPresence] No dailyId provided');
            return;
        }

        let isMounted = true;
        const channelName = `game_presence_${dailyId}`;
        console.log(`[usePlayerPresence] Initializing presence for channel: ${channelName}`);

        const presenceChannel = supabase.channel(channelName);

        const trackPlayer = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error('[usePlayerPresence] Error fetching user:', error.message);
                return;
            }

            if (user && isMounted) {
                console.log('[usePlayerPresence] Tracking user:', user.id);
                try {
                    const status = await presenceChannel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString(),
                    });
                    console.log('[usePlayerPresence] Track status:', status);
                } catch (trackError) {
                    console.error('[usePlayerPresence] Track error:', trackError);
                }
            } else if (!user) {
                console.warn('[usePlayerPresence] No user found to track');
            }
        };

        // If channel is already joined (e.g. by another hook), track immediately
        // Otherwise, wait for SUBSCRIBED status
        if ((presenceChannel as unknown as { state: string }).state === 'joined') {
            console.log('[usePlayerPresence] Channel already joined, tracking now');
            trackPlayer();
        }

        presenceChannel.subscribe(async (status) => {
            console.log(`[usePlayerPresence] Channel status update: ${status}`);
            if (status === 'SUBSCRIBED') {
                trackPlayer();
            }
        });

        return () => {
            isMounted = false;
            console.log('[usePlayerPresence] Cleaning up tracking');
            presenceChannel.untrack();
            presenceChannel.unsubscribe();
        };
    }, [dailyId]);
}
