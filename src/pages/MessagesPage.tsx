import { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { useMessages } from '../context/MessagesContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessagesPage() {
    const { unreadMessages, readMessages, markAsRead, markAllAsRead } = useMessages();
    const [showArchive, setShowArchive] = useState(false);

    useEffect(() => {
        // Option A: Mark all as read when entering the page
        // markAllAsRead();
        // Option B: User marks them as read manually.
        // For now, let's stick to the behavior where we have a button or they are marked on exit/interaction.
        // Given the prompt "move the rendering to its own page", I'll keep the logic consistent.
    }, []);

    const handleMarkAllRead = () => {
        markAllAsRead();
    };

    return (
        <div className="flex flex-col w-full pt-4 h-full justify-start items-start">
            <SEO title="V-MAIL Terminal" description="Check your mission updates and logs in the V-MAIL Terminal." />
            <div className="flex flex-col gap-6 w-full max-w-4xl bg-black/40 border-2 border-white/10 p-4 uppercase font-bold tracking-widest">
                <div className="flex flex-wrap justify-between items-center border-b border-white/10 pb-4">
                    <h1 className="text-3xl text-white">V-MAIL_TERMINAL</h1>
                    {unreadMessages.length > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="hover:cursor-pointer text-xs bg-white/10 hover:bg-white/20 px-3 py-1 border border-white/10 transition-colors"
                        >
                            MARK_ALL_AS_READ
                        </button>
                    )}
                </div>

                <div className="space-y-6 normal-case font-normal tracking-normal">
                    {unreadMessages.length > 0 ? (
                        <div className="space-y-4">
                            {unreadMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="border border-white/20 bg-white/5 p-4 relative overflow-hidden group"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                    <div className="text-white/90">
                                        {msg.content}
                                    </div>
                                    {msg.date && (
                                        <div className="mt-2 text-[10px] text-white/30 uppercase">
                                            RECEIVED: {msg.date}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => markAsRead(msg.id)}
                                        className="mt-3 text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 underline decoration-dotted"
                                    >
                                        DISMISS
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center border border-dashed border-white/10 opacity-50">
                            <p className="text-sm font-mono tracking-widest uppercase">NO NEW V-MAIL FOUND</p>
                        </div>
                    )}

                    {readMessages.length > 0 && (
                        <div className="mt-8 border-t border-white/10 pt-6">
                            <button
                                onClick={() => setShowArchive(!showArchive)}
                                className="hover:cursor-pointer flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
                            >
                                <span>{showArchive ? '[-]' : '[+]'}</span>
                                <span>ARCHIVE ({readMessages.length})</span>
                            </button>

                            <AnimatePresence>
                                {showArchive && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid grid-cols-1 gap-4 mt-4 pb-2">
                                            {readMessages.map((msg) => (
                                                <div
                                                    key={msg.id}
                                                    className="border border-white/10 bg-black/20 p-4 opacity-70"
                                                >
                                                    <div className="text-white/80">
                                                        {msg.content}
                                                    </div>
                                                    {msg.date && (
                                                        <div className="mt-2 text-[10px] text-white/30 font-mono uppercase">
                                                            ARCHIVED: {msg.date}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
