export type SeasonalEvent =
  | "APRIL_FOOLS"
  | "HALLOWEEN"
  | "EASTER"
  | "CHRISTMAS";

export type GameEvent = SeasonalEvent | "PARTY";

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

interface DateWindow {
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}

function getLocalDateParts(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

function wallClockSeconds({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
}: WallClockParts): number {
  return Date.UTC(year, month - 1, day, hour, minute, second) / 1000;
}

function startOfDay(year: number, window: DateWindow): number {
  return wallClockSeconds({
    year,
    month: window.month,
    day: window.day,
    hour: window.hour ?? 0,
    minute: window.minute ?? 0,
    second: 0,
  });
}

function endOfDay(year: number, window: DateWindow): number {
  return wallClockSeconds({
    year,
    month: window.month,
    day: window.day,
    hour: 23,
    minute: 59,
    second: 59,
  });
}

function addDays(
  year: number,
  month: number,
  day: number,
  amount: number,
): { month: number; day: number } {
  const date = new Date(Date.UTC(year, month - 1, day + amount));

  return {
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function getEasterSunday(year: number): {
  month: number;
  day: number;
} {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return { month, day };
}

export function getSeasonalEvent(date: Date = new Date()): SeasonalEvent | null {
  const now = getLocalDateParts(date);
  const timestamp = wallClockSeconds(now);

  const easter = getEasterSunday(now.year);
  const goodFriday = addDays(now.year, easter.month, easter.day, -2);
  const goodFridayStart = wallClockSeconds({
    year: now.year,
    month: goodFriday.month,
    day: goodFriday.day,
  });
  const easterEnd = endOfDay(now.year, easter);

  const aprilFools: DateWindow = { month: 4, day: 1 };
  const halloweenStart: DateWindow = { month: 10, day: 25 };
  const halloweenEnd: DateWindow = { month: 10, day: 31 };
  const christmasStart: DateWindow = { month: 12, day: 22, hour: 0, minute: 12 };
  const christmasEnd: DateWindow = { month: 12, day: 28 };

  if (
    timestamp >= startOfDay(now.year, aprilFools) &&
    timestamp <= endOfDay(now.year, aprilFools)
  ) {
    return "APRIL_FOOLS";
  }

  if (
    timestamp >= startOfDay(now.year, halloweenStart) &&
    timestamp <= endOfDay(now.year, halloweenEnd)
  ) {
    return "HALLOWEEN";
  }

  if (
    timestamp >= startOfDay(now.year, christmasStart) &&
    timestamp <= endOfDay(now.year, christmasEnd)
  ) {
    return "CHRISTMAS";
  }

  if (timestamp >= goodFridayStart && timestamp <= easterEnd) {
    return "EASTER";
  }

  return null;
}
