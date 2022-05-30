import { useCallback, useEffect, useRef, useState } from "react";
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
  good: "😸",
  doom: "🙀",
};

/** Don't draw tiles bigger than this many pixels. */
const MAX_TILE_SIZE = 120;

/** Props to a component that draws a grid of square tiles. */
interface GridProps {
  /** The grid to display. */
  grid: levels.LevelGrid;
}

/**
 * Fully display a grid of square tiles in the containing space.
 *
 * Ensure that the grid is centered in the containing space.
 *
 * Pick the maximal possible size for each tile.
 */
const Grid: React.FC<GridProps> = ({ grid }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [clientSize, setClientSize] = useState<[number, number]>([0, 0]);
  const [tileSize, setTileSize] = useState<number>(0);
  const [clientHeight, clientWidth] = clientSize;
  const [tilesHigh, tilesWide] = levels.getSize(grid);
  const [gridHeight, gridWidth] = [tileSize * tilesHigh, tileSize * tilesWide];

  // update available space whenever the container changes
  useEffect(() => {
    const updateClientSize = () => {
      if (!ref.current) return;
      setClientSize([ref.current.offsetHeight, ref.current.offsetWidth]);
    };
    updateClientSize();
    window.addEventListener("resize", updateClientSize);
    return () => window.removeEventListener("resize", updateClientSize);
  }, [ref, ref.current]);

  // recompute tile size when client size changes
  useEffect(() => {
    const [clientHeight, clientWidth] = clientSize;
    if (clientHeight === 0 || clientWidth === 0) {
      return;
    }
    const minDimension = Math.min(clientWidth, clientHeight);
    const tileSize = Math.floor(minDimension / Math.max(tilesHigh, tilesWide));
    const finalTileSize = Math.min(tileSize, MAX_TILE_SIZE);
    setTileSize(finalTileSize);
  }, [clientSize]);

  return (
    <div
      className="grid"
      style={{
        paddingTop: `${(clientHeight - gridHeight) / 2}px`,
        paddingLeft: `${(clientWidth - gridWidth) / 2}px`,
      }}
      ref={ref}
    >
      {ref.current &&
        tileSize &&
        grid.map((row, rowIndex) => (
          <div className="row" key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <div
                className={`cell ${CSS_CLASS_NAMES[cell]}`}
                style={{ width: `${tileSize}px`, height: `${tileSize}px` }}
                key={cellIndex}
              >
                &nbsp;
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};

/** Props to the primary Game component. */
interface GameProps {
  /** The 1-based level number we're playing. */
  levelNumber: number;

  /** If true, give hints about the user's progress. */
  hints: boolean;

  /** The minimum possible number of moves to win. */
  minMoves: number;

  /** The level to play. */
  level: levels.Level;

  /** Raised when the user wins and chooses to play the next level. */
  onLevelComplete: () => void;
}

/** The Game component itself. */
const Game: React.FC<GameProps> = ({
  levelNumber,
  hints,
  minMoves,
  level,
  onLevelComplete,
}) => {
  const [grid, setGrid] = useState(levels.makeGridFromLines(level.lines));
  const [showHints, setShowHints] = useState(hints);
  const [moves, setMoves] = useState(0);
  const [resetCount, setResetCount] = useState(0);

  const reset = (level: levels.Level) => {
    setGrid(levels.makeGridFromLines(level.lines));
    setMoves(0);
    setResetCount(resetCount + 1);
  };

  // Set the initial value for currentLevel
  useEffect(() => reset(level), [level]);

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
  const progress = showHints
    ? computeProgress(minMoves, moves, minMovesNow)
    : null;

  // Should we offer the opportunity to show hints?
  const showHintLink = !showHints && resetCount > 2;

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
          Moves so far: {progress ? `${PROGRESS_CATS[progress]} ` : ""}{" "}
          <span>{moves}</span>
        </p>
      );
    }
  };

  return (
    <div className="game">
      <Grid grid={grid} />
      <div className="stats">
        <p>
          Level: <span>{levelNumber}</span>
        </p>
        {progressDescription()}
        {bowlsToFill === 0 ? (
          <p>
            You won! 😽{" "}
            <a href="#" onClick={onLevelComplete}>
              Play the next level
            </a>
            .
          </p>
        ) : (
          <p>
            Feeling stuck?{" "}
            <a href="#" onClick={() => reset(level)}>
              Try again
            </a>
            .
            {showHintLink && (
              <>
                {" "}
                <a href="#" onClick={() => setShowHints(true)}>
                  Show hints
                </a>.
              </>
            )}
          </p>
        )}
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
  const forceHints = urlParams.get("hints") !== null;
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
    <Game
      levelNumber={levelIndex + 1}
      hints={forceHints || levelIndex < 10}
      minMoves={minMoves}
      level={level}
      onLevelComplete={navigateToNextLevel}
    />
  );
};
