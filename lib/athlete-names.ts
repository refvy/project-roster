import { parseSport } from "./positions";

/** Famous first names for grey placeholders — football. */
export const FOOTBALL_FIRST_NAMES = [
  "Cristiano",
  "Erling",
  "Lionel",
  "Kylian",
  "Bukayo",
  "Jude",
] as const;

/** Famous first names for grey placeholders — basketball. */
export const BASKETBALL_FIRST_NAMES = [
  "Stephen",
  "LeBron",
  "Giannis",
  "Luka",
  "Nikola",
  "Caitlin",
] as const;

export function athleteFirstNames(sport: string): readonly string[] {
  return parseSport(sport) === "basketball"
    ? BASKETBALL_FIRST_NAMES
    : FOOTBALL_FIRST_NAMES;
}
