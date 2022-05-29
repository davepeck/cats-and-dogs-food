import { useCallback, useEffect, useState } from "react";

// String constants for our grid pieces
// See http://www.sokobano.de/wiki/index.php?title=Level_format#Level_file_format
const BOWL = ".";
const FULL_BOWL = "*";
const CAT = "@";
const CAT_BOWL = "+";
const FOOD = "$";
const WALL = "#";
const EMPTY = " ";

/** Mappings from grid pieces to their corresponding CSS classes */
const PIECES: Record<string, string> = {
  [BOWL]: "bowl",
  [FULL_BOWL]: "full-bowl",
  [CAT]: "cat",
  [CAT_BOWL]: "cat",
  [FOOD]: "food",
  [WALL]: "wall",
  [EMPTY]: "empty",
};

/** Mappings from key codes to their corresponding directions */
const DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/** All the levels, in order. */
const LEVELS = [
  `
 #####
 #.  #
###  #
# $  #
#@   #
######
`,
  `
 #####
 #.. #
###  #
# $  #
# $ ##
#@  # 
##### 
`,
  `
#####  
#@  #  
# #$###
# $ ..#
#######
`,
  `
 #####
##.@ #
# $$ #
#.  ##
##### 
`,
  `
##### 
#   ##
#$ *@#
#..$ #
######
`,
  `
#####  
# . ## 
#  $ ##
##  $+#
 ######
`,
  `
  ###   
###+####
#  $$  #
#   .  #
########
`,
  `
  #####
###   #
# $   #
#.@$.##
###### 
`,
  `
 #####
 #   #
##   #
# $*##
# @ .#
######
`,
  `
##### 
#  .##
#  $@#
##$  #
 # . #
 #####
`,
  `
##### 
#   ##
#   @#
##$$ #
#. .##
##### 
`,
  `
######  
#.   ###
# $ $  #
# .#@  #
########
`,
  `
##### 
#.@ # 
#  $##
# $ .#
##   #
 #####
`,
  `
######
# @#.#
#$$ .#
#.$  #
#   ##
##### 
`,
  `
#####   
#  .####
#@$ $  #
## .   #
 #######
`,
  `
###### 
# $ .##
#.  $ #
#  $@.#
#######
`,
  `
######
# . .#
#@$$##
##   #
 #   #
 #####
`,
  `
######  
# .  ###
#. $$  #
#    *@#
########
`,
];

/** The type of a level grid. */
type Level = string[][];

/** Take a level string as input; return a (possibly uneven) level grid. */
const innerMakeLevel = (levelStr: string): Level =>
  levelStr
    .split("\n")
    .filter((line) => line != "")
    .map((line) => line.split(""));

/** Take a level string as input; return an (even) level grid or blow up. */
const makeLevel = (levelStr: string): Level => {
  const level = innerMakeLevel(levelStr);
  const width = level[0].length;
  level.forEach((line) => {
    if (line.length !== width) {
      throw new Error(`Level line ${line} has wrong width: ${levelStr}`);
    }
  });
  return level;
};

/** Take a Level grid as input; return a level string back. */
const makeLevelStr = (level: Level): string =>
  level.map((line) => line.join("")).join("\n");

/** Get the [x, y] dimensions of the level array. */
const getLevelSize = (level: Level): [number, number] => [
  level[0].length,
  level.length,
];

/** Return the number of empty bowls remaining in the level. */
const getLevelEmptyBowls = (level: Level): number =>
  level.reduce((acc, line) => {
    return acc + line.filter((c) => c === BOWL || c === CAT_BOWL).length;
  }, 0);

/** Get the [x, y] of the cat in the level. */
const getLevelCat = (level: Level): [number, number] => {
  // deal with the fact that we can keep both cat + bowl in the same grid piece
  const isCatCell = (c: string) => c === CAT || c === CAT_BOWL;
  const catLine = level.find((line) => line.findIndex(isCatCell) !== -1);
  if (!catLine) {
    throw new Error("No cat found");
  }
  const x = catLine.findIndex(isCatCell);
  const y = level.indexOf(catLine);
  return [x, y];
};

/** Add a cat to a cell. */
const addCat = (cell: string): string => {
  if (cell === BOWL) {
    return CAT_BOWL;
  } else if (cell === EMPTY) {
    return CAT;
  } else {
    throw new Error(`Cannot add cat to ${cell}`);
  }
};

/** Remove a cat from a cell. */
const removeCat = (cell: string): string => {
  if (cell === CAT_BOWL) {
    return BOWL;
  } else if (cell === CAT) {
    return EMPTY;
  } else {
    throw new Error(`Cannot remove cat from ${cell}`);
  }
};

/** Return a new Level where the cat has moved. */
const moveCat = (level: Level, x: number, y: number): Level => {
  const newLevel = level.map((line) => [...line]);
  const [catX, catY] = getLevelCat(newLevel);
  const [newX, newY] = [catX + x, catY + y];
  const catCell = newLevel[catY][catX];
  const newCell = newLevel[newY][newX];
  if (newCell === EMPTY || newCell === BOWL) {
    newLevel[catY][catX] = removeCat(catCell);
    newLevel[newY][newX] = addCat(newCell);
  } else if (newCell === FOOD || newCell === FULL_BOWL) {
    const [newFoodX, newFoodY] = [newX + x, newY + y];
    const newFoodCell = newLevel[newFoodY][newFoodX];
    if (newFoodCell === EMPTY || newFoodCell === BOWL) {
      newLevel[catY][catX] = removeCat(catCell);
      // allow pushing full bowls into empty bowls
      newLevel[newY][newX] =
        newCell === FULL_BOWL ? addCat(BOWL) : addCat(EMPTY);
      newLevel[newFoodY][newFoodX] = newFoodCell === EMPTY ? FOOD : FULL_BOWL;
    }
  }
  return newLevel;
};

