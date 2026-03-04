import { resolveExternalUrl } from '../../lib/urls';

interface EnemyIconProps {
    icons: string[];
    size?: number | string;
    className?: string;
}

export const EnemyIcon = ({ icons, size = 40, className = '' }: EnemyIconProps) => {
    if (!icons || icons.length === 0) return null;

    if (icons.length === 1) {
        return (
            <img
                src={resolveExternalUrl(icons[0])}
                alt="Enemy Icon"
                style={{ width: size, height: size }}
                className={`object-contain ${className}`}
            />
        );
    }

    // Dual icon support with diagonal split
    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{ width: size, height: size }}
        >
            <img
                src={resolveExternalUrl(icons[0])}
                alt="Enemy Icon 1"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
            />
            <img
                src={resolveExternalUrl(icons[1])}
                alt="Enemy Icon 2"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
            />
        </div>
    );
};
