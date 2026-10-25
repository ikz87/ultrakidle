import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import AlertDialog from '../ui/AlertDialog';
import { enemies } from '../../lib/enemy_list';
import { EnemyIcon } from './EnemyIcon';
import type { GameEvent } from '../../lib/events';

interface EnemySearchProps {
  onGuess: (enemyId: number) => void;
  disabled?: boolean;
  excludeIds?: number[];
  event?: GameEvent;
}

export const EnemySearch = ({
  onGuess,
  disabled = false,
  excludeIds = [],
  event,
}: EnemySearchProps) => {
    const { settings } = useSettings();
    const location = useLocation();

    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [isRandom, setIsRandom] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const isClassic = location.pathname.includes('/play/classic');
    const isInferno = location.pathname.includes('/play/infernoguessr');
    const isCybergrind = location.pathname.includes('/cybergrind');

    const needsConfirm = (isClassic && settings.confirmDialogs.classic) ||
        (isInferno && settings.confirmDialogs.infernoguessr) ||
        (isCybergrind && settings.confirmDialogs.cybergrind);

    const sortedEnemies = [...enemies].sort((a, b) => a.name.localeCompare(b.name));

    const filteredEnemies = sortedEnemies.filter(enemy =>
        enemy.name.toLowerCase().includes(query.toLowerCase()) &&
        !excludeIds.includes(enemy.id)
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (enemyId: number, fromRandom = false) => {
        setIsOpen(false);
        if (needsConfirm) {
            setConfirmId(enemyId);
            setIsRandom(fromRandom);
        } else {
            setQuery('');
            onGuess(enemyId);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && filteredEnemies.length === 1) {
            handleSelect(filteredEnemies[0].id);
        }
    };

    const handleRandom = () => {
        if (isClassic && !settings.allowRandomGuess.classic) {
            // Send 0 to let the server pick a random target except the daily one
            handleSelect(0, true);
        } else if (isCybergrind && !settings.allowRandomGuess.cybergrind) {
            // Send 0 for Cybergrind as well
            handleSelect(0, true);
        } else {
            const availableEnemies = enemies.filter(enemy => !excludeIds.includes(enemy.id));
            if (availableEnemies.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableEnemies.length);
                handleSelect(availableEnemies[randomIndex].id, true);
            }
        }
    };

    const targetEnemyForDialog = confirmId !== null ? enemies.find(e => e.id === confirmId) : null;

    return (
        <>
            <div ref={wrapperRef} className="relative lg:text-xl text-base md:max-w-[1000px] w-full z-50">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        placeholder="ENTER ENEMY DESIGNATION..."
                        className="md:text-base text-sm w-full bg-black border-2 border-white/20 p-3 text-white uppercase font-bold focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50"
                    />
                    <span className="md:text-base text-sm">
                        OR
                    </span>
                    <button
                        onClick={handleRandom}
                        disabled={disabled}
                        title="RANDOM GUESS"
                        className="hover:cursor-pointer bg-black border-2 border-white/20 p-3 text-white hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[3.5rem]"
                    >
                        <img className="invert" src={`${import.meta.env.BASE_URL}images/random-icon.svg`} />
                    </button>
                </div>

                {isOpen && (
                    <ul className="absolute top-full left-0 w-full mt-1 bg-black border-2 border-white/20 max-h-60 overflow-y-auto">
                        {filteredEnemies.length > 0 ? (
                            filteredEnemies.map(enemy => (
                                <li
                                  key={enemy.id}
                                  onClick={() => handleSelect(enemy.id)}
                                  className="p-3 hover:bg-white/10 cursor-pointer uppercase text-left border-b border-white/10 last:border-b-0 flex items-center gap-3"
                                >
                                  <EnemyIcon
                                    enemyId={enemy.id}
                                    icons={enemy.icon}
                                    size={24}
                                    isSpawn={(enemy as any).isSpawn}
                                    event={event}
                                  />
                                  <span>{enemy.name}</span>
                                </li>
                            ))
                        ) : (
                            <li className="p-3 text-white/50 text-left italic">NO MATCHING DESIGNATION...</li>
                        )}
                    </ul>
                )}
            </div>

            <AlertDialog
                isOpen={confirmId !== null}
                onClose={() => {
                    setConfirmId(null);
                    setIsRandom(false);
                }}
                onConfirm={() => {
                    if (confirmId !== null) {
                        setQuery('');
                        onGuess(confirmId);
                        setConfirmId(null);
                        setIsRandom(false);
                    }
                }}
                title="CONFIRM GUESS"
                description={
                    isRandom ? (
                        <span>Are you sure you want to guess a <span className="text-white font-bold">RANDOM ENEMY</span>?</span>
                    ) : targetEnemyForDialog ? (
                        <span>
                            Are you sure you want to guess{" "}
                            <span className="text-white font-bold">{targetEnemyForDialog.name}</span>?
                        </span>
                    ) : ""
                }
                confirmText="SUBMIT"
                cancelText="CANCEL"
            />
        </>
    );
};
