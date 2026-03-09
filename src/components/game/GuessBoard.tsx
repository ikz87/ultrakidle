import { enemies } from '../../lib/enemy_list';
import { EnemyIcon } from './EnemyIcon';

export interface GuessResult {
    guess_id?: number;
    enemy_name: string;
    correct: boolean;
    correct_id?: number;
    properties: {
        enemy_type: { value: string; result: 'correct' | 'incorrect' };
        weight_class: { value: string; result: 'correct' | 'incorrect' };
        health: {
            value: number;
            result: 'correct' | 'higher' | 'lower';
            color?: 'green' | 'yellow' | 'red';
        };
        level_count: {
            value: number;
            result: 'correct' | 'higher' | 'lower';
            color?: 'green' | 'yellow' | 'red';
        };
        appearance: {
            value: string;
            result: 'correct' | 'incorrect' | 'later' | 'earlier';
            color?: 'green' | 'yellow' | 'red';
        };
    };
}

interface GuessBoardProps {
    guesses: GuessResult[];
}

const getResultColorClass = (result: 'correct' | 'incorrect' | 'gray' | string, color?: 'green' | 'yellow' | 'red') => {
    if (result === 'gray') return 'bg-zinc-800/20 border-zinc-500/30 text-zinc-500/50';

    if (color) {
        if (color === 'green') return 'bg-green-600/20 border-green-500 text-green-500';
        if (color === 'yellow') return 'bg-yellow-600/20 border-yellow-500 text-yellow-500';
        return 'bg-red-600/20 border-red-500 text-red-500';
    }

    return result === 'correct'
        ? 'bg-green-600/20 border-green-500 text-green-500'
        : 'bg-red-600/20 border-red-500 text-red-500';
};

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
                        <th className="px-4 py-3">Total Levels</th>
                        <th className="px-4 py-3">Registered at</th>
                    </tr>
                </thead>
                <tbody>
                    {guesses.map((guess, idx) => {
                        const enemy = enemies.find(e => e.name === guess.enemy_name);
                        return (
                            <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                {/* Static Name Column */}
                                <td className={`px-4 py-4 font-bold max-w-[200px] border-l-4 border-black/50 ${getResultColorClass(guess.correct ? 'correct' : 'incorrect')}`}>
                                    <div className="flex items-center gap-3">
                                        {enemy && <EnemyIcon icons={enemy.icon} size={32} className="shrink-0" />}
                                        <span className="truncate">{guess.enemy_name}</span>
                                    </div>
                                </td>

                                {/* Enemy Type */}
                                <td className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(guess.properties.enemy_type.value ? guess.properties.enemy_type.result : 'gray')}`}>
                                    {guess.properties.enemy_type.value || '???'}
                                </td>

                                {/* Weight Class */}
                                <td className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(guess.properties.weight_class.value ? guess.properties.weight_class.result : 'gray')}`}>
                                    {guess.properties.weight_class.value || '???'}
                                </td>

                                {/* Health */}
                                <td className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(guess.properties.health.value !== undefined ? guess.properties.health.result : 'gray', guess.properties.health.value !== undefined ? guess.properties.health.color : undefined)}`}>
                                    <div className="flex items-center gap-2 h-full">
                                        {guess.properties.health.value !== undefined ? guess.properties.health.value : '???'}
                                        {guess.properties.health.value !== undefined && guess.properties.health.result === 'higher' && <span className="text-lg">▲</span>}
                                        {guess.properties.health.value !== undefined && guess.properties.health.result === 'lower' && <span className="text-lg">▼</span>}
                                    </div>
                                </td>

                                {/* Levels */}
                                <td className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(guess.properties.level_count.value !== undefined ? guess.properties.level_count.result : 'gray', guess.properties.level_count.value !== undefined ? guess.properties.level_count.color : undefined)}`}>
                                    <div className="flex items-center gap-2 h-full">
                                        {guess.properties.level_count.value !== undefined ? guess.properties.level_count.value : '???'}
                                        {guess.properties.level_count.value !== undefined && guess.properties.level_count.result === 'higher' && <span className="text-lg">▲</span>}
                                        {guess.properties.level_count.value !== undefined && guess.properties.level_count.result === 'lower' && <span className="text-lg">▼</span>}
                                    </div>
                                </td>

                                {/* Appearance */}
                                <td className={`px-4 py-4 font-bold border-l-4 border-black/50 ${getResultColorClass(guess.properties.appearance.value ? guess.properties.appearance.result : 'gray', guess.properties.appearance.value ? guess.properties.appearance.color : undefined)}`}>
                                    <div className="flex items-center gap-2 h-full">
                                        {guess.properties.appearance.value || '???'}
                                        {guess.properties.appearance.value && guess.properties.appearance.result === 'later' && <span className="text-lg">▲</span>}
                                        {guess.properties.appearance.value && guess.properties.appearance.result === 'earlier' && <span className="text-lg">▼</span>}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
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
