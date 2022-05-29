import _levels from "./levels.json";

/** The structure of a single entry in our levels.json file. */
export interface Level {
  /** The level's title. */
  title: string;

  /** The collection the level comes from. */
  collection: string;

  /** A URL to the collection. */
  collectionUrl: string;

  /** The name of the author of the level. */
  author: string;

  /** A link to the author of the level. */
  authorUrl: string;

  /** A license, if any. */
  license?: string;

  /** A list of line strings that describe the level. */
  lines: string[];
}

/** All of our levels. */
export const LEVELS = _levels as unknown as Level[];

// String constants for our grid pieces
// See http://www.sokobano.de/wiki/index.php?title=Level_format#Level
export type Cell = "#" | "@" | "+" | "$" | "*" | "." | " ";
export const WALL: Cell = "#"; /// Sokoban wall
export const CAT: Cell = "@"; /// Sokoban player
export const CAT_BOWL: Cell = "+"; /// Sokoban player on goal
export const FOOD: Cell = "$"; /// Sokoban box
export const FULL_BOWL: Cell = "*"; /// Sokoban box on goal
export const BOWL: Cell = "."; /// Sokoban goal
export const EMPTY: Cell = " "; /// Sokoban floor

/** A type corresponding to a level grid array. */
export type LevelGrid = Cell[][];

/** Given a list of lines, make a level grid. */
export const makeGridFromLines = (lines: string[]): LevelGrid =>
  lines.map((line) => line.split("") as Cell[]);

/** Given a level grid, make a unique string representing the level. */
export const makeGridString = (grid: LevelGrid): string =>
  grid.map((row) => row.join("")).join("\n");

/** Get the [height, width] of the level grid. */
export const getSize = (grid: LevelGrid): [number, number] => [
  grid.length,
  grid[0].length,
];

/** Given a level grid, return the number of empty bowls remaining. */
export const getEmptyBowlCount = (grid: LevelGrid): number =>
  grid.reduce(
    (acc, row) => acc + row.filter((c) => c === BOWL || c === CAT_BOWL).length,
    0
  );

/** Given a level grid, return the cat [y, x] location. */
export const getCatLocation = (grid: LevelGrid): [number, number] => {
  for (let x = 0; x < grid[0].length; x++) {
    for (let y = 0; y < grid.length; y++) {
      if (grid[y][x] === CAT || grid[y][x] === CAT_BOWL) {
        return [y, x];
      }
    }
  }
  throw new Error("Could not find cat location");
};

/** Given a cell, add a cat to it (or fail if cats can't go there.) */
export const addCat = (cell: Cell): Cell => {
  switch (cell) {
    case BOWL:
      return CAT_BOWL;
    case EMPTY:
      return CAT;
    default:
      throw new Error(`Can't add cat to ${cell}`);
  }
};

/** Given a cell, remove a cat from it (or fail if it has no cat.) */
export const removeCat = (cell: Cell): Cell => {
  switch (cell) {
    case CAT:
      return EMPTY;
    case CAT_BOWL:
      return BOWL;
    default:
      throw new Error(`Can't remove cat from ${cell}`);
  }
};

/** Copy a level grid. */
export const copyGrid = (grid: LevelGrid): LevelGrid => grid.map((row) => [...row]);

/**
 * Return a new LevelGrid where the cat has moved in the indicated direction.
 *
 * If the cat can't move there, return the same (effective) grid.
 *
 * Moves bags of food if they're in the way and the moves are valid.
 */
export const moveCat = (grid: LevelGrid, y: number, x: number): LevelGrid => {
  const newGrid = copyGrid(grid);

  // Figure out where we're moving from
  const [catY, catX] = getCatLocation(newGrid);
  const currentCell = newGrid[catY][catX];

  // Figure out where we're moving to
  const [moveToY, moveToX] = [catY + y, catX + x];
  const moveToCell = newGrid[moveToY][moveToX];

  // We can always move to EMPTY or BOWL cells
  if (moveToCell === EMPTY || moveToCell === BOWL) {
    newGrid[catY][catX] = removeCat(currentCell);
    newGrid[moveToY][moveToX] = addCat(moveToCell);
  }

  // We can move to FOOD cells if the food can be pushed
  else if (moveToCell === FOOD || moveToCell === FULL_BOWL) {
    // Figure out where the food would be pushed to
    const [newFoodX, newFoodY] = [moveToX + x, moveToY + y];
    const newFoodCell = newGrid[newFoodY][newFoodX];

    // We can actually move the food if it's going to an EMPTY or BOWL cell
    if (newFoodCell === EMPTY || newFoodCell === BOWL) {
      newGrid[catY][catX] = removeCat(currentCell);
      // allow pushing full bowls into empty bowls
      newGrid[moveToY][moveToX] =
        moveToCell === FULL_BOWL ? addCat(BOWL) : addCat(EMPTY);
      newGrid[newFoodY][newFoodX] = newFoodCell === EMPTY ? FOOD : FULL_BOWL;
    }
  }

  return newGrid;
};
