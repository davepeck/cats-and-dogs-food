/** Describes, roughly, how the player is doing. */
export type Progress =
  | "perfect" /// the player is playing perfectly
  | "good" /// the player isn't perfect, but hasn't lost yet either
  | "doom"; /// the player can't beat the level

/** Return an indication of the player's progress. */
export const computeProgress = (
  /** The minimum number of moves to solve this level. */
  minMoves: number,

  /** The number of moves taken so far by the player. */
  moves: number,

  /** The minimum number of moves remaining if the player is perfect from here. */
  minMovesRemaining: number | null,
): Progress => {
  if (minMovesRemaining === null) {
    return "doom";
  }
  const bestTotalMoves = moves + minMovesRemaining;
  return bestTotalMoves === minMoves ? "perfect" : "good";
};
