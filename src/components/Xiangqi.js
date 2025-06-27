import React, { useState, useRef, useEffect } from 'react';
import './Xiangqi.css';

const BOARD_ROWS = 10;
const BOARD_COLS = 9;
const DEFAULT_BOARD_PX = 432; // 48*9

// Piece codes: r=rook, n=knight, b=elephant, a=advisor, k=general, c=cannon, p=pawn
// Red is uppercase, Black is lowercase
const initialBoard = [
  ['r','n','b','a','k','a','b','n','r'], // 10 (Black)
  [null,null,null,null,null,null,null,null,null], // 9
  [null,'c',null,null,null,null,null,'c',null], // 8
  ['p',null,'p',null,'p',null,'p',null,'p'], // 7
  [null,null,null,null,null,null,null,null,null], // 6
  [null,null,null,null,null,null,null,null,null], // 5
  ['P',null,'P',null,'P',null,'P',null,'P'], // 4
  [null,'C',null,null,null,null,null,'C',null], // 3
  [null,null,null,null,null,null,null,null,null], // 2
  ['R','N','B','A','K','A','B','N','R'], // 1 (Red)
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
  const [hoveredPosition, setHoveredPosition] = useState(null); // {row, col, coord}

  const MARGIN = CELL_SIZE * 0.8;
  const SVG_W = BOARD_W + 2 * MARGIN;
  const SVG_H = BOARD_H + 2 * MARGIN;

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

  // Convert board position to coordinate notation
  const getCoordinate = (row, col) => {
    const rowNum = BOARD_ROWS - row;
    const colLetter = String.fromCharCode(97 + col);
    return `${colLetter}${rowNum}`;
  };

  return (
    <div className="xiangqi-container">
      <h2>Xiangqi - Chinese Chess</h2>
      <div className="xiangqi-info">
        <p>Turn: <span className={turn}>{turn === 'red' ? 'Red' : 'Black'}</span></p>
        {message && <div className="xiangqi-message">{message}</div>}
        {hoveredPosition && (
          <div className="xiangqi-coordinate-display">
            Position: <strong>{hoveredPosition.coord}</strong> (Row {hoveredPosition.row + 1}, Col {hoveredPosition.col + 1})
          </div>
        )}
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
      <div className="xiangqi-vertical-stack">
        <div ref={containerRef} style={{ width: SVG_W, minWidth: SVG_W, maxWidth: SVG_W, margin: '0 auto' }}>
          <div className="xiangqi-board-svg-wrapper" style={{ position: 'relative', width: SVG_W, minWidth: SVG_W, maxWidth: SVG_W, height: SVG_H }}>
            <svg width={SVG_W} height={SVG_H} className="xiangqi-svg-board" style={{ position: 'absolute', left: 0, top: 0, zIndex: 1, width: SVG_W, height: SVG_H }}>
              {/* Row numbers (1-10) on the left side */}
              {[...Array(BOARD_ROWS)].map((_, r) => (
                <text
                  key={`row-${r}`}
                  x={MARGIN * 0.4}
                  y={MARGIN + r * CELL_SIZE + CELL_SIZE/2}
                  fontSize={CELL_SIZE * 0.28}
                  fill="#8B4513"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {BOARD_ROWS - r}
                </text>
              ))}
              {/* Column letters (a-i) on the top */}
              {[...Array(BOARD_COLS)].map((_, c) => (
                <text
                  key={`col-${c}`}
                  x={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                  y={MARGIN * 0.4}
                  fontSize={CELL_SIZE * 0.28}
                  fill="#8B4513"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {String.fromCharCode(97 + c)}
                </text>
              ))}
              {/* Row numbers (1-10) on the right side */}
              {[...Array(BOARD_ROWS)].map((_, r) => (
                <text
                  key={`row-right-${r}`}
                  x={SVG_W - MARGIN * 0.4}
                  y={MARGIN + r * CELL_SIZE + CELL_SIZE/2}
                  fontSize={CELL_SIZE * 0.28}
                  fill="#8B4513"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {BOARD_ROWS - r}
                </text>
              ))}
              {/* Column letters (a-i) on the bottom */}
              {[...Array(BOARD_COLS)].map((_, c) => (
                <text
                  key={`col-bottom-${c}`}
                  x={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                  y={SVG_H - MARGIN * 0.4}
                  fontSize={CELL_SIZE * 0.28}
                  fill="#8B4513"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {String.fromCharCode(97 + c)}
                </text>
              ))}
              {/* Horizontal lines */}
              {[...Array(BOARD_ROWS)].map((_, r) => (
                <line
                  key={'h'+r}
                  x1={MARGIN + CELL_SIZE/2}
                  y1={MARGIN + r * CELL_SIZE + CELL_SIZE/2}
                  x2={SVG_W - MARGIN - CELL_SIZE/2}
                  y2={MARGIN + r * CELL_SIZE + CELL_SIZE/2}
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
                    x1={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                    y1={MARGIN + CELL_SIZE/2}
                    x2={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                    y2={SVG_H - MARGIN - CELL_SIZE/2}
                    stroke="#b8860b"
                    strokeWidth={2}
                  />
                ) : (
                  <g key={'v'+c}>
                    {/* Top part */}
                    <line
                      x1={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                      y1={MARGIN + CELL_SIZE/2}
                      x2={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                      y2={MARGIN + CELL_SIZE * 4.5}
                      stroke="#b8860b"
                      strokeWidth={2}
                    />
                    {/* Bottom part */}
                    <line
                      x1={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                      y1={MARGIN + CELL_SIZE * 5.5}
                      x2={MARGIN + c * CELL_SIZE + CELL_SIZE/2}
                      y2={SVG_H - MARGIN - CELL_SIZE/2}
                      stroke="#b8860b"
                      strokeWidth={2}
                    />
                  </g>
                )
              ))}
              {/* Palace diagonals (classic color) */}
              {/* Black palace (top) */}
              <line x1={MARGIN + 3*CELL_SIZE+CELL_SIZE/2} y1={MARGIN + CELL_SIZE/2} x2={MARGIN + 5*CELL_SIZE+CELL_SIZE/2} y2={MARGIN + 2*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              <line x1={MARGIN + 5*CELL_SIZE+CELL_SIZE/2} y1={MARGIN + CELL_SIZE/2} x2={MARGIN + 3*CELL_SIZE+CELL_SIZE/2} y2={MARGIN + 2*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              {/* Red palace (bottom) */}
              <line x1={MARGIN + 3*CELL_SIZE+CELL_SIZE/2} y1={MARGIN + 7*CELL_SIZE+CELL_SIZE/2} x2={MARGIN + 5*CELL_SIZE+CELL_SIZE/2} y2={MARGIN + 9*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              <line x1={MARGIN + 5*CELL_SIZE+CELL_SIZE/2} y1={MARGIN + 7*CELL_SIZE+CELL_SIZE/2} x2={MARGIN + 3*CELL_SIZE+CELL_SIZE/2} y2={MARGIN + 9*CELL_SIZE+CELL_SIZE/2} stroke="#b8860b" strokeWidth={2}/>
              {/* River text (centered both horizontally and vertically in the river band, slightly lower) */}
              <text x={SVG_W/2} y={MARGIN + 5*CELL_SIZE} fontSize="28" fill="#b8860b" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">楚河漢界</text>
            </svg>
            {/* Pieces and click handlers */}
            <div style={{ position: 'absolute', left: MARGIN, top: MARGIN, zIndex: 2, width: BOARD_W, height: BOARD_H }}>
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
                        onMouseEnter={() => setHoveredPosition({row, col, coord: getCoordinate(row, col)})}
                        onMouseLeave={() => setHoveredPosition(null)}
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
        <div className="xiangqi-piece-list">
          <h3>Piece Names</h3>
          <table>
            <thead>
              <tr>
                <th>Abbr.</th>
                <th>Chinese</th>
                <th>Pinyin</th>
                <th>English</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>G</td><td>帥 / 將</td><td>shuài / jiàng</td><td>King (General/Marshal)</td></tr>
              <tr><td>A</td><td>仕 / 士</td><td>shì</td><td>Advisor (Guard)</td></tr>
              <tr><td>E</td><td>相 / 象</td><td>xiàng</td><td>Elephant (Minister)</td></tr>
              <tr><td>H</td><td>馬</td><td>mǎ</td><td>Horse (Knight)</td></tr>
              <tr><td>R</td><td>車</td><td>jū</td><td>Chariot (Rook)</td></tr>
              <tr><td>C</td><td>炮 / 砲</td><td>pào</td><td>Cannon</td></tr>
              <tr><td>S</td><td>兵 / 卒</td><td>bīng / zú</td><td>Pawn (Soldier)</td></tr>
            </tbody>
          </table>
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
        <div className="xiangqi-coordinate-panel">
          <h3>Coordinate System</h3>
          <p>The board uses a coordinate system with:</p>
          <ul>
            <li><strong>Columns:</strong> Letters a-i (left to right)</li>
            <li><strong>Rows:</strong> Numbers 1-10 (bottom to top)</li>
            <li><strong>Notation:</strong> Column letter + Row number (e.g., "e5")</li>
          </ul>
          <div className="coordinate-examples">
            <h4>Key Positions:</h4>
            <ul>
              <li><strong>Red General:</strong> e10 (Red palace center)</li>
              <li><strong>Black General:</strong> e1 (Black palace center)</li>
              <li><strong>River:</strong> Between rows 5 and 6</li>
              <li><strong>Red Palace:</strong> Rows 8-10, Columns d-f</li>
              <li><strong>Black Palace:</strong> Rows 1-3, Columns d-f</li>
            </ul>
          </div>
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