import type { GameEvent } from "../../lib/events";

interface EventOverlayConfig {
  src: string;
  className: string;
  widthRatio: number;
}

const EVENT_OVERLAYS: Partial<Record<GameEvent, EventOverlayConfig>> = {
  PARTY: {
    src: "/images/party-hat.png",
    className: "absolute -top-3.5 -right-[3px] rotate-[25deg] z-10",
    widthRatio: 0.9,
  },
};

interface EventOverlayProps {
  event: GameEvent | null;
  size: number | string;
}

export const EventOverlay = ({ event, size }: EventOverlayProps) => {
  if (!event) return null;

  const overlay = EVENT_OVERLAYS[event];
  if (!overlay) return null;

  const width =
    typeof size === "number"
      ? size * overlay.widthRatio
      : `calc(${size} * ${overlay.widthRatio})`;

  return (
    <img
      src={overlay.src}
      alt=""
      className={overlay.className}
      style={{ width, height: "auto" }}
    />
  );
};
