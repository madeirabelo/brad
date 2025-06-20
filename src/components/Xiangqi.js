import React, { useState, useRef, useEffect } from 'react';
import './Xiangqi.css';

const BOARD_ROWS = 10;
const BOARD_COLS = 9;
const DEFAULT_BOARD_PX = 432; // 48*9

// Piece codes: r=rook, n=knight, b=elephant, a=advisor, k=general, c=cannon, p=pawn
// Red is uppercase, Black is lowercase
const initialBoard = [
  ['r','n','b','a','k','a','b','n','r'],
  [null,'c',null,null,null,null,null,'c',null],
  ['p',null,'p',null,'p',null,'p',null,'p'],
  [null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null,null], // extra row for river
  [null,null,null,null,null,null,null,null,null],
  ['P',null,'P',null,'P',null,'P',null,'P'],
  [null,'C',null,null,null,null,null,'C',null],
  ['R','N','B','A','K','A','B','N','R'],
];

const pieceNames = {
  r: '車', n: '馬', b: '象', a: '士', k: '將', c: '炮', p: '卒',
  R: '車', N: '馬', B: '相', A: '仕', K: '帥', C: '炮', P: '兵',
};

const pieceNamesPinyin = {
  r: 'jū', n: 'mǎ', b: 'xiàng', a: 'shì', k: 'jiàng', c: 'pào', p: 'zú',
  R: 'jū', N: 'mǎ', B: 'xiàng', A: 'shì', K: 'shuài', C: 'pào', P: 'bīng',
};

const pieceNamesEnglish = {
  r: 'Chariot', n: 'Horse', b: 'Elephant', a: 'Advisor', k: 'General', c: 'Cannon', p: 'Soldier',
  R: 'Chariot', N: 'Horse', B: 'Elephant', A: 'Advisor', K: 'General', C: 'Cannon', P: 'Soldier',
};

const isRed = (piece) => piece && piece === piece.toUpperCase();
const isBlack = (piece) => piece && piece === piece.toLowerCase();

