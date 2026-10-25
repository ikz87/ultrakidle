import { useEffect, useState } from "react";
import { SeasonalEventContext } from "./seasonalEvent";
import { getSeasonalEvent, type SeasonalEvent } from "../lib/events";

export const SeasonalEventProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [event, setEvent] = useState<SeasonalEvent | null>(() =>
    getSeasonalEvent(),
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setEvent(getSeasonalEvent());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <SeasonalEventContext.Provider value={event}>
      {children}
    </SeasonalEventContext.Provider>
  );
};
