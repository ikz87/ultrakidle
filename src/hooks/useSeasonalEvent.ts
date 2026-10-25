import { useContext } from "react";
import { SeasonalEventContext } from "../context/seasonalEvent";

export const useSeasonalEvent = () => useContext(SeasonalEventContext);
