import SEO from '../components/SEO';
import { enemies } from '../lib/enemy_list';
import { slugify } from '../lib/urls';
import { EnemyIcon } from '../components/game/EnemyIcon';
import { Link } from "react-router";

const EnemiesPage = () => {
    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <SEO title="Enemies Catalog" description="A complete list of enemies in ULTRAKILL with links to their official wiki entries." />
            <div className="flex flex-col gap-6 w-full max-w-4xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest">
                <div className="flex justify-between flex-wrap items-center border-b border-white/10 pb-4">
                    <h1 className="text-3xl text-white">ENEMIES_CATALOG</h1>
                    <span className="text-sm opacity-50 tracking-normal normal-case font-normal">
                        {enemies.length} ENTRIES FOUND
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                    {[...enemies]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((enemy) => (
                            <Link
                                to={`/enemies/${slugify(enemy.name)}`}
                                key={enemy.id}
                                className="group flex items-center gap-4 bg-white/5 border border-white/5 p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                            >
                                {enemy.icon && enemy.icon.length > 0 ? (
                                    <EnemyIcon
                                        enemyId={enemy.id}
                                        icons={enemy.icon}
                                        size={48}
                                        isSpawn={enemy.id === 69}
                                        className="shrink-0"
                                    />
                                ) : (
                                    <div className="w-12 h-12 flex-shrink-0 bg-white/5 flex items-center justify-center text-[10px] opacity-20">
                                        ?
                                    </div>
                                )}
                                <div className="text-left flex flex-col min-w-0">
                                    <span className="text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                                        {enemy.name}
                                    </span>
                                    <span className="text-[10px] opacity-30 font-normal normal-case tracking-normal">
                                        (CLICK TO VIEW ENTRY)
                                    </span>
                                </div>
                            </Link>
                        ))}
                </div>

                <div className="pt-4 border-t border-white/10 opacity-30 text-[10px] font-normal normal-case tracking-normal">
                    * ALL ASSETS AND INFORMATION PROVIDED BY THE OFFICIAL ULTRAKILL WIKI.
                </div>
            </div>
        </div>
    );
};

export default EnemiesPage;
