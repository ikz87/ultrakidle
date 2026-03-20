import { useState } from "react";
import { useLeaderboard } from "../../hooks/useLeaderboard";
import { useInfernoLeaderboard } from "../../hooks/useInfernoLeaderboard";
import { Leaderboard } from "./Leaderboard";
import { InfernoLeaderboard } from "./InfernoLeaderboard";

interface LeaderboardTabsProps {
  guildId?: string | null;
  layout?: "vertical" | "horizontal";
}

export const LeaderboardTabs = ({
  guildId,
  layout = "vertical",
}: LeaderboardTabsProps) => {
  const [mode, setMode] = useState<"classic" | "inferno">("classic");
  const classic = useLeaderboard(guildId);
  const inferno = useInfernoLeaderboard(guildId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex -mx-1">
        {(["classic", "infernoguessr"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className={`px-2 py-1 text-[10px] hover:cursor-pointer font-bold uppercase border transition-colors ${
              mode === tab
                ? "bg-white/10 border-white/30 text-white"
                : "bg-transparent border-white/10 text-white/40 hover:text-white/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {mode === "classic" ? (
        <Leaderboard
          layout={layout}
          users={classic.users}
          loading={classic.loading}
        />
      ) : (
        <InfernoLeaderboard
          layout={layout}
          users={inferno.users}
          loading={inferno.loading}
        />
      )}
    </div>
  );
};
