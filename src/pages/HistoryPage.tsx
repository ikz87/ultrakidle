import { useState } from "react";
import SEO from "../components/SEO";
import Button from "../components/ui/Button";
import { usePlayHistory } from "../hooks/usePlayHistory";
import { Typewriter } from "../components/Typewriter";
import ModeTabs from "../components/ui/ModeTabs";
import type { GameMode } from "../components/ui/ModeTabs";

const HistoryPage = () => {
  const { loading, history, infernoHistory, longestStreak } = usePlayHistory();
  const [activeMode, setActiveMode] = useState<GameMode>("classic");
  const [visibleCount, setVisibleCount] = useState(10);

  const totalMissions = history.length;
  const successfulMissions = history.filter((h) => h.is_win).length;
  const successRate =
    totalMissions > 0 ? Math.round((successfulMissions / totalMissions) * 100) : 0;

  const totalInfernoMissions = infernoHistory.length;
  const avgInfernoScore =
    totalInfernoMissions > 0
      ? Math.round(
          infernoHistory.reduce((acc, h) => acc + (h.total_score || 0), 0) /
            totalInfernoMissions,
        )
      : 0;
  const avgInfernoTime =
    totalInfernoMissions > 0
      ? (
          infernoHistory.reduce(
            (acc, h) => acc + (h.total_time_seconds || 0),
            0,
          ) / totalInfernoMissions
        ).toFixed(1)
      : "0";

  const currentHistory = activeMode === "classic" ? history : infernoHistory;
  const visibleHistory = currentHistory.slice(0, visibleCount);

  const tabs = [
    { id: "classic" as GameMode, label: "CLASSIC" },
    { id: "inferno" as GameMode, label: "INFERNOGUESSR" },
  ];

  const handleModeChange = (mode: GameMode) => {
    setActiveMode(mode);
    setVisibleCount(10);
  };

  return (
    <div className="flex flex-col w-full h-full pt-4 shrink justify-start items-start overflow-hidden">
      <ModeTabs
        activeMode={activeMode}
        onModeChange={handleModeChange}
        tabs={tabs}
      />
      <SEO
        title="Service Record"
        description="View your previous mission logs and success rate in ULTRAKIDLE."
      />
      <div className="flex flex-col w-full h-[700px] max-h-full max-w-2xl bg-black/40 border-2 border-white/10 p-4 uppercase font-bold tracking-widest text-white overflow-hidden">
        {loading ? (
          <div className="text-2xl animate-pulse mt-2">
            ACCESSING ARCHIVES...
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-4 border-b border-white/10 flex-shrink-0">
            <h1 className="text-xl opacity-50">SERVICE_RECORD</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-6">
              {activeMode === "classic" ? (
                <>
                  <div className="flex flex-col items-center text-center bg-white/5 p-3 md:p-0 border-l-2 md:border-l-0 border-white/20 relative overflow-hidden group">
                    <span className="opacity-50 text-[10px] md:text-sm tracking-tighter">
                      TOTAL DEPLOYMENTS
                    </span>
                    <span className="text-2xl md:text-3xl font-black">
                      {totalMissions}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center bg-white/5 p-3 md:p-0 border-l-2 md:border-l-0 border-yellow-500/20 relative overflow-hidden group">
                    <span className="opacity-50 text-[10px] md:text-sm tracking-tighter">
                      LONGEST STREAK
                    </span>
                    <span className="text-2xl md:text-3xl font-black text-yellow-500">
                      {longestStreak}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center bg-white/5 p-3 md:p-0 border-l-2 md:border-l-0 border-green-500/20 relative overflow-hidden group">
                    <span className="opacity-50 text-[10px] md:text-sm tracking-tighter">
                      SUCCESS RATE
                    </span>
                    <span className="text-2xl md:text-3xl font-black text-green-500">
                      {successRate}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center text-center bg-white/5 p-3 md:p-0 border-l-2 md:border-l-0 border-white/20 relative overflow-hidden group">
                    <span className="opacity-50 text-[10px] md:text-sm tracking-tighter">
                      TOTAL DEPLOYMENTS
                    </span>
                    <span className="text-2xl md:text-3xl font-black">
                      {totalInfernoMissions}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center bg-white/5 p-3 md:p-0 border-l-2 md:border-l-0 border-orange-500/20 relative overflow-hidden group">
                    <span className="opacity-50 text-[10px] md:text-sm tracking-tighter">
                      AVERAGE SCORE
                    </span>
                    <span className="text-2xl md:text-3xl font-black text-orange-500">
                      {avgInfernoScore}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center bg-white/5 p-3 md:p-0 border-l-2 md:border-l-0 border-cyan-500/20 relative overflow-hidden group">
                    <span className="opacity-50 text-[10px] md:text-sm tracking-tighter">
                      AVERAGE TIME
                    </span>
                    <span className="text-2xl md:text-3xl font-black text-cyan-500">
                      {avgInfernoTime}s
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col flex-1 min-h-0">
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <span className="text-xl opacity-50 mb-4 flex-shrink-0">
              MISSION_LOGS
            </span>

            {!loading && currentHistory.length === 0 && (
              <div className="opacity-50">
                <Typewriter
                  text="NO PREVIOUS DEPLOYMENTS FOUND."
                  speed={0.02}
                />
              </div>
            )}

            {!loading && currentHistory.length > 0 && (
              <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0 h-72">
                {visibleHistory.map((entry, index) => {
                  if (activeMode === "classic") {
                    const classicEntry = entry as any;
                    const choice = classicEntry.daily_choice;
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-white/5 p-4 border border-white/10"
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="opacity-50 text-sm">
                            {choice?.chosen_at
                              ? new Date(
                                  choice.chosen_at,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "UNKNOWN_DATE"}
                          </span>
                          <span className="text-sm">
                            {choice?.enemy?.name || "UNKNOWN_TARGET"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={
                              classicEntry.is_win
                                ? "text-green-500"
                                : "text-red-500"
                            }
                          >
                            {classicEntry.is_win
                              ? "TARGET IDENTIFIED"
                              : "MISSION FAILED"}
                          </span>
                          <span className="opacity-50 text-sm">
                            ATTEMPTS: {classicEntry.attempt_count}/5
                          </span>
                        </div>
                      </div>
                    );
                  } else {
                    const infernoEntry = entry as any;
                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-white/5 p-4 border border-white/10"
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="opacity-50 text-sm">
                            {infernoEntry.set?.game_date
                              ? new Date(
                                  infernoEntry.set.game_date,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "UNKNOWN_DATE"}
                          </span>
                          <span className="text-sm">
                            TOTAL SCORE: {infernoEntry.total_score}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <span className="text-orange-500">
                            RECON COMPLETED
                          </span>
                          <span className="opacity-50 text-sm">
                            TIME:{" "}
                            {infernoEntry.total_time_seconds
                              ? `${infernoEntry.total_time_seconds}s`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })}
                {currentHistory.length > visibleCount && (
                  <div className="w-full flex justify-center mt-2 pb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                      className="opacity-50 hover:opacity-100"
                    >
                      LOAD MORE...
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
