import { motion, AnimatePresence } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isConfirming?: boolean;
}

const outerClip =
  "[clip-path:polygon(16px_0,calc(100%-16px)_0,100%_16px,100%_calc(100%-16px),calc(100%-16px)_100%,16px_100%,0_calc(100%-16px),0_16px)]";
const innerClip =
  "[clip-path:polygon(12px_0,calc(100%-12px)_0,100%_12px,100%_calc(100%-12px),calc(100%-12px)_100%,12px_100%,0_calc(100%-12px),0_12px)]";

const AlertDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isConfirming = false,
}: AlertDialogProps) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-[100] backdrop-blur-sm cursor-pointer"
          />
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`w-full max-w-md max-h-[80vh] p-[8px] bg-white ${outerClip} pointer-events-auto flex flex-col`}
            >
              <div
                className={`bg-black w-full p-6 shadow-2xl relative flex flex-col min-h-0 flex-1 overflow-hidden ${innerClip}`}
              >
                {/* Scanline effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />

                <div className="flex flex-col gap-2 mb-6 shrink-0">
                  <h2 className="text-xl font-bold tracking-tighter text-white uppercase">
                    {title}
                  </h2>
                  <div className="text-white/60 text-sm uppercase tracking-wider">
                    {description}
                  </div>
                </div>

                <div className="flex gap-4 justify-end mt-4">
                  <Button
                    onClick={onClose}
                    disabled={isConfirming}
                    variant="outline"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    variant={variant}
                    onClick={onConfirm}
                    disabled={isConfirming}
                  >
                    {isConfirming ? "PROCESSING..." : confirmText}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AlertDialog;


