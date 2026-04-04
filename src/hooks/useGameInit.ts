import { useState, useEffect, useCallback } from "react";
import { resolveExternalUrl } from "../lib/urls";
import { supabase } from "../lib/supabaseClient";
import { getMsUntilNicaraguaMidnight } from "../lib/time";

export interface Donor {
  name: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface ClassicRank {
  rank: number | null;
  tied_with: number | null;
  streak: number;
}

export interface InfernoRank {
  rank: number | null;
  total_players: number | null;
  score: number | null;
  time: number | null;
}

export interface Ranks {
  classic: ClassicRank;
  inferno: InfernoRank;
}

export interface GuessHistoryEntry {
  guess_enemy_id: number;
  hint_data: {
    correct: boolean;
    correct_id?: number;
    properties: {
      enemy_type: { value: string; result: "correct" | "incorrect" };
      weight_class: { value: string; result: "correct" | "incorrect" };
      health: { value: number; result: "correct" | "higher" | "lower" };
      level_count: {
        value: number;
        result: "correct" | "higher" | "lower";
        color?: "green" | "yellow" | "red";
      };
      appearance: { value: string; result: "correct" | "incorrect" };
    };
  };
}

export interface DailyStats {
  total_players: number;
  total_wins: number;
  total_losses: number;
}

export interface InfernoTotalScore {
  total_score: number;
  games_played: number;
}

export interface InfernoDailyAvg {
  avg_score: number | null;
  total_completed: number;
}

export type InfernoStatus = "no_game_today" | "in_progress" | "completed";

export interface InfernoRoundData {
  status: InfernoStatus;
  total_score?: number;
  rounds?: any[];
  round_number?: number;
  round_id?: string;
  image_url?: string;
  submitted_by?: any;
  previous_rounds?: any[];
}

function preloadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
}

export function useGameInit() {
  const [loading, setLoading] = useState(true);
  const [dailyId, setDailyId] = useState<number | null>(null);
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [guessHistory, setGuessHistory] = useState<GuessHistoryEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ranks, setRanks] = useState<Ranks | null>(null);

  const [infernoTotal, setInfernoTotal] =
    useState<InfernoTotalScore | null>(null);
  const [infernoAvg, setInfernoAvg] =
    useState<InfernoDailyAvg | null>(null);
  const [infernoStatus, setInfernoStatus] =
    useState<InfernoRoundData | null>(null);
  const [infernoImageUrls, setInfernoImageUrls] = useState<
    Record<number, string>
  >({});

  const [refreshKey, setRefreshKey] = useState(0);
  const [dailyChanged, setDailyChanged] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch(
          "https://api.frankfurter.dev/v1/latest?base=USD",
        );
        const data = await res.json();
        if (data.rates) setRates({ ...data.rates, USD: 1 });
      } catch (e) {
        console.error("Exchange rate fetch failed:", e);
      }
    }
    fetchRates();
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) await supabase.auth.signInAnonymously();

        const { data, error } = await supabase.rpc("init_game");
        if (error) throw error;

        setDailyId(data.daily_id);
        setDayNumber(data.day_number);
        setGuessHistory(data.history ?? []);
        setDailyStats(data.stats);
        setStreak(data.streak);
        setRanks(data.ranks ?? null);
        setDonors(data.donors ?? []);
        setInfernoTotal(data.inferno?.total ?? null);
        setInfernoAvg(data.inferno?.daily_avg ?? null);
        setInfernoStatus(data.inferno?.status ?? null);

        const paths: { round_number: number; image_url: string }[] =
        data.inferno?.paths ?? [];

        
        if (paths.length > 0) {
          const urlMap: Record<number, string> = {};
          for (const p of paths) {
            if (p.image_url) {
              urlMap[p.round_number] = resolveExternalUrl(p.image_url);
            }
          }
          setInfernoImageUrls(urlMap);

          Object.values(urlMap).forEach((url) => {
            preloadImage(url).catch(() => {});
          });
        }


      } catch (err) {
        console.error("Game init error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [refreshKey]);

  useEffect(() => {
    let timeoutId: any;
    const scheduleReset = () => {
      const msUntilMidnight = getMsUntilNicaraguaMidnight();
      timeoutId = setTimeout(() => {
        setDailyChanged(true);
        scheduleReset();
      }, msUntilMidnight + 2000);
    };
    scheduleReset();
    return () => clearTimeout(timeoutId);
  }, []);

  return {
    loading,
    dailyId,
    dayNumber,
    guessHistory,
    dailyStats,
    streak,
    ranks,
    donors,
    rates,
    refresh,
    dailyChanged,
    setDailyChanged,
    infernoTotal,
    infernoAvg,
    infernoStatus,
    infernoImageUrls,
  };
}
