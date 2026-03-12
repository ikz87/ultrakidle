import SEO from '../components/SEO';
import { levels } from '../lib/levels_list';
import { resolveExternalUrl } from '../lib/urls';
import { isRunningInDiscord, discordSdk } from '../lib/discord';

const LevelsPage = () => {
    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
        if (isRunningInDiscord() && discordSdk) {
            e.preventDefault();
            discordSdk.commands.openExternalLink({ url });
        }
    };

    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <SEO title="Levels Catalog" description="A complete list of levels in ULTRAKILL with links to their official wiki entries." />
            <div className="flex flex-col gap-6 w-full max-w-4xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest">
                <div className="flex justify-between flex-wrap items-center border-b border-white/10 pb-4">
                    <h1 className="text-3xl text-white">LEVELS_CATALOG</h1>
                    <span className="text-sm opacity-50 tracking-normal normal-case font-normal">
                        {levels.length} ENTRIES FOUND
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto max-h-[70vh] pr-4 custom-scrollbar">
                    {[...levels]
                        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                        .map((level) => (
                            <a
                                key={level.id}
                                href={resolveExternalUrl(level.wikiLink)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => handleLinkClick(e, resolveExternalUrl(level.wikiLink))}
                                className="group flex flex-col gap-2 transition-all duration-200 "
                            >
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm text-white group-hover:text-indigo-400 transition-colors truncate">
                                        {level.levelNumber}: {level.name}
                                    </span>
                                    <div className="h-[2px] w-full bg-white group-hover:bg-indigo-400 transition-colors" />
                                </div>
                                <div className="aspect-video w-full bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center relative">
                                    {level.thumbnail ? (
                                        <img
                                            src={resolveExternalUrl(level.thumbnail)}
                                            alt={level.name}
                                            className="w-full h-full object-cover filter brightness-75 group-hover:brightness-100 transition-all duration-200"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-[10px] opacity-20">
                                            NO_THUMBNAIL
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors" />
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

export default LevelsPage;
