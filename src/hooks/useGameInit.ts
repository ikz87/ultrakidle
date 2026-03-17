import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { getMsUntilNicaraguaMidnight } from "../lib/time";

export interface Donor {
  name: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface GuessHistoryEntry {
  guess_enemy_id: number;
  hint_data: {
    correct: boolean;
    correct_id?: number;
    properties: {
      enemy_type: { value: string; result: "correct" | "incorrect" };
      weight_class: { value: string; result: "correct" | "incorrect" };
      health: {
        value: number;
        result: "correct" | "higher" | "lower";
      };
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
}

export function useGameInit() {
  const [loading, setLoading] = useState(true);
  const [dailyId, setDailyId] = useState<number | null>(null);
  const [guessHistory, setGuessHistory] = useState<GuessHistoryEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [dailyChanged, setDailyChanged] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    async function fetchRates() {
      try {
        const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD");
        const data = await res.json();
        if (data.rates) {
          setRates({ ...data.rates, USD: 1 });
        }
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
        if (!session) {
          const { error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error("Anonymous sign-in failed:", error.message);
            return;
          }
        }

        const { data, error } = await supabase.rpc("init_game");
        if (error) {
          console.error("init_game failed:", error.message);
          return;
        }

        setDailyId(data.daily_id);
        setGuessHistory(data.history ?? []);
        setDailyStats(data.stats);
        setStreak(data.streak);
        setDonors(data.donors ?? []);
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
      }, msUntilMidnight);
    };

    scheduleReset();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return {
    loading,
    dailyId,
    guessHistory,
    dailyStats,
    streak,
    donors,
    rates,
    refresh,
    dailyChanged,
    setDailyChanged,
  };
}
