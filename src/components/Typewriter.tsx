import { motion } from 'framer-motion';

interface TypewriterProps {
    text: string;
    delay?: number;
    onComplete?: () => void;
    className?: string;
    speed?: number;
}

export const Typewriter = ({ text, delay = 0, onComplete, className = '', speed = 0.03 }: TypewriterProps) => {
    const characters = text.split("");

    const container = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: speed,
                delayChildren: delay,
            },
        },
    };

    const child = {
        visible: {
            display: "inline",
            transition: {
                duration: 0,
            },
        },
        hidden: {
            display: "none",
        },
    };

    return (
        <motion.div
            style={{ overflow: "hidden", display: "flex", flexWrap: "wrap" }}
            variants={container}
            initial="hidden"
            animate="visible"
            className={className}
            onAnimationComplete={onComplete}
        >
            {characters.map((char, index) => (
                <motion.span variants={child} key={index}>
                    {char === " " ? "\u00A0" : char}
                </motion.span>
            ))}
        </motion.div>
    );
};
