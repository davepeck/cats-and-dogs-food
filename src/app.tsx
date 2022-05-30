import { useCallback, useEffect, useRef, useState } from "react";
import * as levels from "./levels";
import { solve } from "./solver";
import { Progress, computeProgress } from "./progress";
import { hasTouchSupport } from "./utils";

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

/** Don't draw tiles smaller than this many pixels. */
const MIN_TILE_SIZE = 15;

/** Don't draw tiles bigger than this many pixels. */
const MAX_TILE_SIZE = 120;

/** Props to an on-screen set of arrow keys. */
interface ArrowPadProps {
  /** Callback to invoke when an arrow is pressed. */
  onMove: (dy: number, dx: number) => void;
}

/** An on-screen set of touchable arrow keys, also tied to the keyboard. */
export const ArrowPad: React.FC<ArrowPadProps> = ({ onMove }) => {
  // Fire a move event whenever the user presses an arrow key.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const direction = DIRECTIONS[e.key];
      if (direction) onMove(...direction);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onMove]);

  if (!hasTouchSupport()) {
    return <></>;
  }

  return (
    <div className="keys">
      <div className="keys--row">
        <button className="key" onClick={() => onMove(-1, 0)}>
          ↑
        </button>
      </div>
      <div className="keys--row">
        <button className="key" onClick={() => onMove(0, -1)}>
          ←
        </button>
        <button className="key" onClick={() => onMove(1, 0)}>
          ↓
        </button>
        <button className="key" onClick={() => onMove(0, 1)}>
          →
        </button>
      </div>
    </div>
  );
};

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
      setClientSize([ref.current.clientHeight, ref.current.clientWidth]);
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
    const finalTileSize = Math.max(
      MIN_TILE_SIZE,
      Math.min(tileSize, MAX_TILE_SIZE)
    );
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

  const move = useCallback(
    (y: number, x: number) => {
      const newGrid = levels.moveCat(grid, y, x);
      const gridChanged =
        levels.makeGridString(newGrid) !== levels.makeGridString(grid);
      if (gridChanged) {
        setGrid(newGrid);
        setMoves(moves + 1);
      }
    },
    [grid, moves]
  );

  // Set the initial value for currentLevel
  useEffect(() => reset(level), [level]);

  // have we beat the level?
  const won = levels.getEmptyBowlCount(grid) === 0;

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
      if (levelNumber === 1) {
        return (
          <span>
            {hasTouchSupport() ? (
              <>
                Help the 🐱 push its <em>food</em> over the <em>bowls</em>.
              </>
            ) : (
              <>
                Use arrow keys to help the 🐱 push its <em>food</em> over the <em>bowls</em>.
              </>
            )}
          </span>
        );
      } else {
        return (
          <span>
            Takes just <em>{minMoves}</em> moves.
          </span>
        );
      }
    } else if (won) {
      if (moves === minMoves) {
        return (
          <span>
            You won in <em>{moves}</em> moves. 😻! Purrfect.
          </span>
        );
      } else {
        return (
          <span>
            You won in <em>{moves}</em> moves. 😽.
          </span>
        );
      }
    } else {
      return (
        <span>
          Moves so far: {progress ? `${PROGRESS_CATS[progress]} ` : ""}{" "}
          <em>{moves}</em>.
        </span>
      );
    }
  };

  return (
    <div className="game">
      <Grid grid={grid} />
      <div className="footer">
        <div className="stats">
          <span>
            Level: <em>{levelNumber}</em>.
          </span>{" "}
          {progressDescription()}{" "}
          {won ? (
            <span>
              <a href="#" onClick={onLevelComplete}>
                Next level
              </a>
              !
            </span>
          ) : (
            <span>
              {moves > 0 && (
                <>
                  <a href="#" onClick={() => reset(level)}>
                    I&rsquo;m stuck
                  </a>.{" "}
                </>
              )}
              {showHintLink && (
                <>
                  {" "}
                  <a href="#" onClick={() => setShowHints(true)}>
                    Get hints
                  </a>
                  .
                </>
              )}
            </span>
          )}
        </div>
        <ArrowPad onMove={move} />
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
      hints={forceHints || levelIndex < 9}
      minMoves={minMoves}
      level={level}
      onLevelComplete={navigateToNextLevel}
    />
  );
};
