import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm"
                    />
                    {/* Modal Content */}
                    <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-zinc-900 h-[80vh] border border-white/10 w-full max-w-lg p-6 shadow-2xl pointer-events-auto relative flex flex-col"
                        >
                            {/* Scanline effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />

                            <div className="flex justify-between items-center mb-6 shrink-0">
                                {title && <h2 className="text-2xl font-bold tracking-tighter text-white uppercase">{title}</h2>}
                                <button
                                    onClick={onClose}
                                    className="text-white/50 hover:text-white transition-colors cursor-pointer uppercase text-sm font-bold"
                                >
                                    [CLOSE]
                                </button>
                            </div>

                            <div className="text-white/80 space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                {children}
                            </div>

                            <div className="mt-8 shrink-0">
                                <button
                                    onClick={onClose}
                                    className="w-full cursor-pointer bg-white text-black font-bold py-3 uppercase hover:bg-zinc-200 transition-colors"
                                >
                                    Understood
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;

