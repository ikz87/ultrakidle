import { useState, type ReactNode, cloneElement, isValidElement } from "react";
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    useHover,
    useFocus,
    useDismiss,
    useRole,
    useInteractions,
    useClick,
    FloatingPortal,
} from "@floating-ui/react";

import type { Placement } from "@floating-ui/react";
import { AnimatePresence, motion } from "framer-motion";

interface TooltipProps {
    content: ReactNode;
    children: ReactNode;
    placement?: Placement;
    className?: string;
    wrapperClassName?: string;
}

const tooltipOuterClip =
    "[clip-path:polygon(6px_0,calc(100%-6px)_0,100%_6px,100%_calc(100%-6px),calc(100%-6px)_100%,6px_100%,0_calc(100%-6px),0_6px)]";
const tooltipInnerClip =
    "[clip-path:polygon(4px_0,calc(100%-4px)_0,100%_4px,100%_calc(100%-4px),calc(100%-4px)_100%,4px_100%,0_calc(100%-4px),0_4px)]";

export default function Tooltip({
    content,
    children,
    placement = "top",
    className = "",
    wrapperClassName = "w-max",
}: TooltipProps) {
    const [isOpen, setIsOpen] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement,
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(8),
            flip({
                fallbackAxisSideDirection: "start",
            }),
            shift({ padding: 8 }),
        ],
    });

    const hover = useHover(context, { move: false });
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "tooltip" });
    const click = useClick(context);

    // Apply interactions
    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        focus,
        dismiss,
        role,
        click, // Adding click gives robust tap behavior on mobile
    ]);

    // Clone element so we don't introduce a wrapper div which can mess with hover hitboxes
    const referenceElement = isValidElement(children) ? (
        cloneElement(children as React.ReactElement<any>, {
            ref: refs.setReference,
            ...getReferenceProps({
                ...(children.props as any),
            }),
        })
    ) : (
        <span ref={refs.setReference} {...getReferenceProps()} className={wrapperClassName}>
            {children}
        </span>
    );

    return (
        <>
            {referenceElement}
            <FloatingPortal>
                <AnimatePresence>
                    {isOpen && (
                        <div
                            ref={refs.setFloating}
                            style={floatingStyles}
                            className="z-[150] pointer-events-none"
                        >
                            <motion.div
                                {...getFloatingProps()}
                                initial={{ opacity: 0, scale: 0.95, y: placement.startsWith("top") ? 5 : placement.startsWith("bottom") ? -5 : 0 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: placement.startsWith("top") ? 5 : placement.startsWith("bottom") ? -5 : 0 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className={`p-[2px] bg-white pointer-events-auto ${tooltipOuterClip} ${className}`}
                            >
                                <div
                                    className={`bg-black text-white px-3 py-1.5 text-sm font-bold uppercase tracking-tighter relative overflow-hidden ${tooltipInnerClip}`}
                                >
                                    <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
                                    <div className="relative z-20 max-w-[60vw]">
                                        {content}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
}
