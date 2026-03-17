export function getMsUntilNicaraguaMidnight(): number {
  const now = new Date();
  const nicaraguaNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Managua" }),
  );
  const midnight = new Date(nicaraguaNow);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  return midnight.getTime() - nicaraguaNow.getTime();
}
