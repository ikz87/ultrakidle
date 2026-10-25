import { createContext } from "react";
import type { SeasonalEvent } from "../lib/events";

export const SeasonalEventContext = createContext<SeasonalEvent | null>(null);
