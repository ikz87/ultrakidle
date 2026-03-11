import { useState } from 'react';
import SEO from '../components/SEO';
import Button from '../components/ui/Button';
import { usePlayHistory } from '../hooks/usePlayHistory';
import { Typewriter } from '../components/Typewriter';

const HistoryPage = () => {
    const { loading, history } = usePlayHistory();
    const [visibleCount, setVisibleCount] = useState(10);

    const totalMissions = history.length;
    const successfulMissions = history.filter(h => h.is_win).length;
    const successRate = totalMissions > 0 ? Math.round((successfulMissions / totalMissions) * 100) : 0;

    const visibleHistory = history.slice(0, visibleCount);

    return (
        <div className="flex flex-col w-full h-full pt-4 shrink justify-start items-start overflow-hidden">
            <SEO title="Service Record" description="View your previous mission logs and success rate in ULTRAKIDLE." />
            <div className="flex flex-col w-full h-[600px] max-h-full max-w-2xl bg-black/40 border-2 border-white/10 p-4 uppercase font-bold tracking-widest text-white overflow-hidden">

                <div className="flex flex-col gap-2 pb-4 border-b border-white/10 flex-shrink-0">
                    <h1 className="text-xl opacity-50">SERVICE_RECORD</h1>

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

                <div className="flex flex-col gap-2 mt-4 flex-1 min-h-0">
                    <span className="text-xl opacity-50 mb-4 flex-shrink-0">MISSION_LOGS</span>

                    {!loading && history.length === 0 && (
                        <div className="opacity-50">
                            <Typewriter text="NO PREVIOUS DEPLOYMENTS FOUND." speed={0.02} />
                        </div>
                    )}

                    {!loading && history.length > 0 && (
                        <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0 h-72">
                            {visibleHistory.map((entry, index) => {
                                const choice = entry.daily_choice;
                                const enemyName = choice?.enemy?.name || 'UNKNOWN_TARGET';

                                return (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center bg-white/5 p-4 border border-white/10"
                                    >
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="opacity-50 text-sm">
                                                {choice?.chosen_at ? new Date(choice.chosen_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                }) : 'UNKNOWN_DATE'}
                                            </span>
                                            <span className="text-sm">
                                                {enemyName}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-end gap-1">
                                            <span
                                                className={entry.is_win ? "text-green-500" : "text-red-500"}
                                            >
                                                {entry.is_win ? "TARGET IDENTIFIED" : "MISSION FAILED"}
                                            </span>
                                            <span className="opacity-50 text-sm">
                                                ATTEMPTS: {entry.attempt_count}/5
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
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
