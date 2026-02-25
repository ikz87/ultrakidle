export interface GuessResult {
    guess_id?: number;
    enemy_name: string;
    correct: boolean;
    correct_id?: number;
    properties: {
        enemy_type: { value: string; result: 'correct' | 'incorrect' };
        weight_class: { value: string; result: 'correct' | 'incorrect' };
        health: { value: number; result: 'correct' | 'higher' | 'lower' };
        is_boss: { value: boolean; result: 'correct' | 'incorrect' };
        appearance: { value: string; result: 'correct' | 'incorrect' };
    };
}

interface GuessBoardProps {
    guesses: GuessResult[];
}

export const GuessBoard = ({ guesses }: GuessBoardProps) => {
    return (
        <div className="mt-4  overflow-x-auto">
            <table className="w-full text-sm text-left uppercase border-collapse">
                <thead className="text-xs text-white/50 bg-white/5 border-b border-white/10">
                    <tr>
                        <th className="px-4 py-3">Enemy</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Weight</th>
                        <th className="px-4 py-3">Health</th>
                        <th className="px-4 py-3">Is Boss</th>
                        <th className="px-4 py-3">Registered at</th>
                    </tr>
                </thead>
                <tbody>
                    {guesses.map((guess, idx) => (
                        <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                            {/* Static Name Column */}
                            <td className="px-4 py-4 font-bold max-w-[150px] ">
                                {guess.enemy_name}
                            </td>

                            {/* Enemy Type */}
                            <td className={`px-4 py-4 font-bold border-l-4 ${guess.properties.enemy_type.result === 'correct'
                                ? 'bg-green-600/20 border-green-500 text-green-400'
                                : 'bg-red-600/20 border-red-500 text-red-400'
                                }`}>
                                {guess.properties.enemy_type.value || 'UNKNOWN'}
                            </td>

                            {/* Weight Class */}
                            <td className={`px-4 py-4 font-bold border-l-4 ${guess.properties.weight_class.result === 'correct'
                                ? 'bg-green-600/20 border-green-500 text-green-400'
                                : 'bg-red-600/20 border-red-500 text-red-400'
                                }`}>
                                {guess.properties.weight_class.value || 'UNKNOWN'}
                            </td>

                            {/* Health */}
                            <td className={`px-4 py-4 font-bold border-l-4 ${guess.properties.health.result === 'correct'
                                ? 'bg-green-600/20 border-green-500 text-green-400'
                                : 'bg-red-600/20 border-red-500 text-red-400'
                                }`}>
                                <div className="flex items-center gap-2 h-full">
                                    {guess.properties.health.value}
                                    {guess.properties.health.result === 'higher' && <span className="text-lg">↑</span>}
                                    {guess.properties.health.result === 'lower' && <span className="text-lg">↓</span>}
                                </div>
                            </td>

                            {/* Is Boss */}
                            <td className={`px-4 py-4 font-bold border-l-4 ${guess.properties.is_boss.result === 'correct'
                                ? 'bg-green-600/20 border-green-500 text-green-400'
                                : 'bg-red-600/20 border-red-500 text-red-400'
                                }`}>
                                {guess.properties.is_boss.value ? 'YES' : 'NO'}
                            </td>

                            {/* Appearance */}
                            <td className={`px-4 py-4 font-bold border-l-4 ${guess.properties.appearance.result === 'correct'
                                ? 'bg-green-600/20 border-green-500 text-green-400'
                                : 'bg-red-600/20 border-red-500 text-red-400'
                                }`}>
                                {guess.properties.appearance.value || 'UNKNOWN'}
                            </td>
                        </tr>
                    ))}
                    {guesses.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-white/30 italic">
                                NO GUESSES YET...
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
