const CreditsPage = () => {
    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <div className="flex flex-col gap-8 w-full max-w-2xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest">
                <div className="flex flex-col gap-2">
                    <span className="text-xl opacity-50">DEVELOPED_BY</span>
                    <span className="text-4xl text-white">ikz87</span>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-xl opacity-50">DATA_SOURCE</span>
                    <a
                        href="https://ultrakill.wiki.gg/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-3xl text-red-500 hover:text-red-400 transition-colors underline"
                    >
                        ULTRAwiki
                    </a>
                    <span className="text-sm opacity-30 mt-1 italic font-normal normal-case">
                        ALL RIGHTS TO ULTRAKILL BELONG TO ARSI "HAKITA" PATALA AND NEW BLOOD INTERACTIVE.
                    </span>
                </div>

            </div>
        </div>
    );
};

export default CreditsPage;

