import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { CURRENT_VERSION } from "../context/VersionContext";

export interface CGLeaderboardEntry {
    user_id: string;
    discord_name: string;
    avatar_url: string;
    best_wave: number;
    total_guesses: number;
    hint_accuracy: number;
    achieved_at: string;
    avg_accuracy: number;
    calculatedRank?: number;
}

export const useCybergrindLeaderboard = () => {
    const [entries, setEntries] = useState<CGLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasEllipsis, setHasEllipsis] = useState(false);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;

                // Fetch top 10
                const { data: top10Data, error: top10Error } = await supabase
                    .from("cybergrind_leaderboard")
                    .select("*")
                    .eq("client_version", CURRENT_VERSION)
                    .limit(10)
                    .order("best_wave", { ascending: false })
                    .order("hint_accuracy", { ascending: false });

                if (top10Error) {
                    console.error("Error fetching top 10 cybergrind leaderboard:", top10Error);
                }

                const top10 = (top10Data || []) as CGLeaderboardEntry[];

                if (!userId) {
                    setEntries(top10);
                    setLoading(false);
                    return;
                }

                // Fetch user's rank
                const { data: userData, error: userError } = await supabase
                    .from("cybergrind_leaderboard")
                    .select("best_wave, hint_accuracy")
                    .eq("user_id", userId)
                    .eq("client_version", CURRENT_VERSION)
                    .maybeSingle();

                if (userError) {
                    console.error("Error fetching user rank for cybergrind leaderboard:", userError);
                }

                if (!userData || !userData.best_wave) {
                    setEntries(top10);
                    setLoading(false);
                    return;
                }

                const userWave = userData.best_wave;
                const userAccuracy = userData.hint_accuracy;

                // Calculate version-specific rank
                const { count: rankCount } = await supabase
                    .from("cybergrind_leaderboard")
                    .select("*", { count: "exact", head: true })
                    .eq("client_version", CURRENT_VERSION)
                    .or(`best_wave.gt.${userWave},and(best_wave.eq.${userWave},hint_accuracy.gt.${userAccuracy})`);

                const userVersionRank = (rankCount || 0) + 1;

                const isUserInTop10 = top10.some(e => e.user_id === userId);

                if (isUserInTop10) {
                    // Fetch top 12 so user and neighbors overlap with top 10
                    const { data: top12Data, error: top12Error } = await supabase
                        .from("cybergrind_leaderboard")
                        .select("*")
                        .eq("client_version", CURRENT_VERSION)
                        .limit(12)
                        .order("best_wave", { ascending: false })
                        .order("hint_accuracy", { ascending: false });

                    if (top12Error) {
                        console.error("Error fetching top 12 cybergrind leaderboard:", top12Error);
                    }

                    setEntries((top12Data || []).map((e, i) => ({ ...e, calculatedRank: i + 1 })) as CGLeaderboardEntry[]);
                    setHasEllipsis(false);
                } else {
                    const { data: neighborData, error: neighborError } = await supabase
                        .from("cybergrind_leaderboard")
                        .select("*")
                        .eq("client_version", CURRENT_VERSION)
                        .gte("best_wave", userWave - 1)
                        .lte("best_wave", userWave + 1)
                        .order("best_wave", { ascending: false })
                        .order("hint_accuracy", { ascending: false });

                    if (neighborError) {
                        console.error("Error fetching neighbor records for cybergrind leaderboard:", neighborError);
                    }

                    setHasEllipsis(true);
                    const combined = [...top10, ...((neighborData || []) as CGLeaderboardEntry[])];

                    const uniqueEntries = Array.from(new Map(combined.map(e => [e.user_id, e])).values());
                    uniqueEntries.sort((a, b) => {
                        if (a.best_wave !== b.best_wave) return b.best_wave - a.best_wave;
                        return b.hint_accuracy - a.hint_accuracy;
                    });

                    // For neighbours, if they are contiguous with top 10, we can assign ranks easily.
                    // But for now, let's just assign the user's rank and its relative neighbors.
                    const finalEntries = uniqueEntries.map(e => {
                        if (e.user_id === userId) return { ...e, calculatedRank: userVersionRank };
                        // This is an approximation for neighbors, but it's better than nothing
                        // If we really want their ranks, we'd need more count queries or a better view.
                        return e;
                    });

                    setEntries(finalEntries as CGLeaderboardEntry[]);
                }

            } catch (err) {
                console.error("Error fetching cybergrind leaderboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    return { entries, loading, hasEllipsis };
};