function Xiangqi() {
  // Responsive board size
  const containerRef = useRef(null);
  const [boardPx, setBoardPx] = useState(DEFAULT_BOARD_PX);
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
  const CELL_SIZE = boardPx / BOARD_COLS;
  const BOARD_W = CELL_SIZE * BOARD_COLS;
  const BOARD_H = CELL_SIZE * BOARD_ROWS;

  const [board, setBoard] = useState(() => {
    // Deep copy for state
    return initialBoard.map(row => [...row]);
  });
  const [selected, setSelected] = useState(null); // {row, col}
  const [possibleMoves, setPossibleMoves] = useState([]); // Array of {row, col} positions
  const [tooltip, setTooltip] = useState(null); // {text, x, y}
  const [turn, setTurn] = useState('red'); // 'red' or 'black'
  const [message, setMessage] = useState('');
  const [capturedRed, setCapturedRed] = useState([]); // black captures red
  const [capturedBlack, setCapturedBlack] = useState([]); // red captures black

  // Check if a piece belongs to the current player
  const isOwnPiece = (piece) => {
    if (!piece) return false;
    return (turn === 'red' && isRed(piece)) || (turn === 'black' && isBlack(piece));
  };

  // Calculate all possible moves for a piece
  const calculatePossibleMoves = (row, col) => {
    const moves = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (canMove({row, col}, {row: r, col: c})) {
          moves.push({row: r, col: c});
        }
      }
    }
    return moves;
  };

  // Full move validation for each piece
  const canMove = (from, to) => {
    const piece = board[from.row][from.col];
    const target = board[to.row][to.col];
    if (!piece) return false;
    if (isOwnPiece(target)) return false;
    const dr = to.row - from.row;
    const dc = to.col - from.col;
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);
    const isRedPiece = isRed(piece);
    const isBlackPiece = isBlack(piece);
    // Palace boundaries
    const inPalace = (row, col, isRed) => {
      if (isRed) return row >= 7 && row <= 9 && col >= 3 && col <= 5;
      return row >= 0 && row <= 2 && col >= 3 && col <= 5;
    };
    // General
    if (piece === 'K' || piece === 'k') {
      if (!inPalace(to.row, to.col, isRedPiece)) return false;
      if ((absDr === 1 && dc === 0) || (absDc === 1 && dr === 0)) {
        // Check for flying general
        if (piece === 'K' || piece === 'k') {
          let col = from.col;
          let r = from.row + (isRedPiece ? -1 : 1);
          while (r >= 0 && r < BOARD_ROWS) {
            if (board[r][col] && board[r][col].toLowerCase() === 'k' && r !== to.row) return false;
            if (board[r][col] && r !== from.row) break;
            r += (isRedPiece ? -1 : 1);
          }
        }
        return true;
      }
      return false;
    }
    // Advisor
    if (piece === 'A' || piece === 'a') {
      if (!inPalace(to.row, to.col, isRedPiece)) return false;
      return absDr === 1 && absDc === 1;
    }
    // Elephant
    if (piece === 'B' || piece === 'b') {
      // Cannot cross river
      if (isRedPiece && to.row <= 4) return false;
      if (isBlackPiece && to.row >= 5) return false;
      if (absDr === 2 && absDc === 2) {
        // Cannot jump over pieces
        const midRow = from.row + dr / 2;
        const midCol = from.col + dc / 2;
        if (board[midRow][midCol]) return false;
        return true;
      }
      return false;
    }
    // Horse
    if (piece === 'N' || piece === 'n') {
      // L-shape: one orthogonal, one diagonal
      if ((absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2)) {
        // Check for blocking piece
        if (absDr === 2) {
          const blockRow = from.row + dr / 2;
          if (board[blockRow][from.col]) return false;
        } else {
          const blockCol = from.col + dc / 2;
          if (board[from.row][blockCol]) return false;
        }
        return true;
      }
      return false;
    }
    // Chariot
    if (piece === 'R' || piece === 'r') {
      if (dr !== 0 && dc !== 0) return false;
      // Check for blocking pieces
      if (dr === 0) {
        const step = dc > 0 ? 1 : -1;
        for (let c = from.col + step; c !== to.col; c += step) {
          if (board[from.row][c]) return false;
        }
      } else {
        const step = dr > 0 ? 1 : -1;
        for (let r = from.row + step; r !== to.row; r += step) {
          if (board[r][from.col]) return false;
        }
      }
      return true;
    }
    // Cannon
    if (piece === 'C' || piece === 'c') {
      if (dr !== 0 && dc !== 0) return false;
      let count = 0;
      if (dr === 0) {
        const step = dc > 0 ? 1 : -1;
        for (let c = from.col + step; c !== to.col; c += step) {
          if (board[from.row][c]) count++;
        }
      } else {
        const step = dr > 0 ? 1 : -1;
        for (let r = from.row + step; r !== to.row; r += step) {
          if (board[r][from.col]) count++;
        }
      }
      if (!target) {
        // Move: must not jump over any piece
        return count === 0;
      } else {
        // Capture: must jump over exactly one piece
        return count === 1;
      }
    }
    // Soldier
    if (piece === 'P' || piece === 'p') {
      // Red moves up, black moves down
      if (isRedPiece) {
        if (from.row <= 4) {
          // Crossed river: can move forward or sideways
          if ((dr === -1 && dc === 0) || (dr === 0 && absDc === 1)) return true;
        } else {
          // Not crossed river: only forward
          if (dr === -1 && dc === 0) return true;
        }
      } else {
        if (from.row >= 5) {
          // Crossed river: can move forward or sideways
          if ((dr === 1 && dc === 0) || (dr === 0 && absDc === 1)) return true;
        } else {
          // Not crossed river: only forward
          if (dr === 1 && dc === 0) return true;
        }
      }
      return false;
    }
    return false;
  };

  const handleCellClick = (row, col) => {
    setMessage('');
    const piece = board[row][col];
    
    // Show tooltip if clicking on a piece
    if (piece) {
      const pinyinName = pieceNamesPinyin[piece];
      const englishName = pieceNamesEnglish[piece];
      const tooltipText = `${pinyinName} (${englishName})`;
      setTooltip({
        text: tooltipText,
        x: 10, // Position on the left side
        y: 280  // Position to overlay the piece names table
      });
    }
    
    if (selected) {
      // Try to move
      if (selected.row === row && selected.col === col) {
        setSelected(null);
        setPossibleMoves([]);
        return;
      }
      if (canMove(selected, {row, col})) {
        const newBoard = board.map(r => [...r]);
        const movingPiece = board[selected.row][selected.col];
        const captured = board[row][col];
        newBoard[row][col] = movingPiece;
        newBoard[selected.row][selected.col] = null;
        // Track captured pieces
        if (captured) {
          if (isRed(captured)) {
            setCapturedRed(prev => [...prev, captured]);
          } else {
            setCapturedBlack(prev => [...prev, captured]);
          }
        }
        setBoard(newBoard);
        setSelected(null);
        setPossibleMoves([]);
        setTurn(turn === 'red' ? 'black' : 'red');
      } else {
        setMessage('Illegal move!');
      }
    } else {
      // Select a piece
      if (isOwnPiece(piece)) {
        setSelected({row, col});
        setPossibleMoves(calculatePossibleMoves(row, col));
      }
    }
  };

  return (
    <div className="xiangqi-container">
      <h2>Xiangqi - Chinese Chess</h2>
      <div className="xiangqi-info">
        <p>Turn: <span className={turn}>{turn === 'red' ? 'Red' : 'Black'}</span></p>
        {message && <div className="xiangqi-message">{message}</div>}
      </div>
      <div className="xiangqi-captured-row">
        <div className="xiangqi-captured black">
          <span>Black Captures:</span>
          {capturedRed.map((p, i) => (
            <span key={i} className="piece red">{pieceNames[p]}</span>
          ))}
        </div>
        <div className="xiangqi-captured red">
          <span>Red Captures:</span>
          {capturedBlack.map((p, i) => (
            <span key={i} className="piece black">{pieceNames[p]}</span>
          ))}
        </div>
      </div>
      {/* Board and piece names side by side */}
      <div className="xiangqi-flex-row">
        <div className="xiangqi-piece-list">
          <h3>Piece Names</h3>
          <table>
            <thead>
              <tr>
                <th>Chinese</th>
                <th>Pinyin</th>
                <th>English</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>帥 / 將</td><td>shuài / jiàng</td><td>General</td></tr>
              <tr><td>仕 / 士</td><td>shì</td><td>Advisor / Guard</td></tr>
              <tr><td>相 / 象</td><td>xiàng</td><td>Elephant / Minister</td></tr>
              <tr><td>馬</td><td>mǎ</td><td>Horse / Knight</td></tr>
              <tr><td>車</td><td>jū</td><td>Chariot / Rook</td></tr>
              <tr><td>炮 / 砲</td><td>pào</td><td>Cannon</td></tr>
              <tr><td>兵 / 卒</td><td>bīng / zú</td><td>Soldier / Pawn</td></tr>
            </tbody>
          </table>
        </div>
        <div ref={containerRef} style={{ width: '100%', maxWidth: 540 }}>
          <div className="xiangqi-board-svg-wrapper" style={{ position: 'relative', width: boardPx, height: boardPx }}>
            <svg width={BOARD_W} height={BOARD_H} className="xiangqi-svg-board" style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, width: BOARD_W, height: BOARD_H }}>
              {/* Horizontal lines */}
              {[...Array(BOARD_ROWS)].map((_, r) => (
                <line
                  key={'h'+r}
                  x1={CELL_SIZE/2}
                  y1={r * CELL_SIZE + CELL_SIZE/2}
                  x2={BOARD_W - CELL_SIZE/2}
                  y2={r * CELL_SIZE + CELL_SIZE/2}
                  stroke="#b8860b"
                  strokeWidth={2}
                />
              ))}
              {/* Vertical lines with river gap for columns 1-7 */}
              {[...Array(BOARD_COLS)].map((_, c) => (
                (c === 0 || c === BOARD_COLS-1) ? (
                  // First and last columns: draw full vertical line
                  <line
                    key={'v'+c}
                    x1={c * CELL_SIZE + CELL_SIZE/2}
                    y1={CELL_SIZE/2}
                    x2={c * CELL_SIZE + CELL_SIZE/2}
                    y2={BOARD_H - CELL_SIZE/2}
                    stroke="#b8860b"
                    strokeWidth={2}
                  />
                ) : (
                  <g key={'v'+c}>
                    {/* Top part */}
                    <line
                      x1={c * CELL_SIZE + CELL_SIZE/2}
                      y1={CELL_SIZE/2}
                      x2={c * CELL_SIZE + CELL_SIZE/2}
                      y2={CELL_SIZE * 4.5}
                      stroke="#b8860b"
                      strokeWidth={2}
                    />
                    {/* Bottom part */}
                    <line
                      x1={c * CELL_SIZE + CELL_SIZE/2}
                      y1={CELL_SIZE * 5.5}
                      x2={c * CELL_SIZE + CELL_SIZE/2}
                      y2={BOARD_H - CELL_SIZE/2}
                      stroke="#b8860b"
                      strokeWidth={2}
                    />
                  </g>
                )
              ))}
              {/* Palace diagonals (classic color) */}
              {/* Black palace (top) */}
              <line x1={3*CELL_SIZE+CELL_SIZE/2} y1={CELL_SIZE/2} x2={5*CELL_SIZE+CELL_SIZE/2} y2={2*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              <line x1={5*CELL_SIZE+CELL_SIZE/2} y1={CELL_SIZE/2} x2={3*CELL_SIZE+CELL_SIZE/2} y2={2*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              {/* Red palace (bottom) */}
              <line x1={3*CELL_SIZE+CELL_SIZE/2} y1={7*CELL_SIZE+CELL_SIZE/2} x2={5*CELL_SIZE+CELL_SIZE/2} y2={9*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              <line x1={5*CELL_SIZE+CELL_SIZE/2} y1={7*CELL_SIZE+CELL_SIZE/2} x2={3*CELL_SIZE+CELL_SIZE/2} y2={9*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              {/* River text (centered both horizontally and vertically in the river band, slightly lower) */}
              <text x={BOARD_W/2} y={5*CELL_SIZE} fontSize="28" fill="#b8860b" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">楚河漢界</text>
            </svg>
            {/* Pieces and click handlers */}
            <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 2, width: BOARD_W, height: BOARD_H }}>
              {Array.from({length: BOARD_ROWS}).map((_, row) => (
                <div className="xiangqi-row" key={row} style={{ height: CELL_SIZE }}>
                  {Array.from({length: BOARD_COLS}).map((_, col) => {
                    const piece = board[row][col];
                    const isSel = selected && selected.row === row && selected.col === col;
                    const isPossibleMove = possibleMoves.some(move => move.row === row && move.col === col);
                    return (
                      <div
                        className={`xiangqi-cell${isSel ? ' selected' : ''}${piece ? ' has-piece' : ''}${isPossibleMove ? ' possible-move' : ''}`}
                        key={col}
                        style={{ width: CELL_SIZE, height: CELL_SIZE, fontSize: CELL_SIZE * 0.7 }}
                        onClick={() => handleCellClick(row, col)}
                      >
                        {piece && <span className={`piece ${isRed(piece) ? 'red' : 'black'}`}>{pieceNames[piece]}</span>}
                        {isPossibleMove && !piece && (
                          <div className="possible-move-marker"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="xiangqi-rules-panel">
          <h3>Piece Movement Rules</h3>
          <ul>
            <li><b>帥 / 將 (shuài / jiàng, General):</b> Moves one point orthogonally within the palace. Cannot face the opposing general directly.</li>
            <li><b>仕 / 士 (shì, Advisor/Guard):</b> Moves one point diagonally within the palace.</li>
            <li><b>相 / 象 (xiàng, Elephant/Minister):</b> Moves exactly two points diagonally, cannot cross the river, cannot jump over intervening pieces.</li>
            <li><b>馬 (mǎ, Horse/Knight):</b> Moves one point orthogonally then one point diagonally outward. Blocked if the orthogonal point is occupied.</li>
            <li><b>車 (jū, Chariot/Rook):</b> Moves any number of points orthogonally (like a rook in chess).</li>
            <li><b>炮 / 砲 (pào, Cannon):</b> Moves like a chariot, but to capture must jump exactly one piece (the "screen").</li>
            <li><b>兵 / 卒 (bīng / zú, Soldier/Pawn):</b> Moves one point forward. After crossing the river, can also move one point horizontally.</li>
          </ul>
        </div>
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div 
          className="xiangqi-tooltip"
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 1000
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default Xiangqi; 