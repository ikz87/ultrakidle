import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SEO from "../components/SEO";
import ModeTabs from "../components/ui/ModeTabs";
import type { GameMode } from "../components/ui/ModeTabs";
import Button from "../components/ui/Button";
import { Typewriter } from "../components/Typewriter";

interface PlayLayoutProps {
    children?: ReactNode;
    activeMode: GameMode;
    loading?: boolean;
    seoTitle: string;
    seoDescription: string;
    dailyChanged?: boolean;
    onResetDaily?: () => void;
    showDeathBackground?: boolean;
}

const PlayLayout = ({
    children,
    activeMode,
    loading = false,
    seoTitle,
    seoDescription,
    dailyChanged = false,
    onResetDaily,
    showDeathBackground = false,
}: PlayLayoutProps) => {
    const navigate = useNavigate();

    const tabs: { id: GameMode; label: string }[] = [
        { id: "classic", label: "CLASSIC" },
        { id: "infernoguessr", label: "INFERNOGUESSR" },
    ];

    if (loading) {
        return (
            <>
                <div className="h-dvh w-dvw bg-black/40 fixed top-0 left-0 overflow-visible"></div>
                <div className="flex flex-col w-full h-full items-start justify-start ">
                    <div className="z-40 flex flex-col w-full pt-4 justify-start items-start">
                        <ModeTabs
                            activeMode={activeMode}
                            onModeChange={(mode) => navigate(`/play/${mode}`)}
                            tabs={tabs}
                        />
                        <p className="text-xl opacity-50 animate-pulse mt-4">
                            INITIALIZING BOARD...
                        </p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="z-40 flex flex-col w-full pt-4 min-h-full justify-start items-start">
                <SEO title={seoTitle} description={seoDescription} />


                <ModeTabs
                    activeMode={activeMode}
                    onModeChange={(mode) => navigate(`/play/${mode}`)}
                    tabs={tabs}
                />

                {children}
            </div>

            {showDeathBackground ? (
                <div className="fixed left-0 top-0 -z-10 flex h-dvh w-dvw items-center justify-center overflow-visible bg-black">
                    <div className="h-1/3 w-1/3 overflow-visible">
                        <img
                            className="mx-auto h-full w-full object-cover opacity-10 overflow-visible"
                            src={`${import.meta.env.BASE_URL}images/ultrakill-death.gif`}
                            alt="Death"
                        />
                    </div>
                </div>
            ) : (
                <div className="fixed left-0 top-0 -z-10 h-dvh w-dvw overflow-visible bg-black/40"></div>
            )}

            {dailyChanged && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex w-full max-w-md flex-col items-center gap-6 border border-red-500/30 bg-zinc-900 p-8"
                    >
                        <Typewriter
                            text="TIME IS UP"
                            className="text-3xl font-bold tracking-widest text-red-500"
                            speed={0.05}
                        />
                        <Typewriter
                            text="A NEW DAILY CHALLENGE IS AVAILABLE"
                            className="text-center text-white/70"
                            speed={0.03}
                            delay={0.5}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5 }}
                        >
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={onResetDaily}
                            >
                                START NEW MISSION
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default PlayLayout;
