import { useState, useEffect, useRef } from 'react';

interface HintData {
    correct: boolean;
    properties: {
        enemy_type: { result: string };
        weight_class: { result: string };
        health: { result: string; color?: string };
        level_count: { result: string; color?: string };
        appearance: { result: string; color?: string };
    };
}

interface LogGridProps {
    hintData: (string[] | HintData)[]; // Array of guess results
    size?: 'sm' | 'md';
    typewriter?: boolean;
}

const COLS = 6;
const ROWS = 5;
const TYPEWRITER_INTERVAL_MS = 80;

const colorClasses: Record<string, string> = {
    green: 'bg-green-500/20 border-green-500',
    yellow: 'bg-yellow-500/20 border-yellow-500',
    red: 'bg-red-500/20 border-red-500',
    gray: 'bg-zinc-800/20 border-zinc-500/30',
};

export const LogGrid = ({ hintData, size = 'md', typewriter = false }: LogGridProps) => {
    const boxSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

    // Process hints into raw statuses if they are full HintData objects
    const grid = hintData.map(hint => {
        // If it's already a status array, use it
        if (Array.isArray(hint)) return hint;

        // Otherwise, extract from properties
        const h = hint as HintData;
        if (!h.properties) return ['red', 'red', 'red', 'red', 'red', 'red'];

        const getStatus = (result: string, color?: string) => {
            if (color === 'green' || result === 'correct') return 'green';
            if (color === 'yellow') return 'yellow';
            return 'red';
        };

        return [
            getStatus(h.correct ? 'correct' : 'incorrect'), // Name
            getStatus(h.properties.enemy_type.result), // Type
            getStatus(h.properties.weight_class.result), // Weight
            getStatus(h.properties.health.result, h.properties.health.color), // Health
            getStatus(h.properties.level_count.result, h.properties.level_count.color), // Level Count
            getStatus(h.properties.appearance.result, h.properties.appearance.color) // Appearance
        ];
    });

    // Count total filled squares for typewriter animation
    const totalFilledSquares = grid.length * COLS;

    const prevTotalRef = useRef(typewriter ? 0 : totalFilledSquares);
    const [revealedCount, setRevealedCount] = useState(typewriter ? 0 : totalFilledSquares);

    useEffect(() => {
        if (!typewriter) return;
        const prevTotal = prevTotalRef.current;

        // No new squares added — nothing to animate
        if (totalFilledSquares <= prevTotal) {
            prevTotalRef.current = totalFilledSquares;
            return;
        }

        // Start revealing from where the previous data ended
        setRevealedCount(prevTotal);

        const interval = setInterval(() => {
            setRevealedCount(prev => {
                if (prev >= totalFilledSquares) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, TYPEWRITER_INTERVAL_MS);

        prevTotalRef.current = totalFilledSquares;
        return () => clearInterval(interval);
    }, [typewriter, totalFilledSquares]);

    return (
        <div className="flex flex-col gap-0.5">
            {Array.from({ length: ROWS }).map((_, rowIndex) => {
                const row = grid[rowIndex];
                return (
                    <div key={rowIndex} className="flex gap-0.5">
                        {Array.from({ length: COLS }).map((_, colIndex) => {
                            const actualStatus = row ? row[colIndex] : 'gray';
                            const flatIndex = rowIndex * COLS + colIndex;
                            // In typewriter mode, show gray until this square is revealed
                            const status = (typewriter && flatIndex >= revealedCount) ? 'gray' : actualStatus;
                            return (
                                <div
                                    key={colIndex}
                                    className={`${boxSize} border transition-colors duration-200 ${colorClasses[status] || colorClasses.gray}`}
                                />
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
