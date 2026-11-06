export type Progression = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpRemaining: number;
};

export function getProgression(totalXp: number): Progression {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0) {
    throw new RangeError("Total XP must be a non-negative safe integer.");
  }

  const threshold = (level: number) => 125 * level * (level + 3);

  let level = Math.max(
    0,
    Math.floor((Math.sqrt(9 + (4 * totalXp) / 125) - 3) / 2),
  );

  // Correct rounding near exact level boundaries.
  while (threshold(level + 1) <= totalXp) level += 1;
  while (threshold(level) > totalXp) level -= 1;

  const xpIntoLevel = totalXp - threshold(level);
  const xpForNextLevel = 500 + 250 * level;

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    xpRemaining: xpForNextLevel - xpIntoLevel,
  };
}