/**
 * Attempt to solve a level. An iterative, breadth-first implementation.
 *
 * Return the minimum number of moves needed to solve the level, or `null` if
 * the level is unsolvable.
 */
const solveLevel = (level: Level): number | null => {
  const visited = new Set<string>([makeLevelStr(level)]);
  const queue: [Level, number][] = [[level, 0]];

  while (queue.length > 0) {
    const [currentLevel, currentMoves] = queue.shift()!;

    // check if we've reached a solution
    if (getLevelEmptyBowls(currentLevel) === 0) {
      return currentMoves;
    }

    // determine our neighbors
    const neighbors = [
      moveCat(currentLevel, -1, 0),
      moveCat(currentLevel, 1, 0),
      moveCat(currentLevel, 0, -1),
      moveCat(currentLevel, 0, 1),
    ];
    for (const neighbor of neighbors) {
      const neighborStr = makeLevelStr(neighbor);
      if (!visited.has(neighborStr)) {
        visited.add(neighborStr);
        queue.push([neighbor, currentMoves + 1]);
      }
    }
  }

  return null;
};

/** Props to the primary Game component. */
interface GameProps {
  levelNumber: number;
  minMoves: number;
  levelStart: Level;
  onLevelComplete: () => void;
}

/** The Game component itself. */
const Game: React.FC<GameProps> = ({
  levelNumber,
  minMoves,
  levelStart,
  onLevelComplete,
}) => {
  const [level, setLevel] = useState(levelStart);
  const [moves, setMoves] = useState(0);

  // Set the initial value for currentLevel
  useEffect(() => {
    setLevel(levelStart);
  }, [levelStart]);

  // Update the level state whenever keys are pressed
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const direction = DIRECTIONS[e.key];
      if (direction) {
        const newLevel = moveCat(level, ...direction);
        const levelChanged = makeLevelStr(newLevel) !== makeLevelStr(level);
        if (levelChanged) {
          setLevel(newLevel);
          setMoves(moves + 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [level, setLevel, moves]);

  // have we beat the level?
  const bowlsToFill = getLevelEmptyBowls(level);

  // can we still solve the level?
  const minMovesNow = solveLevel(level);

  let movesDescription;
  if (moves === 0) {
    movesDescription = (
      <p>
        You can beat this level in <span>{minMoves}</span> moves.
      </p>
    );
  } else if (bowlsToFill === 0) {
    if (moves === minMoves) {
      movesDescription = (
        <p>
          You took a perfect <span>{moves}</span> moves!
        </p>
      );
    } else {
      movesDescription = (
        <p>
          You took <span>{moves}</span> moves; it can be done in{" "}
          <span>{minMoves}</span>.
        </p>
      );
    }
  } else {
    movesDescription = (
      <p>
        Moves so far: <span>{moves}</span>
      </p>
    );
  }

  return (
    <div className="game">
      <div className="board">
        {level.map((row, y) => (
          <div className="row" key={y}>
            {row.map((cell, x) => (
              <div className={`cell ${PIECES[cell]}`} key={x} />
            ))}
          </div>
        ))}
      </div>
      <div className="stats">
        {bowlsToFill === 0 && (
          <p>
            You won! 😸{" "}
            <a href="#" onClick={onLevelComplete}>
              Play the next level
            </a>
            .
          </p>
        )}
        <p>
          Level: <span>{levelNumber}</span>
        </p>
        {movesDescription}
        {minMovesNow === null && (
          <p>
            Whoops! You're struck.{" "}
            <a href="#" onClick={() => setLevel(levelStart)}>
              Try again
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
};

/** The top-level react app! */
export const App: React.FC = () => {
  // Determine the current level
  const urlParams = new URLSearchParams(window.location.search);
  const maybeLevelNumber = parseInt(urlParams.get("level") || "0", 10);
  const levelIndex = isNaN(maybeLevelNumber)
    ? 0
    : Math.min(Math.max(1, maybeLevelNumber), LEVELS.length) - 1;

  const navigateToNextLevel = () => {
    // use navigation so that reload takes you back to the same level
    const nextLevelNumber = ((levelIndex + 1) % LEVELS.length) + 1;
    window.location.href = `?level=${nextLevelNumber}`;
  };

  const level = makeLevel(LEVELS[levelIndex]);
  const minMoves = solveLevel(level);

  if (minMoves === null) {
    return (
      <div className="app">
        <h1>Unsolvable level!</h1>
      </div>
    );
  }

  return (
    <div className="app">
      <Game
        levelNumber={levelIndex + 1}
        minMoves={minMoves}
        levelStart={level}
        onLevelComplete={navigateToNextLevel}
      />
    </div>
  );
};
