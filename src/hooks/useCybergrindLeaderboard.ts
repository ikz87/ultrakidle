import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export interface CGLeaderboardEntry {
    user_id: string;
    discord_name: string;
    avatar_url: string;
    best_wave: number;
    total_guesses: number;
    hint_accuracy: number;
    achieved_at: string;
    rank: number;
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
                    .limit(10)
                    .order("rank", { ascending: true });

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
                    .select("rank")
                    .eq("user_id", userId)
                    .maybeSingle();

                if (userError) {
                    console.error("Error fetching user rank for cybergrind leaderboard:", userError);
                }

                if (!userData || !userData.rank) {
                    setEntries(top10);
                    setLoading(false);
                    return;
                }

                const userRank = userData.rank;

                if (userRank <= 11) {
                    // Fetch top 12 so user and neighbors overlap with top 10
                    const { data: top12Data, error: top12Error } = await supabase
                        .from("cybergrind_leaderboard")
                        .select("*")
                        .limit(12)
                        .order("rank", { ascending: true });

                    if (top12Error) {
                        console.error("Error fetching top 12 cybergrind leaderboard:", top12Error);
                    }

                    setEntries((top12Data || []) as CGLeaderboardEntry[]);
                    setHasEllipsis(false);
                } else {
                    // Get user and neighbors (rank ± 1)
                    const { data: neighborData, error: neighborError } = await supabase
                        .from("cybergrind_leaderboard")
                        .select("*")
                        .gte("rank", userRank - 1)
                        .lte("rank", userRank + 1)
                        .order("rank", { ascending: true });

                    if (neighborError) {
                        console.error("Error fetching neighbor records for cybergrind leaderboard:", neighborError);
                    }

                    setHasEllipsis(true);
                    const combined = [...top10, ...((neighborData || []) as CGLeaderboardEntry[])];

                    const uniqueEntries = Array.from(new Map(combined.map(e => [e.rank, e])).values());
                    uniqueEntries.sort((a, b) => a.rank - b.rank);

                    setEntries(uniqueEntries);
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
