import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../../context/SettingsContext";
import type { InfernoUserState } from "../../hooks/useInfernoLeaderboard";

interface InfernoLeaderboardProps {
  layout?: "vertical" | "horizontal";
  users: Record<string, InfernoUserState>;
  loading: boolean;
}

const TOTAL_ROUNDS = 5;
const MAX_SCORE = TOTAL_ROUNDS * 100;
const TYPEWRITER_INTERVAL_MS = 120;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
};

const getScoreColor = (score: number) => {
  if (score === 100) return "green";
  if (score >= 60) return "yellow";
  return "red";
};

const InfernoScoreGrid = ({ scores }: { scores: number[] }) => {
  const { colorblindMode } = useSettings();

  const totalFilled = scores.length;
  const prevTotalRef = useRef(0);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    const prev = prevTotalRef.current;
    if (totalFilled <= prev) {
      prevTotalRef.current = totalFilled;
      return;
    }

    setRevealedCount(prev);

    const interval = setInterval(() => {
      setRevealedCount((c) => {
        if (c >= totalFilled) {
          clearInterval(interval);
          return c;
        }
        return c + 1;
      });
    }, TYPEWRITER_INTERVAL_MS);

    prevTotalRef.current = totalFilled;
    return () => clearInterval(interval);
  }, [totalFilled]);

  const colorClasses: Record<string, string> = {
    green: "bg-green-500/20 border-green-500 text-green-400",
    yellow: colorblindMode
      ? "bg-blue-500/20 border-blue-500 text-blue-400"
      : "bg-yellow-500/20 border-yellow-500 text-yellow-400",
    red: "bg-red-500/20 border-red-500 text-red-400",
    gray: "bg-zinc-800/20 border-zinc-500/30",
  };

  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => {
        const score = scores[i];
        const hasScore = score !== undefined;
        const revealed = i < revealedCount;
        const color =
          hasScore && revealed ? getScoreColor(score) : "gray";
        return (
          <div key={i} className="flex items-center gap-0.5">
            <div
              className={`w-3 h-3 border transition-colors duration-200 ${colorClasses[color]}`}
            />
            {hasScore && revealed && (
              <span
                className={`text-[10px] -my-2 ${colorClasses[color]} !bg-transparent`}
              >
                +{score}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const InfernoLeaderboard = ({
  layout = "vertical",
  users,
  loading,
}: InfernoLeaderboardProps) => {
  if (loading)
    return (
      <div className="text-white/50 w-full animate-pulse uppercase text-xs">
        SYNCHRONIZING...
      </div>
    );

  const sortedUsers = Object.values(users).sort((a, b) => {
    const statusScore = { completed: 1, playing: 0 };
    if (statusScore[a.status] !== statusScore[b.status]) {
      return statusScore[b.status] - statusScore[a.status];
    }

    const scoreA =
      a.total_score ??
      a.score_history.reduce((s, v) => s + v, 0);
    const scoreB =
      b.total_score ??
      b.score_history.reduce((s, v) => s + v, 0);
    if (scoreA !== scoreB) return scoreB - scoreA;

    if (
      a.status === "completed" &&
      b.status === "completed" &&
      a.total_time_seconds !== b.total_time_seconds
    ) {
      return a.total_time_seconds - b.total_time_seconds;
    }

    return a.score_history.length - b.score_history.length;
  });

  const renderEntry = (user: InfernoUserState, index: number) => {
    const partialScore =
      user.total_score ??
      user.score_history.reduce((s, v) => s + v, 0);

    return (
      <motion.div
        key={user.user_id}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-1 p-2 border transition-colors ${
          layout === "horizontal"
            ? "w-36 flex-shrink-0"
            : "w-[135px]"
        } ${
          user.status === "completed"
            ? partialScore >= 0 
              ? "bg-green-500/10 border-green-500/30"
              : "bg-white/5 border-white/20"
            : "bg-white/5 border-white/10"
        }`}
      >
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-white/80">
            #{index + 1}
          </span>
          <img
            src={user.avatar_url}
            alt={user.discord_name}
            className="w-8 h-8 border border-white/20"
          />
          <div className="text-[10px] text-white/70 leading-tight">
            <div>
              <span className="text-white">
                {partialScore}/{MAX_SCORE}
              </span>
            </div>
            {user.status === "completed" ? (
              <div>
                <span className="text-white">
                  {formatTime(user.total_time_seconds)}
                </span>
              </div>
            ) : (
              <div className="text-white/30">
                {user.score_history.length}/{TOTAL_ROUNDS}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs font-bold text-white truncate">
            {user.discord_name}
          </span>
          <InfernoScoreGrid scores={user.score_history} />
        </div>
      </motion.div>
    );
  };

  const emptyMessage =
    layout === "horizontal"
      ? "NO GUILD DATA."
      : "NO DATA RECEIVED FROM GUILD MEMBERS.";

  return (
    <div
      className={
        layout === "horizontal"
          ? "flex gap-2 overflow-x-auto pb-2 custom-scrollbar"
          : "flex flex-col gap-2 w-full"
      }
    >
      <AnimatePresence initial={false}>
        {sortedUsers.map((user, index) =>
          renderEntry(user, index)
        )}
      </AnimatePresence>
      {sortedUsers.length === 0 && (
        <div
          className={`text-white/30 uppercase italic text-xs ${
            layout === "horizontal"
              ? "py-2 w-full text-center"
              : "text-center py-4"
          }`}
        >
          {emptyMessage}
        </div>
      )}
    </div>
  );
};
