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
# $ # 
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
];

/** The type of a level grid. */
type Level = string[][];

/** Take a level string as input; return a level grid. */
const makeLevel = (levelStr: string): Level =>
  levelStr
    .split("\n")
    .filter((line) => line != "")
    .map((line) => line.split(""));

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
  const isCatCell = (c: string) =>
    c === CAT || c === CAT_BOWL;
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
}

/** Remove a cat from a cell. */
const removeCat = (cell: string): string => {
  if (cell === CAT_BOWL) {
    return BOWL;
  } else if (cell === CAT) {
    return EMPTY;
  } else {
    throw new Error(`Cannot remove cat from ${cell}`);
  }
}

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
      newLevel[newY][newX] = newCell === FULL_BOWL ? addCat(BOWL) : addCat(EMPTY);
      newLevel[newFoodY][newFoodX] = newFoodCell === EMPTY ? FOOD : FULL_BOWL;
    }
  }
  return newLevel;
};

/** Props to the primary Game component. */
interface GameProps {
  levelStr: string;
  onLevelComplete: () => void;
}

/** The Game component itself. */
const Game: React.FC<GameProps> = ({ levelStr, onLevelComplete }) => {
  const [level, setLevel] = useState(makeLevel(levelStr));

  useEffect(() => {
    setLevel(makeLevel(levelStr));
  }, [levelStr]);

  // Update the level state whenever keys are pressed
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const direction = DIRECTIONS[e.key];
      if (direction) {
        setLevel(moveCat(level, ...direction));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [level, setLevel]);

  const bowlsToFill = getLevelEmptyBowls(level);

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
      <div className="instructions">
        <p className="bowls-to-fill">
          {bowlsToFill === 0 ? (
            "You beat the level!"
          ) : (
            <>
              You have <span>{bowlsToFill}</span>{" "}
              {bowlsToFill === 1 ? "bowl" : "bowls"} to fill.
            </>
          )}
        </p>
        <p>Use arrow keys to move the cat. Push cat food on top of bowls.</p>
        {bowlsToFill > 0 && (
          <p>If you get stuck, press the "I&rsquo;m Stuck" button.</p>
        )}
      </div>
      {bowlsToFill === 0 ? (
        <button onClick={onLevelComplete}>Play the next level</button>
      ) : (
        <button onClick={() => setLevel(makeLevel(levelStr))}>
          I&rsquo;m Stuck
        </button>
      )}
    </div>
  );
};

/** The top-level react app! */
export const App: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const maybeInitialIndex = parseInt(urlParams.get("level") || "0", 10);
  const initialIndex = isNaN(maybeInitialIndex) ? 0 : Math.min(Math.max(1, maybeInitialIndex), LEVELS.length) - 1;
  const [levelIndex, setLevelIndex] = useState(initialIndex);

  const incrementLevelIndex = () => {
    setLevelIndex((levelIndex) => (levelIndex + 1) % LEVELS.length);
  };

  return (
    <div>
      <Game
        levelStr={LEVELS[levelIndex]}
        onLevelComplete={incrementLevelIndex}
      />
    </div>
  );
};
