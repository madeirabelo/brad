import React, { useState, useEffect, useRef } from 'react';
import './Go.css';

const BOARD_SIZES = {
  SMALL: 9,
  MEDIUM: 13,
  LARGE: 19
};

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const STAR_POINTS = {
  9: [[4, 4]],
  13: [
    [3, 3], [3, 6], [3, 9],
    [6, 3], [6, 6], [6, 9],
    [9, 3], [9, 6], [9, 9]
  ],
  19: [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15]
  ]
};

const Go = () => {
  const [boardSize, setBoardSize] = useState(BOARD_SIZES.LARGE);
  const [board, setBoard] = useState(Array(BOARD_SIZES.LARGE).fill().map(() => Array(BOARD_SIZES.LARGE).fill(EMPTY)));
  const [currentPlayer, setCurrentPlayer] = useState(BLACK);
  const [capturedBlack, setCapturedBlack] = useState(0);
  const [capturedWhite, setCapturedWhite] = useState(0);
  const [lastMove, setLastMove] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [illegalMoveMsg, setIllegalMoveMsg] = useState("");
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [lastPassPlayer, setLastPassPlayer] = useState(null);
  const illegalMoveTimeout = useRef(null);

  // Responsive board size
  const containerRef = useRef(null);
  const [boardPx, setBoardPx] = useState(400); // default for desktop

  useEffect(() => {
    function updateBoardPx() {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setBoardPx(Math.min(width, 540)); // max 540px for desktop
      }
    }
    updateBoardPx();
    window.addEventListener('resize', updateBoardPx);
    return () => window.removeEventListener('resize', updateBoardPx);
  }, []);

  // Board visual constants (dynamic)
  const PADDING = boardPx * 0.055; // scale padding
  const CELL = (boardPx - 2 * PADDING) / (boardSize - 1);
  const STONE_RADIUS = CELL * 0.45;
  const STAR_RADIUS = CELL * 0.13;

  // Update board when board size changes
  useEffect(() => {
    setBoard(Array(boardSize).fill().map(() => Array(boardSize).fill(EMPTY)));
    setCurrentPlayer(BLACK);
    setCapturedBlack(0);
    setCapturedWhite(0);
    setLastMove(null);
    setGameOver(false);
    setConsecutivePasses(0);
    setLastPassPlayer(null);
  }, [boardSize]);

  // Draw the board grid and star points
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, boardPx, boardPx);
    // Board background
    ctx.fillStyle = '#deb887';
    ctx.fillRect(0, 0, boardPx, boardPx);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    // Draw grid
    for (let i = 0; i < boardSize; i++) {
      // Vertical
      ctx.beginPath();
      ctx.moveTo(PADDING + i * CELL, PADDING);
      ctx.lineTo(PADDING + i * CELL, boardPx - PADDING);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(PADDING, PADDING + i * CELL);
      ctx.lineTo(boardPx - PADDING, PADDING + i * CELL);
      ctx.stroke();
    }
    // Draw star points
    ctx.fillStyle = '#111';
    for (const [r, c] of STAR_POINTS[boardSize]) {
      ctx.beginPath();
      ctx.arc(PADDING + c * CELL, PADDING + r * CELL, STAR_RADIUS, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [boardSize, boardPx]);

  // Helper to show illegal move message
  const showIllegalMoveMsg = (msg) => {
    setIllegalMoveMsg(msg);
    if (illegalMoveTimeout.current) clearTimeout(illegalMoveTimeout.current);
    illegalMoveTimeout.current = setTimeout(() => setIllegalMoveMsg(""), 3000);
  };

  // Enhanced isValidMove to return reason
  const isValidMove = (row, col) => {
    if (board[row][col] !== EMPTY) return { valid: false, reason: "This spot is already occupied." };
    // Create a copy of the board to simulate the move
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = currentPlayer;
    // Check if the move would capture any stones
    const wouldCapture = checkCaptures(newBoard, row, col, currentPlayer === BLACK ? WHITE : BLACK);
    // Check if the move would be suicide
    if (!wouldCapture && !hasLiberties(newBoard, row, col)) {
      return { valid: false, reason: "This move is suicide (no liberties)." };
    }
    return { valid: true };
  };

  const hasLiberties = (board, row, col) => {
    const color = board[row][col];
    const visited = new Set();
    const checkGroup = (r, c) => {
      if (r < 0 || r >= boardSize || c < 0 || c >= boardSize) return false;
      if (visited.has(`${r},${c}`)) return false;
      if (board[r][c] === EMPTY) return true;
      if (board[r][c] !== color) return false;
      visited.add(`${r},${c}`);
      return checkGroup(r + 1, c) || checkGroup(r - 1, c) || checkGroup(r, c + 1) || checkGroup(r, c - 1);
    };
    return checkGroup(row, col);
  };

  const checkCaptures = (board, row, col, opponentColor) => {
    let captured = false;
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && board[newRow][newCol] === opponentColor) {
        if (!hasLiberties(board, newRow, newCol)) {
          captured = true;
          removeGroup(board, newRow, newCol);
        }
      }
    }
    return captured;
  };

  const removeGroup = (board, row, col) => {
    const color = board[row][col];
    if (color === EMPTY) return;
    const stack = [[row, col]];
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      if (r < 0 || r >= boardSize || c < 0 || c >= boardSize || board[r][c] !== color) continue;
      board[r][c] = EMPTY;
      stack.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
  };

  const handleClick = (row, col) => {
    if (gameOver) return;
    const validity = isValidMove(row, col);
    if (!validity.valid) {
      showIllegalMoveMsg(validity.reason || "This move is not allowed by the rules.");
      return;
    }
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = currentPlayer;
    // Check for captures
    const opponentColor = currentPlayer === BLACK ? WHITE : BLACK;
    checkCaptures(newBoard, row, col, opponentColor);
    setBoard(newBoard);
    setLastMove([row, col]);
    setCurrentPlayer(currentPlayer === BLACK ? WHITE : BLACK);
    setIllegalMoveMsg(""); // Clear any previous message
    // Reset consecutive passes when a move is made
    setConsecutivePasses(0);
    setLastPassPlayer(null);
  };

  const handlePass = () => {
    if (gameOver) return;
    
    // If this is the first pass or the same player is passing again
    if (consecutivePasses === 0 || lastPassPlayer === currentPlayer) {
      setConsecutivePasses(1);
      setLastPassPlayer(currentPlayer);
      setCurrentPlayer(currentPlayer === BLACK ? WHITE : BLACK);
      setIllegalMoveMsg(""); // Clear any previous message
    } 
    // If the opponent is passing after the first pass
    else if (consecutivePasses === 1 && lastPassPlayer !== currentPlayer) {
      setConsecutivePasses(2);
      setGameOver(true);
      setIllegalMoveMsg(""); // Clear any previous message
    }
  };

  const resetGame = () => {
    setBoard(Array(boardSize).fill().map(() => Array(boardSize).fill(EMPTY)));
    setCurrentPlayer(BLACK);
    setCapturedBlack(0);
    setCapturedWhite(0);
    setLastMove(null);
    setGameOver(false);
    setConsecutivePasses(0);
    setLastPassPlayer(null);
  };

  const handleBoardSizeChange = (size) => {
    setBoardSize(size);
  };

  // Helper to get pixel position for a given row/col
  const getXY = (row, col) => [PADDING + col * CELL, PADDING + row * CELL];

  // Helper: count stones for each player
  const countStones = () => {
    let black = 0, white = 0;
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === BLACK) black++;
        if (board[r][c] === WHITE) white++;
      }
    }
    return { black, white };
  };

  // Helper: territory scoring (simple flood fill)
  const getTerritory = () => {
    const visited = Array(boardSize).fill().map(() => Array(boardSize).fill(false));
    let blackTerritory = 0, whiteTerritory = 0;
    const directions = [[1,0],[-1,0],[0,1],[0,-1]];

    function floodFill(r, c) {
      let queue = [[r, c]];
      let territory = [[r, c]];
      let borderColors = new Set();
      visited[r][c] = true;
      while (queue.length) {
        const [cr, cc] = queue.pop();
        for (const [dr, dc] of directions) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) continue;
          if (board[nr][nc] === EMPTY && !visited[nr][nc]) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
            territory.push([nr, nc]);
          } else if (board[nr][nc] !== EMPTY) {
            borderColors.add(board[nr][nc]);
          }
        }
      }
      return { territory, borderColors };
    }

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] === EMPTY && !visited[r][c]) {
          const { territory, borderColors } = floodFill(r, c);
          if (borderColors.size === 1) {
            if (borderColors.has(BLACK)) blackTerritory += territory.length;
            if (borderColors.has(WHITE)) whiteTerritory += territory.length;
          }
        }
      }
    }
    return { blackTerritory, whiteTerritory };
  };

  const { black: blackStones, white: whiteStones } = countStones();
  let blackScore = blackStones + capturedBlack;
  let whiteScore = whiteStones + capturedWhite;
  let blackTerritory = 0, whiteTerritory = 0;
  if (gameOver) {
    const terr = getTerritory();
    blackTerritory = terr.blackTerritory;
    whiteTerritory = terr.whiteTerritory;
    blackScore += blackTerritory;
    whiteScore += whiteTerritory;
  }

  return (
    <div className="go-container">
      <div className="go-info">
        <h2>Go Game</h2>
        {illegalMoveMsg && (
          <div className="illegal-move-msg">{illegalMoveMsg}</div>
        )}
        <div className="board-size-selector">
          <button className={boardSize === BOARD_SIZES.SMALL ? 'active' : ''} onClick={() => handleBoardSizeChange(BOARD_SIZES.SMALL)}>9x9</button>
          <button className={boardSize === BOARD_SIZES.MEDIUM ? 'active' : ''} onClick={() => handleBoardSizeChange(BOARD_SIZES.MEDIUM)}>13x13</button>
          <button className={boardSize === BOARD_SIZES.LARGE ? 'active' : ''} onClick={() => handleBoardSizeChange(BOARD_SIZES.LARGE)}>19x19</button>
        </div>
        <p>Current Player: {currentPlayer === BLACK ? 'Black' : 'White'}</p>
        <p>Black Stones: {blackStones} | White Stones: {whiteStones}</p>
        <p>Captured Black: {capturedBlack} | Captured White: {capturedWhite}</p>
        {consecutivePasses > 0 && (
          <p className="pass-status">
            {consecutivePasses === 1 
              ? `${lastPassPlayer === BLACK ? 'Black' : 'White'} passed. ${currentPlayer === BLACK ? 'Black' : 'White'} to move or pass.`
              : 'Both players passed. Game ending...'
            }
          </p>
        )}
        {gameOver && (
          <>
            <p>Black Territory: {blackTerritory} | White Territory: {whiteTerritory}</p>
            <p><b>Final Score</b> - Black: {blackScore} | White: {whiteScore}</p>
            <p><b>{blackScore > whiteScore ? 'Black wins!' : blackScore < whiteScore ? 'White wins!' : 'It\'s a tie!'}</b></p>
          </>
        )}
        <button onClick={handlePass} disabled={gameOver}>
          {consecutivePasses === 1 && lastPassPlayer !== currentPlayer 
            ? 'Pass (End Game)' 
            : 'Pass'
          }
        </button>
        <button onClick={resetGame}>Reset Game</button>
      </div>
      <div
        className="go-board-canvas-wrapper"
        ref={containerRef}
        style={{ position: 'relative', width: '100%', maxWidth: 540, height: boardPx, margin: '0 auto' }}
      >
        <canvas
          ref={canvasRef}
          width={boardPx}
          height={boardPx}
          style={{ display: 'block', position: 'absolute', left: 0, top: 0, zIndex: 1, width: boardPx, height: boardPx }}
        />
        {/* Stones and click handlers */}
        {board.map((rowArr, rowIdx) =>
          rowArr.map((cell, colIdx) => {
            const [x, y] = getXY(rowIdx, colIdx);
            return (
              <React.Fragment key={`${rowIdx}-${colIdx}`}>
                {/* Clickable area */}
                <div
                  className="go-intersection"
                  style={{
                    position: 'absolute',
                    left: x - STONE_RADIUS,
                    top: y - STONE_RADIUS,
                    width: STONE_RADIUS * 2,
                    height: STONE_RADIUS * 2,
                    zIndex: 2,
                    cursor: gameOver ? 'not-allowed' : 'pointer',
                    background: 'transparent',
                  }}
                  onClick={() => handleClick(rowIdx, colIdx)}
                />
                {/* Stone */}
                {cell !== EMPTY && (
                  <div
                    className={`go-stone ${cell === BLACK ? 'black' : 'white'}`}
                    style={{
                      position: 'absolute',
                      left: x - STONE_RADIUS,
                      top: y - STONE_RADIUS,
                      width: STONE_RADIUS * 2,
                      height: STONE_RADIUS * 2,
                      zIndex: 3,
                    }}
                  />
                )}
                {/* Last move marker */}
                {lastMove && lastMove[0] === rowIdx && lastMove[1] === colIdx && (
                  <div
                    className="go-last-move-dot"
                    style={{
                      position: 'absolute',
                      left: x - 4,
                      top: y - 4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'red',
                      zIndex: 4,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Go; 