import { useCallback, useEffect, useState } from "react";
import * as levels from "./levels";
import { solve } from "./solver";
import { Progress, computeProgress } from "./progress";

/** Mappings from grid pieces to their corresponding CSS classes */
const CSS_CLASS_NAMES: Record<string, string> = {
  [levels.BOWL]: "bowl",
  [levels.FULL_BOWL]: "full-bowl",
  [levels.CAT]: "cat",
  [levels.CAT_BOWL]: "cat",
  [levels.FOOD]: "food",
  [levels.WALL]: "wall",
  [levels.EMPTY]: "empty",
};

/** Mappings from key codes to their corresponding [dy, dx] directions */
const DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/** Cat emojis for various progress states. */
const PROGRESS_CATS: Record<Progress, string> = {
  perfect: "😻",
  great: "😺",
  okay: "🐱",
  doom: "🙀",
};

/** Props to the grid component. */
interface GridProps {
  /** The grid to display. */
  grid: levels.LevelGrid;
}

/** The grid drawing component. */
const Grid: React.FC<GridProps> = ({ grid }) => (
  <div className="grid">
    {grid.map((row, y) => (
      <div className="row" key={y}>
        {row.map((cell, x) => (
          <div className={`cell ${CSS_CLASS_NAMES[cell]}`} key={x} />
        ))}
      </div>
    ))}
  </div>
);

/** Props to the primary Game component. */
interface GameProps {
  levelNumber: number;
  minMoves: number;
  level: levels.Level;
  onLevelComplete: () => void;
}

/** The Game component itself. */
const Game: React.FC<GameProps> = ({
  levelNumber,
  minMoves,
  level,
  onLevelComplete,
}) => {
  const [grid, setGrid] = useState(levels.makeGridFromLines(level.lines));
  const [moves, setMoves] = useState(0);

  // Set the initial value for currentLevel
  useEffect(() => {
    setGrid(levels.makeGridFromLines(level.lines));
    setMoves(0);
  }, [level]);

  // Update the level state whenever keys are pressed
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const direction = DIRECTIONS[e.key];
      if (direction) {
        const newGrid = levels.moveCat(grid, ...direction);
        const gridChanged =
          levels.makeGridString(newGrid) !== levels.makeGridString(grid);
        if (gridChanged) {
          setGrid(newGrid);
          setMoves(moves + 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [grid, setGrid, moves]);

  // have we beat the level?
  const bowlsToFill = levels.getEmptyBowlCount(grid);

  // can we still solve the level?
  const minMovesNow = solve(grid);

  // What's our progress?
  const progress = computeProgress(minMoves, moves, minMovesNow);

  /** Generate a description of current progress. */
  const progressDescription = () => {
    if (moves === 0) {
      return (
        <p>
          You can beat this level in <span>{minMoves}</span> moves.
        </p>
      );
    } else if (bowlsToFill === 0) {
      if (moves === minMoves) {
        return (
          <p>
            You took a perfect <span>{moves}</span> moves!
          </p>
        );
      } else {
        return (
          <p>
            You took <span>{moves}</span> moves; it can be done in{" "}
            <span>{minMoves}</span>.
          </p>
        );
      }
    } else {
      return (
        <p>
          Moves so far: {PROGRESS_CATS[progress]} <span>{moves}</span>
        </p>
      );
    }
  };

  return (
    <div className="game">
      <Grid grid={grid} />
      <div className="stats">
        {bowlsToFill === 0 && (
          <p>
            You won! 😽{" "}
            <a href="#" onClick={onLevelComplete}>
              Play the next level
            </a>
            .
          </p>
        )}
        <p>
          Level: <span>{levelNumber}</span>
        </p>
        {progressDescription()}
        <p>
          Feeling stuck?{" "}
          <a
            href="#"
            onClick={() => {
              setGrid(levels.makeGridFromLines(level.lines));
              setMoves(0);
            }}
          >
            Try again
          </a>
          .
        </p>
      </div>
    </div>
  );
};

// Validate all levels (can be slow if they're complex!)
// levels.LEVELS.forEach(validate);

/** The top-level react app! */
export const App: React.FC = () => {
  // Determine the current level
  const urlParams = new URLSearchParams(window.location.search);
  const maybeLevelNumber = parseInt(urlParams.get("level") || "0", 10);
  const levelIndex = isNaN(maybeLevelNumber)
    ? 0
    : Math.min(Math.max(1, maybeLevelNumber), levels.LEVELS.length) - 1;

  const navigateToNextLevel = () => {
    // use navigation so that reload takes you back to the same level
    const nextLevelNumber = ((levelIndex + 1) % levels.LEVELS.length) + 1;
    window.location.href = `?level=${nextLevelNumber}`;
  };

  const level = levels.LEVELS[levelIndex];
  const grid = levels.makeGridFromLines(level.lines);
  const minMoves = solve(grid);

  if (minMoves === null) {
    return (
      <div className="app">
        <h1>Unsolvable level!</h1>
        <Grid grid={grid} />
      </div>
    );
  }

  return (
    <div className="app">
      <Game
        levelNumber={levelIndex + 1}
        minMoves={minMoves}
        level={level}
        onLevelComplete={navigateToNextLevel}
      />
    </div>
  );
};
