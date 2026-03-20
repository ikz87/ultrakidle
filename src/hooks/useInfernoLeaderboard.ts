import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export interface InfernoUserState {
  user_id: string;
  discord_name: string;
  avatar_url: string;
  total_score: number | null;
  total_time_seconds: number;
  score_history: number[];
  status: "playing" | "completed";
}

export const useInfernoLeaderboard = (guildId?: string | null) => {
  const [users, setUsers] = useState<Record<string, InfernoUserState>>(
    {}
  );
  const [setId, setSetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowedUserIds, setAllowedUserIds] = useState<Set<string> | null>(
    null
  );

  useEffect(() => {
    const init = async () => {
      try {
        const today = new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Managua",
        });

        const { data: setData } = await supabase
          .from("inferno_daily_sets")
          .select("id")
          .eq("game_date", today)
          .single();

        if (!setData) {
          setLoading(false);
          return;
        }
        setSetId(setData.id);

        let guildMemberIds: string[] | null = null;
        if (guildId) {
          const { data: guildData } = await supabase
            .from("user_guilds")
            .select("user_id")
            .eq("guild_id", guildId);
          if (guildData) {
            guildMemberIds = guildData.map((g) => g.user_id);
            setAllowedUserIds(new Set(guildMemberIds));
          }
        } else {
          setAllowedUserIds(null);
        }

        let query = supabase
          .from("inferno_results")
          .select(
            "user_id, total_score, score_history, total_time_seconds, completed_at"
          )
          .eq("set_id", setData.id);

        if (guildMemberIds) {
          query = query.in("user_id", guildMemberIds);
        }

        const { data: results } = await query;

        const userIds = Array.from(
          new Set(results?.map((r) => r.user_id) || [])
        );

        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, discord_name, avatar_url")
          .in("id", userIds.length > 0 ? userIds : ["__none__"]);

        const profileMap = (profileData || []).reduce(
          (
            acc: Record<
              string,
              { discord_name: string; avatar_url: string | null }
            >,
            p
          ) => {
            acc[p.id] = p;
            return acc;
          },
          {}
        );

        const initialUsers: Record<string, InfernoUserState> = {};
        results?.forEach((row) => {
          const profile = profileMap[row.user_id];
          initialUsers[row.user_id] = {
            user_id: row.user_id,
            discord_name:
              profile?.discord_name || row.user_id.slice(0, 8),
            avatar_url:
              profile?.avatar_url || "/images/v1-plush.webp",
            total_score: row.total_score,
            total_time_seconds: row.total_time_seconds || 0,
            score_history: row.score_history || [],
            status: row.completed_at ? "completed" : "playing",
          };
        });

        setUsers(initialUsers);
      } catch (err) {
        console.error("[InfernoLeaderboard] Init failed", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [guildId]);

  useEffect(() => {
    if (!setId) return;

    const channel = supabase
      .channel("inferno_leaderboard")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "inferno_results",
          filter: `set_id=eq.${setId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id: string;
            total_score: number | null;
            score_history: number[];
            total_time_seconds: number;
            completed_at: string | null;
          };

          if (allowedUserIds && !allowedUserIds.has(row.user_id))
            return;

          supabase
            .from("profiles")
            .select("discord_name, avatar_url")
            .eq("id", row.user_id)
            .single()
            .then(({ data: profile }) => {
              setUsers((prev) => ({
                ...prev,
                [row.user_id]: {
                  user_id: row.user_id,
                  discord_name:
                    profile?.discord_name ||
                    row.user_id.slice(0, 8),
                  avatar_url:
                    profile?.avatar_url || "/images/v1-plush.webp",
                  total_score: row.total_score,
                  total_time_seconds: row.total_time_seconds || 0,
                  score_history: row.score_history || [],
                  status: row.completed_at ? "completed" : "playing",
                },
              }));
            });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inferno_results",
          filter: `set_id=eq.${setId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id: string;
            total_score: number | null;
            score_history: number[];
            total_time_seconds: number;
            completed_at: string | null;
          };

          if (allowedUserIds && !allowedUserIds.has(row.user_id))
            return;

          setUsers((prev) => {
            const existing = prev[row.user_id];
            if (!existing) return prev;
            return {
              ...prev,
              [row.user_id]: {
                ...existing,
                total_score: row.total_score,
                total_time_seconds: row.total_time_seconds || 0,
                score_history: row.score_history || [],
                status: row.completed_at ? "completed" : "playing",
              },
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setId, allowedUserIds]);

  return { users, loading };
};
