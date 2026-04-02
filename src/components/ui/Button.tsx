import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    px?: string;
    py?: string;
    className?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', px, py, children, ...props }, ref) => {
        // Shared clip-paths for different sizes
        const polygons = {
            sm: '[clip-path:polygon(2px_0,calc(100%-2px)_0,100%_2px,100%_calc(100%-2px),calc(100%-2px)_100%,2px_100%,0_calc(100%-2px),0_2px)]',
            md: '[clip-path:polygon(4px_0,calc(100%-4px)_0,100%_4px,100%_calc(100%-4px),calc(100%-4px)_100%,4px_100%,0_calc(100%-4px),0_4px)]',
            lg: '[clip-path:polygon(6px_0,calc(100%-6px)_0,100%_6px,100%_calc(100%-6px),calc(100%-6px)_100%,6px_100%,0_calc(100%-6px),0_6px)]',
            xl: '[clip-path:polygon(10px_0,calc(100%-10px)_0,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0_calc(100%-10px),0_10px)]',
        };

        const poly = polygons[size];

        // Button variants handling: Outer background is the border color, Inner is the fill
        const variants = {
            primary: {
                outer: 'bg-white',
                inner: 'bg-white text-black',
            },
            outline: {
                outer: 'bg-white',
                inner: 'bg-black text-white',
            },
            ghost: {
                outer: 'bg-transparent',
                inner: 'bg-transparent text-white group-hover:bg-white/10',
            },
            danger: {
                outer: 'bg-white',
                inner: 'bg-black text-[#FF8000]',
            },
        };

        const currentVariant = variants[variant as keyof typeof variants] || variants.primary;

        const sizes = {
            sm: 'text-xs',
            md: 'text-sm',
            lg: 'text-base',
            xl: 'text-xl md:text-2xl lg:text-3xl',
        };

        const padding = {
            sm: 'p-[1px]', // 1px border
            md: 'p-[2px]', // 2px border
            lg: 'p-[2px]',
            xl: 'p-[2px] md:p-[3px]', // 3px border for giant buttons
        };

        const innerPadding = {
            sm: 'px-3 py-1',
            md: 'px-6 py-2',
            lg: 'px-8 py-3',
            xl: 'px-8 py-3 md:px-10 md:py-4 lg:px-14 lg:py-5',
        };

        const currentInnerPadding = `${px || innerPadding[size].split(' ')[0]} ${py || innerPadding[size].split(' ')[1]}`;

        // Motion variants logic
        const getMotionProps = () => {
            if (variant === 'primary') {
                return {
                    whileHover: {},
                    whileTap: {
                        backgroundColor: '#ef4444',
                        transition: { duration: 0 },
                    },
                };
            }
            if (variant === 'outline') {
                return {
                    whileHover: {
                        opacity: 0.5,
                        transition: { duration: 0.1 },
                    },
                    whileTap: {
                        backgroundColor: '#ef4444',
                        transition: { duration: 0 },
                    },
                };
            }
            if (variant === 'danger') {
                return {
                    whileHover: {
                        opacity: 0.5,
                        transition: { duration: 0.1 },
                    },
                    whileTap: {
                        backgroundColor: '#ef4444',
                        transition: { duration: 0 },
                    },
                };
            }
            return {};
        };

        const getInnerMotionProps = () => {
            if (variant === 'primary') {
                return {
                    whileTap: {
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        transition: { duration: 0 },
                    },
                };
            }
            return {};
        };

        return (
            <motion.button
                ref={ref}
                className={`group relative inline-flex items-center justify-center font-bold disabled:opacity-50 disabled:pointer-events-none uppercase tracking-tighter cursor-pointer ${poly} ${currentVariant.outer} ${padding[size]} ${className}`}
                {...getMotionProps()}
                {...props as HTMLMotionProps<"button">}
            >
                <motion.div
                    className={`w-full h-full flex items-center justify-center ${poly} ${currentVariant.inner} ${sizes[size]} ${currentInnerPadding}`}
                    {...getInnerMotionProps()}
                >
                    {children}
                </motion.div>
            </motion.button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
