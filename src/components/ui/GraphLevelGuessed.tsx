import { levels } from "../../lib/levels_list";
import Tooltip from "./Tooltip";
import { useMemo } from "react";

interface GraphLevelGuessedProps {
  guessesFromPlayers: Map<string, number>;
  correct_level_id: number;
  player_guess_id: number;
}

const GraphLevelGuessed = ({
  guessesFromPlayers,
  correct_level_id,
  player_guess_id,
}: GraphLevelGuessedProps) => {
  const { totalGuessesFromPlayers, maxGuessesFromPlayers } = useMemo(() => {
    let total = 0;
    let max = 0;

    const values = [...guessesFromPlayers.values()];
    values.forEach((amount) => {
      total += amount;
      if (amount > max) {
        max = amount;
      }
    });

    return {
      totalGuessesFromPlayers: total,
      maxGuessesFromPlayers: max,
    };
  }, [guessesFromPlayers]);

  return (
    <div className="space-y-3 w-fit pt-6">
      <div className="flex flex-row items-end h-[100px] min-w-max px-1">
        {levels.map((level) => {
          const guessCount = guessesFromPlayers.has(level.id.toString())
            ? guessesFromPlayers.get(level.id.toString()) ?? 0
            : 0;
          const percent = Math.round(
            (guessCount / totalGuessesFromPlayers) * 100
          );
          const barHeight = Math.max(4, (96 * guessCount) / maxGuessesFromPlayers);
          const isPlayerGuess = player_guess_id === level.id;

          const tooltipContent = (
            <div className="text-center">
              <p>{level.levelNumber}</p>
              <p>Guesses: {guessCount}</p>
              <p>{percent}%</p>
            </div>
          );

          return (
            <div
              key={level.id}
              className="relative flex flex-col items-center h-full justify-end"
            >
              {isPlayerGuess && (
                <div
                  className="absolute flex flex-col items-center mb-1 pb-[2px]"
                  style={{ bottom: `${barHeight}%` }}
                >
                  <span className="text-[10px] font-bold text-red-500 leading-none">
                    YOU
                  </span>
                  <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-red-500" />
                </div>
              )}
              <Tooltip content={tooltipContent} placement="top">
                <div
                  className={`w-1 md:w-3 mx-[1px] opacity-60 hover:opacity-100 transition-opacity
                    ${
                      correct_level_id == level.id
                        ? "bg-green-500"
                        : isPlayerGuess
                          ? "bg-red-500"
                          : "bg-white/40"
                    }
                    `}
                  style={{
                    height: `${barHeight}%`,
                    borderRadius: "1px",
                  }}
                />
              </Tooltip>
            </div>
          );
        })}
      </div>
      <p className="text-white/50 text-center text-[10px]">
        GLOBAL GUESS DISTRIBUTION
      </p>
    </div>
  );
};

export default GraphLevelGuessed;
