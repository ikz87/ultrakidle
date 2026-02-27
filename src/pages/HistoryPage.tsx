import { useState } from 'react';
import Button from '../components/ui/Button';
import { usePlayHistory } from '../hooks/usePlayHistory';
import { Typewriter } from '../components/Typewriter';
import { enemies } from '../lib/enemy_list';

const HistoryPage = () => {
    const { loading, history: rawHistory } = usePlayHistory();
    const [visibleCount, setVisibleCount] = useState(10);

    const history = rawHistory.filter(h => h.won || h.guesses >= 5);
    const totalMissions = history.length;
    const successfulMissions = history.filter(h => h.won).length;
    const successRate = totalMissions > 0 ? Math.round((successfulMissions / totalMissions) * 100) : 0;

    const visibleHistory = history.slice(0, visibleCount);

    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <div className="flex flex-col gap-6 w-full max-w-2xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest text-white">

                <div className="flex flex-col gap-2 pb-6 border-b border-white/10">
                    <span className="text-xl opacity-50">SERVICE_RECORD</span>

                    {loading ? (
                        <div className="text-2xl animate-pulse mt-2">ACCESSING ARCHIVES...</div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="flex flex-col">
                                <span className="opacity-50 text-sm">TOTAL DEPLOYMENTS</span>
                                <span className="text-3xl">{totalMissions}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="opacity-50 text-sm">SUCCESS RATE</span>
                                <span className="text-3xl text-green-500">{successRate}%</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-xl opacity-50 mb-4">MISSION_LOGS</span>

                    {!loading && history.length === 0 && (
                        <div className="opacity-50">
                            <Typewriter text="NO PREVIOUS DEPLOYMENTS FOUND." speed={0.02} />
                        </div>
                    )}

                    {!loading && history.length > 0 && (
                        <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {visibleHistory.map((entry) => (
                                <div
                                    key={entry.dailyId}
                                    className="flex justify-between items-center bg-white/5 p-4 border border-white/10"
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="opacity-50 text-sm">
                                            {new Date(entry.date).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-sm">
                                            {enemies.find(e => e.id === entry.targetEnemyId)?.name || 'UNKNOWN_TARGET'}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <span
                                            className={entry.won ? "text-green-500" : "text-red-500"}
                                        >
                                            {entry.won ? "TARGET IDENTIFIED" : "MISSION FAILED"}
                                        </span>
                                        <span className="opacity-50 text-sm">
                                            ATTEMPTS: {Math.min(entry.guesses, 5)}/5
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {history.length > visibleCount && (
                                <div className="w-full flex justify-center mt-2 pb-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setVisibleCount(prev => prev + 10)}
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
    );
};

export default HistoryPage;
