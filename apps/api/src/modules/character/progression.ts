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

  const threshold = (level: number) => 25 * (level - 1) * (level + 2);

  let level = Math.max(
    1,
    Math.floor((Math.sqrt(9 + (4 * totalXp) / 25) - 1) / 2),
  );

  // Correct rounding near exact level boundaries.
  while (threshold(level + 1) <= totalXp) level += 1;
  while (threshold(level) > totalXp) level -= 1;

  const xpIntoLevel = totalXp - threshold(level);
  const xpForNextLevel = 100 + 50 * (level - 1);

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    xpRemaining: xpForNextLevel - xpIntoLevel,
  };
}
