import { useState } from 'react';
import Modal from './ui/Modal';
import { useMessages } from '../context/MessagesContext';
import { motion, AnimatePresence } from 'framer-motion';

interface MessagesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function MessagesModal({ isOpen, onClose }: MessagesModalProps) {
    const { unreadMessages, readMessages, markAsRead } = useMessages();
    const [showArchive, setShowArchive] = useState(false);

    // If we want to mark them as read when viewed, we could do it here
    // or provide a button. The prompt says "dismissed", so maybe we mark them
    // as read when the modal is closed or via a button.
    // "Older, already dismissed messages should all be accessible in a collapsible"

    const handleClose = () => {
        // Mark all currently unread messages as read when closing the modal
        unreadMessages.forEach(m => markAsRead(m.id));
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="V-MAIL TERMINAL"
            showFooterButton={true}
            footerButtonText="DISMISS"
        >
            <div className="space-y-6">
                {unreadMessages.length > 0 ? (
                    <div className="space-y-4">
                        {unreadMessages.map((msg) => (
                            <div
                                key={msg.id}
                                className="border border-white/20 bg-white/5 p-4 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                {msg.content}
                                {msg.date && (
                                    <div className="mt-2 text-[10px] text-white/30 font-mono uppercase">
                                        RECEIVED: {msg.date}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center border border-dashed border-white/10 opacity-50">
                        <p className="text-sm font-mono tracking-widest uppercase">NO NEW V-MAIL FOUND</p>
                    </div>
                )}

                {readMessages.length > 0 && (
                    <div className="mt-8 border-t border-white/10 pt-4">
                        <button
                            onClick={() => setShowArchive(!showArchive)}
                            className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
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
                                    <div className="space-y-4 mt-4 pb-2">
                                        {readMessages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className="border border-white/10 bg-black/20 p-4 opacity-70"
                                            >
                                                {msg.content}
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
        </Modal>
    );
}
