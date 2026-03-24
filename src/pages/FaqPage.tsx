import { useState } from 'react';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';

const faqData = [
    {
        question: "WHAT IS ULTRAKIDLE?",
        answer: "Essentially, Wordle + GeoGuessr for ULTRAKILL. It is accessible via this website or using the Discord activity, which can be installed from the home page. Installing ULTRAKIDLE also installs a bot that can be used for a deeper integration of the activity with your discord server."
    },
    {
        question: "IS THIS OFFICIAL?",
        answer: "No, ULTRAKIDLE is a fan-made project made by me, ikz87. All assets and information are provided by the official ULTRAKILL Wiki and are property of Arsi 'Hakita' Patala and New Blood Interactive."
    },
    {
        question: "HOW DOES MY RANK WORK?",
        answer: "For classic, you are ranked by your current streak using standard competition ranking: tied players share the same rank, and the next rank skips ahead accordingly (e.g., two players tied for 2nd means the next player is 4th, not 3rd). For InfernoGuessr, you are ranked based on your score for the day, using time as a tiebreaker"
    },
    {
        question: "I WANT AN ENDLESS MODE!",
        answer: "And you will get it, eventually. You can join the discord for more detailed updates on this."
    },
    {
        question: "HOW ABOUT AN ARCHIVE OF PAST MISSIONS?",
        answer: "Nope, endless mode will replace this functionality in its entirety."
    },
    {
        question: "THE [PROPERTY] ON [ENEMY NAME] IS WRONG! FIX IT!",
        answer: "The enemy data for classic mode here is a 1:1 mirror to that found in the official wiki, I'd bet the moderators there know more about the game than you and I do. If you still think something is definitely wrong, you should contact them, not me. Only contact me if there any mismatches between the information presented here and that found in the wiki."
    },
    {
        question: "AT WHAT TIME DO DAILY MISSIONS REFRESH?",
        answer: "The target enemy and levels change every day at 12:00 AM (midnight) UTC-6. A timer is available on the home page to track the next reset."
    },
    {
        question: "I FOUND A BUG, WHERE DO I REPORT IT?",
        answer: "You can report bugs or suggest features on our official Discord server. The link is available in the footer of the page."
    }
];

export default function FaqPage() {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const toggleAccordion = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <SEO title="FAQ_TERMINAL" description="Frequently Asked Questions about ULTRAKILLDLE." />
            <div className="flex flex-col gap-6 w-full max-w-4xl bg-black/40 border-2 border-white/10 p-8 uppercase font-bold tracking-widest">
                <div className="flex justify-between flex-wrap items-center border-b border-white/10 pb-4">
                    <h1 className="text-3xl text-white">FAQ_TERMINAL</h1>
                    <span className="text-sm opacity-50 tracking-normal normal-case font-normal">
                        {faqData.length} ENTRIES FOUND
                    </span>
                </div>

                <div className="space-y-4 normal-case font-normal tracking-normal overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                    {faqData.map((item, index) => (
                        <div key={index} className="border border-white/10 bg-black/20 overflow-hidden">
                            <button
                                onClick={() => toggleAccordion(index)}
                                className="w-full text-left p-4 hover:bg-white/5 transition-colors flex justify-between items-center group cursor-pointer"
                            >
                                <span className={`text-sm tracking-widest uppercase font-bold transition-colors ${expandedIndex === index ? 'text-indigo-400' : 'text-white/80 group-hover:text-white'}`}>
                                    {item.question}
                                </span>
                                <span className={`text-xs transition-transform duration-200 ${expandedIndex === index ? 'rotate-180 text-indigo-400' : 'text-white/30'}`}>
                                    ▼
                                </span>
                            </button>

                            <AnimatePresence>
                                {expandedIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                    >
                                        <div className="p-4 pt-0 border-t border-white/5 text-left text-white/70 leading-relaxed text-sm">
                                            {item.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-white/10 opacity-30 text-[10px] font-normal normal-case tracking-normal">
                    * SYSTEM DATA UPDATED PERIODICALLY. IF YOUR QUESTION IS NOT LISTED, CONTACT ADMINISTRATOR VIA DISCORD.
                </div>
            </div>
        </div>
    );
}
