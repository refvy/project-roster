import { parseSport } from "./positions";

/** Famous first names for grey placeholders — football. */
export const FOOTBALL_FIRST_NAMES = [
  "Cristiano",
  "Lionel",
  "Erling",
  "Kylian",
  "Lamine",
  "Virgil",
  "Bruno",
  "Wayne",
  "Neymar",
  "Zlatan",
  "Sergio",
  "Kevin",
  "Mohamed",
  "Robert",
  "Harry",
  "Jude",
  "Pedri",
  "Gavi",
  "Son",
  "Marcus",
] as const;

/** Famous first names for grey placeholders — basketball. */
export const BASKETBALL_FIRST_NAMES = [
  "Stephen",
  "Kobe",
  "LeBron",
  "Michael",
  "Magic",
  "Larry",
  "Kareem",
  "Shaquille",
  "Dirk",
  "Tim",
  "Giannis",
  "Luka",
  "Jayson",
  "Kawhi",
  "Damian",
  "Nikola",
  "Anthony",
  "Chris",
  "Kevin",
  "Jimmy",
] as const;

export function athleteFirstNames(sport: string): readonly string[] {
  return parseSport(sport) === "basketball"
    ? BASKETBALL_FIRST_NAMES
    : FOOTBALL_FIRST_NAMES;
}
