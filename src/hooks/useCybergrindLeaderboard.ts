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
  rank: number;
}

export const useCybergrindLeaderboard = () => {
  const [entries, setEntries] = useState<CGLeaderboardEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;
        setCurrentUserId(userId);

        const { data: top10Data, error: top10Error } = await supabase
          .from("cybergrind_leaderboard")
          .select("*")
          .eq("client_version", CURRENT_VERSION)
          .lte("rank", 10)
          .order("rank", { ascending: true });

        if (top10Error) throw top10Error;
        const top10 = (top10Data || []) as CGLeaderboardEntry[];

        if (!userId) {
          setEntries(top10);
          return;
        }

        const { data: userStats, error: userError } = await supabase
          .from("cybergrind_leaderboard")
          .select("rank")
          .eq("user_id", userId)
          .eq("client_version", CURRENT_VERSION)
          .maybeSingle();

        if (userError) throw userError;

        if (!userStats || userStats.rank <= 10) {
          setEntries(top10);
          return;
        }

        const userRank = userStats.rank;
        const { data: neighbors, error: neighborError } = await supabase
          .from("cybergrind_leaderboard")
          .select("*")
          .eq("client_version", CURRENT_VERSION)
          .gte("rank", userRank - 1)
          .lte("rank", userRank + 1)
          .order("rank", { ascending: true });

        if (neighborError) throw neighborError;

        const merged = [...top10];
        for (const neighbor of neighbors as CGLeaderboardEntry[]) {
          if (!merged.some((e) => e.user_id === neighbor.user_id)) {
            merged.push(neighbor);
          }
        }
        merged.sort((a, b) => a.rank - b.rank);
        setEntries(merged);
      } catch (err) {
        console.error("Error fetching cybergrind leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return { entries, currentUserId, loading };
};
