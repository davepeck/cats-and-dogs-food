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
const Grid: React.FC<GridProps> = ({ grid }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState<[number, number]>([0, 0]);
  const [tileSize, setTileSize] = useState<number>(0);

  // update window size whenever the container changes
  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize([window.innerHeight, window.innerWidth]);
    };
    updateWindowSize();
    window.addEventListener("resize", updateWindowSize);
    return () => window.removeEventListener("resize", updateWindowSize);
  }, []);

  // Update the tile size whenever the layout changes
  useEffect(() => {
    const current = containerRef.current;
    if (current === null) return;

    // Determine how large the tiles can get such that the grid fits within
    // the available container width AND does not overflow the container height.
    const [tilesHigh, tilesWide] = levels.getSize(grid);
    const [containerHeight, containerWidth] = [
      current.offsetHeight,
      current.offsetWidth,
    ];
    const [windowHeight, windowWidth] = windowSize;
    const maxHeight = windowHeight * 0.75;
    const maxWidth = Math.min(containerWidth, windowWidth) * 0.75;
    const maxTileSize = Math.floor(
      Math.min(maxHeight / tilesHigh, maxWidth / tilesWide)
    );
    console.log(
      `Container size: ${containerHeight}, ${containerWidth}`,
      `Window size: ${windowHeight}, ${windowWidth}`,
      `Max tile size: ${maxTileSize}`,
      `Tiles: ${tilesHigh}x${tilesWide}`
    );
    setTileSize(maxTileSize);
  }, [grid, windowSize]);

  return (
    <div className="grid" ref={containerRef}>
      {grid.map((row, y) => (
        <div className="row" key={y}>
          {row.map((cell, x) => (
            <div
              className={`cell ${CSS_CLASS_NAMES[cell]}`}
              style={{ width: `${tileSize}px`, height: `${tileSize}px` }}
              key={x}
            />
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
  const [moves, setMoves] = useState(0);

  const reset = (level: levels.Level) => {
    setGrid(levels.makeGridFromLines(level.lines));
    setMoves(0);
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
          Moves so far: {hints ? `${PROGRESS_CATS[progress]} ` : ""}{" "}
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
    <div className="app">
      <div className="inner">
        <Game
          levelNumber={levelIndex + 1}
          hints={forceHints || levelIndex < 10}
          minMoves={minMoves}
          level={level}
          onLevelComplete={navigateToNextLevel}
        />
      </div>
    </div>
  );
};
