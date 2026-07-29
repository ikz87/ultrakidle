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
  player_guess_id
}: GraphLevelGuessedProps) => {

  const { totalGuessesFromPlayers, maxGuessesFromPlayers } = useMemo(() => {
    let total = 0;
    let max = 0;

    const values = [...guessesFromPlayers.values()];
    console.log(values)
    values.forEach((amount) => {
      console.log(amount)
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
    <div className="space-y-3 w-fit ">
      <div className="flex flex-row items-end h-[100px] min-w-max px-1">
        {levels.map((level) => {
          const guessCount = guessesFromPlayers.has(level.id.toString())
            ? guessesFromPlayers.get(level.id.toString()) ?? 0
            : 0;
          const percent = Math.round(
            (guessCount / totalGuessesFromPlayers) * 100
          );
          const tooltipContent = (
            <div className="text-center">
              <p>{level.levelNumber}</p>
              <p>Guesses: {guessCount}</p>
              <p>{percent}%</p>
            </div>
          );

          return (
            <Tooltip key={level.id} content={tooltipContent} placement="top">
              <div
                className={`w-1 md:w-3 mx-[1px] opacity-60 hover:opacity-100 transition-opacity
                    ${
                      correct_level_id == level.id
                        ? "bg-green-500"
                        : player_guess_id == level.id
                          ? "bg-red-500"
                          : "bg-white/40"
                    }
                    `}
                style={{
                  height: `${Math.max(
                    4,
                    (96 * guessCount) / maxGuessesFromPlayers
                  )}%`,
                  borderRadius: "1px",
                }}
              />
            </Tooltip>
          );
        })}
      </div>
      <p className="text-white/50 text-center text-[10px]"> GLOBAL GUESS DISTRIBUTION </p>
    </div>
  );
};

export default GraphLevelGuessed;
