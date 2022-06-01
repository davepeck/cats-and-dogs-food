import {
  LevelGrid,
  Level,
  makeGridString,
  getEmptyBowlCount,
  moveCat,
  makeGridFromLines,
} from "./levels";

/**
 * Attempt to solve a level.
 *
 * Returns the minimum number of moves needed to solve the level, or `null` if
 * the level is unsolvable.
 * 
 * This approach is very simple and good for learning: it's a textbook 
 * breadth-first search. But it can be slow, even for seemingly simple levels.
 * 
 * Smarter approaches would only consider pushes, would use a shortest path 
 * algorithm to figure out how to get the cat to a potential push, and would 
 * have a few heuristics to determine when a position is hopeless.
 *
 * Stepping way back: Sokoban is PSPACE-complete. All attempts to solve
 * it in the general case will be met with ruin. It is given to the realm of 
 * modern high-scale AI solvers.
 */
export const solve = (grid: LevelGrid): number | null => {
  const visited = new Set<string>([makeGridString(grid)]);
  const queue: [LevelGrid, number][] = [[grid, 0]];

  while (queue.length > 0) {
    const [currentGrid, currentMoves] = queue.shift()!;

    // check if we've reached a solution
    if (getEmptyBowlCount(currentGrid) === 0) {
      return currentMoves;
    }

    // determine our neighbors
    const neighbors = [
      moveCat(currentGrid, -1, 0),
      moveCat(currentGrid, 1, 0),
      moveCat(currentGrid, 0, -1),
      moveCat(currentGrid, 0, 1),
    ];
    for (const neighbor of neighbors) {
      const neighborStr = makeGridString(neighbor);
      if (!visited.has(neighborStr)) {
        visited.add(neighborStr);
        queue.push([neighbor, currentMoves + 1]);
      }
    }
  }

  return null;
};


/** Validate a level, raising an exception if it can't be solved. */
export const validate = (level: Level): void => {
  const grid = makeGridFromLines(level.lines);
  const solution = solve(grid);
  if (solution === null) {
    throw new Error(`Unsolvable level: ${makeGridString(grid)}`);
  }
  console.log(`Level ${level.title} is solvable in ${solution} moves.`);
}
