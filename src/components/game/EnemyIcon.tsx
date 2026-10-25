import { useSeasonalEvent } from "../../hooks/useSeasonalEvent";
import { useSettings } from "../../context/SettingsContext";
import { useImageSize } from "../../hooks/useImageSize";
import { resolveExternalUrl } from "../../lib/urls";
import type { GameEvent } from "../../lib/events";
import {
  getBoundingBoxSet,
  HALLOWEEN_SET,
  type BoundingBox,
  type BoundingBoxGroup,
} from "../../lib/bounding_boxes";
import { EventOverlay } from "./EventOverlay";

interface EnemyIconProps {
  icons: string[];
  enemyId?: number;
  size?: number | string;
  isSpawn?: boolean;
  className?: string;
  event?: GameEvent;
}

const PUMPKIN_MAIN_SRC = "/images/pumpkin-main.png";
const PUMPKIN_STEM_SRC = "/images/pumpkin-stem.png";
const PUMPKIN_NATURAL_WIDTH = 306;
const PUMPKIN_NATURAL_HEIGHT = 255;
const STEM_ASPECT_RATIO = 90 / 67;
const STEM_WIDTH_RATIO = 0.24;
const TRIANGLE_CLIPS = [
  "polygon(-500% -500%, 600% -500%, -500% 600%)",
  "polygon(600% -500%, 600% 600%, -500% 600%)",
];

const containRect = (
  imageSize: { width: number; height: number },
  frameSize: number,
) => {
  const scale = Math.min(
    frameSize / imageSize.width,
    frameSize / imageSize.height,
  );
  const width = imageSize.width * scale;
  const height = imageSize.height * scale;

  return {
    x: (frameSize - width) / 2,
    y: (frameSize - height) / 2,
    width,
    height,
  };
};

const getMaskPolygon = (
  mask: BoundingBox,
  width: number,
  height: number,
) => {
  const centerX = mask.x + mask.width / 2;
  const centerY = mask.y + mask.height / 2;
  const radians = (mask.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    [mask.x, mask.y],
    [mask.x + mask.width, mask.y],
    [mask.x + mask.width, mask.y + mask.height],
    [mask.x, mask.y + mask.height],
  ].map(([x, y]) => {
    const deltaX = x - centerX;
    const deltaY = y - centerY;

    return {
      x: (centerX + deltaX * cos - deltaY * sin) * width,
      y: (centerY + deltaX * sin + deltaY * cos) * height,
    };
  });

  return `polygon(${corners
    .map((point) => `${point.x}px ${point.y}px`)
    .join(", ")})`;
};

const HalloweenImageLayer = ({
  src,
  boxes,
  frameSize,
  clipPath,
  isSpawn,
}: {
  src: string;
  boxes: BoundingBoxGroup[];
  frameSize: number;
  clipPath?: string;
  isSpawn: boolean;
}) => {
  const imageSrc = resolveExternalUrl(src);
  const imageSize = useImageSize(imageSrc);

  if (!imageSize || boxes.length === 0) return null;

  const rect = containRect(imageSize, frameSize);

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ clipPath, scale: isSpawn ? "0.5" : "1" }}
    >
      {boxes.map((box, boxIndex) => {
        const boxWidth = box.width * rect.width;
        const boxHeight = box.height * rect.height;
        const coverScale = Math.max(
          boxWidth / PUMPKIN_NATURAL_WIDTH,
          boxHeight / PUMPKIN_NATURAL_HEIGHT,
        );
        const pumpkinWidth = PUMPKIN_NATURAL_WIDTH * coverScale;
        const pumpkinHeight = PUMPKIN_NATURAL_HEIGHT * coverScale;
        const pumpkinLeft = (boxWidth - pumpkinWidth) / 2;
        const pumpkinTop = (boxHeight - pumpkinHeight) / 2;
        const stemWidth = pumpkinWidth * STEM_WIDTH_RATIO;
        const stemHeight = stemWidth * STEM_ASPECT_RATIO;

        return (
          <div
            key={`pumpkin-${boxIndex}`}
            className="absolute"
            style={{
              left: rect.x + box.x * rect.width,
              top: rect.y + box.y * rect.height,
              width: boxWidth,
              height: boxHeight,
              transform: `rotate(${box.rotation}deg)`,
              transformOrigin: "center",
            }}
          >
            <img
              src={PUMPKIN_MAIN_SRC}
              alt=""
              draggable={false}
              className="absolute max-w-none"
              style={{
                left: pumpkinLeft,
                top: pumpkinTop,
                width: pumpkinWidth,
                height: pumpkinHeight,
              }}
            />
            <img
              src={PUMPKIN_STEM_SRC}
              alt=""
              draggable={false}
              className="absolute max-w-none"
              style={{
                left: boxWidth / 2,
                top: pumpkinTop - stemHeight * 0.88,
                width: stemWidth,
                height: stemHeight,
                transform: "translateX(-50%)",
              }}
            />
          </div>
        );
      })}

      {boxes.flatMap((box, boxIndex) =>
        box.overlays.map((mask, maskIndex) => (
          <div
            key={`mask-${boxIndex}-${maskIndex}`}
            className="absolute"
            style={{
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              clipPath: getMaskPolygon(mask, rect.width, rect.height),
            }}
          >
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: "fill" }}
            />
          </div>
        )),
      )}
    </div>
  );
};

export const EnemyIcon = ({
  event,
  enemyId,
  icons,
  size = 40,
  isSpawn = false,
  className = '',
}: EnemyIconProps) => {
  const seasonalEvent = useSeasonalEvent();
  const { settings } = useSettings();
  const activeEvent =
    event ??
    (settings.showSeasonalEnemyIcons ? seasonalEvent : null);

  if (!icons || icons.length === 0) return null;

  const actualSize = isSpawn
    ? typeof size === 'number'
      ? size / 2
      : `calc(${size} / 2)`
    : size;

  const halloweenBoxes =
    activeEvent === "HALLOWEEN" &&
    enemyId != null &&
    typeof size === "number"
      ? getBoundingBoxSet(enemyId, HALLOWEEN_SET, icons.length)
      : null;
  const hasHalloweenBoxes = halloweenBoxes?.some(
    (imageBoxes) => imageBoxes.length > 0,
  );

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
          style={{ clipPath: TRIANGLE_CLIPS[0] }}
        />
        <img
          src={resolveExternalUrl(icons[1])}
          alt="Enemy Icon 2"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: TRIANGLE_CLIPS[1] }}
        />
      </div>
    );
  };

  return (
    <div
      className={`relative overflow-visible ${className}`}
      style={{ width: size, height: size }}
      data-event={activeEvent ?? undefined}
    >
      {renderIcons()}

      {halloweenBoxes &&
        hasHalloweenBoxes &&
        typeof size === "number" &&
        icons.map((src, index) => {
          const boxes = halloweenBoxes[index] ?? [];
          if (boxes.length === 0) return null;

          return (
            <HalloweenImageLayer
              key={`${src}-${index}`}
              src={src}
              boxes={boxes}
              frameSize={size}
              clipPath={icons.length > 1 ? TRIANGLE_CLIPS[index] : undefined}
              isSpawn={isSpawn}
            />
          );
        })}

      <EventOverlay event={activeEvent} size={size} />
    </div>
  );
};
