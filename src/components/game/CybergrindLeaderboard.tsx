import { motion, AnimatePresence } from "framer-motion";
import { useCybergrindLeaderboard } from "../../hooks/useCybergrindLeaderboard";

export const CybergrindLeaderboard = () => {
  const { entries, loading } = useCybergrindLeaderboard();

  if (loading) {
    return (
      <div className="text-white/50 w-full animate-pulse uppercase text-sm p-4 text-center tracking-widest">
        SYNCHRONIZING LEADERBOARD DATA...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-white/30 uppercase italic text-sm py-4 text-center tracking-widest">
        NO RECORDS FOUND.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-white/10 mb-1">
        <span className="text-white/50 font-bold tracking-widest text-xs uppercase">
          TOP PERFORMERS
        </span>
      </div>

      <AnimatePresence initial={false}>
        {entries.map((entry, index) => {
          const displayRank = entry.calculatedRank || (index < 10 ? index + 1 : undefined);
          const prevRank = index > 0 ? (entries[index - 1].calculatedRank || (index <= 10 ? index : undefined)) : undefined;
          const hasGap = displayRank && prevRank ? displayRank - prevRank > 1 : false;

          const isTop3 = displayRank && displayRank <= 3;
          const medalColor =
            displayRank === 1
              ? "text-yellow-500"
              : displayRank === 2
                ? "text-zinc-300"
                : displayRank === 3
                  ? "text-amber-600"
                  : "text-white/40";

          const borderAccent =
            displayRank === 1
              ? "border-yellow-500/20"
              : displayRank === 2
                ? "border-zinc-300/20"
                : displayRank === 3
                  ? "border-amber-600/20"
                  : "border-white/5";

          const accuracy = entry.avg_accuracy
            ? (entry.avg_accuracy * 20).toFixed(2)
            : "0.00";

          return (
            <div key={entry.user_id}>
              {hasGap && (
                <div className="flex justify-center my-1 opacity-30 py-1">
                  <span className="text-white tracking-[0.3em] text-xs">
                    · · ·
                  </span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-3 px-2 py-2 border transition-colors ${isTop3
                    ? `bg-white/5 ${borderAccent}`
                    : "bg-white/[0.02] border-white/5"
                  } hover:bg-white/[0.07]`}
              >
                <div
                  className={`text-lg font-black w-8 text-center ${medalColor} flex-shrink-0 italic tracking-tighter`}
                >
                  {displayRank || "#"}
                </div>

                <img
                  src={entry.avatar_url || "/images/v1-plush.webp"}
                  alt={entry.discord_name}
                  className="w-10 h-10 border border-white/10 flex-shrink-0 object-cover"
                />

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-xs font-bold text-white truncate uppercase tracking-widest">
                    {entry.discord_name || "UNKNOWN_USER"}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] opacity-50 tracking-tight flex-wrap mt-0.5">
                    <span className="text-green-500 font-bold whitespace-nowrap">
                      W:{entry.best_wave}
                    </span>
                    <span className="text-white/20">|</span>
                    <span className="whitespace-nowrap">ACC: {accuracy}%</span>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
