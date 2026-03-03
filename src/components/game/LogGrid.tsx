interface LogGridProps {
    hintData: any[]; // Array of guess results
    size?: 'sm' | 'md';
}

export const LogGrid = ({ hintData, size = 'md' }: LogGridProps) => {
    const boxSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

    // Process hints into raw statuses if they are full HintData objects
    const grid = hintData.map(hint => {
        // If it's already a status array, use it
        if (Array.isArray(hint)) return hint;

        // Otherwise, extract from properties
        if (!hint.properties) return ['red', 'red', 'red', 'red', 'red', 'red'];

        const getStatus = (result: string, color?: string) => {
            if (color === 'green' || result === 'correct') return 'green';
            if (color === 'yellow') return 'yellow';
            return 'red';
        };

        return [
            getStatus(hint.correct ? 'correct' : 'incorrect'), // Name
            getStatus(hint.properties.enemy_type.result), // Type
            getStatus(hint.properties.weight_class.result), // Weight
            getStatus(hint.properties.health.result, hint.properties.health.color), // Health
            getStatus(hint.properties.is_boss.result), // Boss
            getStatus(hint.properties.appearance.result, hint.properties.appearance.color) // Appearance
        ];
    });

    return (
        <div className="flex flex-col gap-0.5">
            {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-0.5">
                    {row.map((status, colIndex) => (
                        <div
                            key={colIndex}
                            className={`${boxSize} border ${status === 'green' ? 'bg-green-500/20 border-green-500' :
                                status === 'yellow' ? 'bg-yellow-500/20 border-yellow-500' :
                                    'bg-red-500/20 border-red-500'
                                }`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};
