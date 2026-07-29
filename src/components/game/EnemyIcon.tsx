import { resolveExternalUrl } from '../../lib/urls';

interface EnemyIconProps {
  icons: string[];
  size?: number | string;
  isSpawn?: boolean;
  className?: string;
  event?: string;
}

export const EnemyIcon = ({
  event,
  icons,
  size = 40,
  isSpawn = false,
  className = '',
}: EnemyIconProps) => {
  if (!icons || icons.length === 0) return null;

  const actualSize = isSpawn
    ? typeof size === 'number'
      ? size / 2
      : `calc(${size} / 2)`
    : size;

  const renderIcons = () => {
    if (icons.length === 1) {
      return (
        <div
          className="flex items-center justify-center bg-white/10 rounded-sm"
          style={{ width: size, height: size }}
        >
          <img
            src={resolveExternalUrl(icons[0])}
            alt="Enemy Icon"
            style={{ width: actualSize, height: actualSize }}
            className="object-contain"
          />
        </div>
      );
    }

    return (
      <div
        className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-sm"
        style={{ scale: isSpawn ? '0.5' : '1' }}
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

  return (
    <div
      className={`relative overflow-visible ${className}`}
      style={{ width: size, height: size }}
    >
      {renderIcons()}
      {event === 'PARTY' && (
        <img
          src="/images/party-hat.png"
          alt="Party Hat"
          className="absolute -top-3.5 -right-[3px] rotate-[25deg] z-10"
          style={{
            width: typeof size === 'number' ? size * 0.9 : `calc(${size} * 0.4)`,
            height: 'auto',
          }}
        />
      )}
    </div>
  );
};
