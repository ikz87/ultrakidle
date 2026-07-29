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
    <div className='hidden lg:flex flex-row items-end ml-4'>
      {levels.map((level) => {
        const guessCount = guessesFromPlayers.has(level.id.toString()) ?
          guessesFromPlayers.get(level.id.toString()) ?? 0 :
          0;
        const percent = Math.round((guessCount / totalGuessesFromPlayers * 100));
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
              className={`w-3 mr-0.75 opacity-50
                  ${correct_level_id == level.id ?
                  'bg-green-500' :
                  (player_guess_id == level.id ?
                    'bg-red-500' :
                    'bg-white')}
                  `}
              style={{
                height: `${98 * guessCount / maxGuessesFromPlayers + 2}%`,
                borderRadius: '2px'
              }}>
            </div>
          </Tooltip>
        )
      })}
    </div>
  );
};

export default GraphLevelGuessed;
