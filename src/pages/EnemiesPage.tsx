import SEO from '../components/SEO';
import { enemies } from '../lib/enemy_list';
import { resolveExternalUrl } from '../lib/urls';
import { isRunningInDiscord, discordSdk } from '../lib/discord';

const EnemiesPage = () => {
    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
        if (isRunningInDiscord() && discordSdk) {
            e.preventDefault();
            discordSdk.commands.openExternalLink({ url });
        }
    };

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
                            <a
                                key={enemy.id}
                                href={resolveExternalUrl(enemy.wikiLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => handleLinkClick(e, resolveExternalUrl(enemy.wikiLink))}
                                className="group flex items-center gap-4 bg-white/5 border border-white/5 p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                            >
                                <div className="w-12 h-12 flex-shrink-0 bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center p-1">
                                    {enemy.icon && enemy.icon.length > 0 ? (
                                        <img
                                            src={resolveExternalUrl(enemy.icon[0])}
                                            alt={enemy.name}
                                            className="w-full h-full object-contain filter transition-transform duration-200"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-[10px] opacity-20">
                                            ?
                                        </div>
                                    )}
                                </div>
                                <div className="text-left flex flex-col min-w-0">
                                    <span className="text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                                        {enemy.name}
                                    </span>
                                    <span className="text-[10px] opacity-30 font-normal normal-case tracking-normal">
                                        VIEW WIKI ENTRY
                                    </span>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                </div>
                            </a>
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
