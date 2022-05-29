/** Describes, roughly, how the player is doing. */
export type Progress =
  | "perfect" /// the player is playing perfectly
  | "great" /// the player is within 8 moves of the optimal
  | "okay" /// the player is more than 8 moves away from the optimal
  | "doom"; /// the player can't beat the level

/** The number of moves beyond the minimum at which we're no longer good. */
const GREAT_THRESHOLD = 8;

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
  if (bestTotalMoves === minMoves) {
    return "perfect";
  } else if (bestTotalMoves <= minMoves + GREAT_THRESHOLD) {
    return "great";
  } else {
    return "okay";
  }
};
