import React, { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { API_URL } from '../config';
import './Chess.css';

const API_URL_CHESS = `${API_URL}/chess`;

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState([]);
  const [boardTheme, setBoardTheme] = useState('default');
  const [capturedPieces, setCapturedPieces] = useState({ w: [], b: [] });
  const [boardWidth, setBoardWidth] = useState(600);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing
  const [gameKey, setGameKey] = useState(null);
  const [playerColor, setPlayerColor] = useState('w');
  const [isWaiting, setIsWaiting] = useState(true);
  const [gameKeyToJoin, setGameKeyToJoin] = useState('');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setBoardWidth(width - 80);
      } else if (width < 768) {
        setBoardWidth(Math.min(width - 100, 380));
      } else if (width < 1024) {
        setBoardWidth(450);
      } else {
        setBoardWidth(600);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const createNewGame = async () => {
    try {
      const response = await fetch(`${API_URL_CHESS}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerColor: 'w',
          status: 'waiting'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const data = await response.json();
      console.log('Game created:', data);
      setGameKey(data.gameKey);
      setPlayerColor('w');
      setGameStatus('waiting');
      setIsWaiting(true);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game: ' + error.message);
    }
  };

  const joinGame = async (gameKey) => {
    try {
      console.log('Attempting to join game:', gameKey);
      
      // First check if the game exists
      const checkResponse = await fetch(`${API_URL_CHESS}/games/${gameKey}`);
      if (!checkResponse.ok) {
        throw new Error('Game not found');
      }

      const gameState = await checkResponse.json();
      console.log('Current game state:', gameState);

      if (gameState.status !== 'waiting') {
        throw new Error('This game is already in progress or has ended');
      }

      // Update the game state to join
      const response = await fetch(`${API_URL_CHESS}/games/${gameKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...gameState,
          playerColor: 'b',
          status: 'playing',
          lastUpdated: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join game');
      }

      const data = await response.json();
      console.log('Successfully joined game:', data);
      
      // Update local state
      setGameKey(gameKey);
      setPlayerColor('b');
      setGameStatus('playing');
      setIsWaiting(false);
      setGame(new Chess(data.fen));
      setMoveHistory(data.moves || []);
      setCapturedPieces(data.capturedPieces || { w: [], b: [] });

      return true;
    } catch (error) {
      console.error('Error joining game:', error);
      alert(error.message || 'Failed to join game');
      return false;
    }
  };

  const handleJoinGame = async () => {
    if (!gameKeyToJoin) {
      alert('Please enter a game key');
      return;
    }

    const success = await joinGame(gameKeyToJoin);
    if (success) {
      setGameKeyToJoin('');
    }
  };

  const startPolling = useCallback(() => {
    if (!gameKey) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log('Polling game state for game:', gameKey);
        const response = await fetch(`${API_URL_CHESS}/games/${gameKey}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('Game not found, stopping polling');
            clearInterval(pollInterval);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received game state update:', data);
        
        if (data) {
          // Update all game state components
          setGame(new Chess(data.fen));
          setMoveHistory(data.moves || []);
          setCapturedPieces(data.capturedPieces || { w: [], b: [] });
          setGameStatus(data.status || 'waiting');
          setIsWaiting(data.status === 'waiting');
        }
      } catch (error) {
        console.error('Error polling game state:', error);
        // Don't stop polling on temporary errors
        if (error.message.includes('Failed to fetch')) {
          console.log('Network error, will retry...');
        } else {
          console.error('Unexpected error during polling:', error);
        }
      }
    }, 1000);

    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  }, [gameKey]);

  // Effect to handle polling
  useEffect(() => {
    console.log('Setting up polling for game:', gameKey);
    const cleanup = startPolling();
    return () => {
      console.log('Cleaning up polling for game:', gameKey);
      cleanup?.();
    };
  }, [gameKey, startPolling]);

  const makeAMove = async (move) => {
    try {
      console.log('Making move:', move);
      const gameCopy = new Chess(game.fen());
      const result = gameCopy.move(move);
      
      if (result === null) {
        console.log('Invalid move');
        return false;
      }

      // Update local state first
      setGame(gameCopy);
      setMoveHistory([...moveHistory, result]);
      
      // Update captured pieces
      const newCapturedPieces = { ...capturedPieces };
      if (result.captured) {
        newCapturedPieces[result.color].push(result.captured);
        setCapturedPieces(newCapturedPieces);
      }

      // Send move to server
      const response = await fetch(`${API_URL_CHESS}/games/${gameKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fen: gameCopy.fen(),
          moves: [...moveHistory, result],
          capturedPieces: newCapturedPieces,
          status: gameCopy.isGameOver() ? 'finished' : 'playing',
          lastMove: result,
          lastUpdated: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update game state');
      }

      const updatedGameState = await response.json();
      console.log('Game state updated:', updatedGameState);

      // Update local state with server response
      setGame(new Chess(updatedGameState.fen));
      setMoveHistory(updatedGameState.moves || []);
      setCapturedPieces(updatedGameState.capturedPieces || { w: [], b: [] });
      setGameStatus(updatedGameState.status);
      setIsWaiting(updatedGameState.status === 'waiting');

      return true;
    } catch (error) {
      console.error('Error making move:', error);
      // Revert the move if it failed
      setGame(new Chess(game.fen()));
      return false;
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    try {
      console.log('Drop:', { sourceSquare, targetSquare });
      console.log('Current game state:', {
        isWaiting,
        gameStatus,
        playerColor,
        isWhiteTurn: game.turn() === 'w'
      });

      // Validate move
      if (isWaiting || gameStatus !== 'playing') {
        console.log('Cannot move: game is waiting or not in playing state');
        return false;
      }

      if (playerColor !== (game.turn() === 'w' ? 'w' : 'b')) {
        console.log('Cannot move: not your turn');
        return false;
      }

      const move = {
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      };

      return makeAMove(move);
    } catch (error) {
      console.error('Error in onDrop:', error);
      return false;
    }
  };

  const resetGame = async () => {
    if (gameKey) {
      try {
        await fetch(`${API_URL_CHESS}/games/${gameKey}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting game:', error);
      }
    }
    setGame(new Chess());
    setMoveHistory([]);
    setCapturedPieces({ w: [], b: [] });
    setGameStatus('waiting');
    setGameKey(null);
    setPlayerColor('w');
    setIsWaiting(true);
  };

  const getPieceSymbol = (piece) => {
    const symbols = {
      p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
      P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔'
    };
    return symbols[piece] || piece;
  };

  return (
    <div className="chess-container">
      <h1>Chess Game</h1>
      {!gameKey ? (
        <div className="game-setup">
          <button onClick={createNewGame} className="chess-button">Create New Game</button>
          <div className="join-game">
            <input 
              type="text" 
              placeholder="Enter Game Key" 
              className="game-key-input"
              value={gameKeyToJoin}
              onChange={(e) => setGameKeyToJoin(e.target.value)}
            />
            <button 
              onClick={handleJoinGame} 
              className="chess-button"
            >
              Join Game
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="game-info">
            <p>Game Key: {gameKey}</p>
            <p>You are playing as: {playerColor === 'w' ? 'White' : 'Black'}</p>
            {isWaiting && <p>Waiting for opponent to join...</p>}
            <p>Turn: {game.turn() === 'w' ? 'White' : 'Black'}</p>
            <p>Status: {game.isCheckmate() ? 'Checkmate!' : 
                       game.isDraw() ? 'Draw!' : 
                       game.isCheck() ? 'Check!' : 'Playing'}</p>
          </div>
          <div className="chess-controls">
            <button onClick={resetGame} className="chess-button">Reset Game</button>
            <select 
              value={boardTheme} 
              onChange={(e) => setBoardTheme(e.target.value)}
              className="theme-select"
            >
              {themes.map(theme => (
                <option key={theme.value} value={theme.value}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>
          <div className="chess-game-container">
            <div className="captured-pieces black">
              {capturedPieces.b.map((piece, index) => (
                <span key={index} className="captured-piece">
                  {getPieceSymbol(piece)}
                </span>
              ))}
            </div>
            <div className="chessboard-wrapper">
              <Chessboard
                position={game.fen()}
                onPieceDrop={onDrop}
                boardWidth={boardWidth}
                customBoardStyle={{
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
                }}
                customDarkSquareStyle={{ backgroundColor: getThemeColor(boardTheme, 'dark') }}
                customLightSquareStyle={{ backgroundColor: getThemeColor(boardTheme, 'light') }}
                boardOrientation={playerColor}
              />
            </div>
            <div className="captured-pieces white">
              {capturedPieces.w.map((piece, index) => (
                <span key={index} className="captured-piece">
                  {getPieceSymbol(piece)}
                </span>
              ))}
            </div>
          </div>
          <div className="move-history">
            <h3>Move History</h3>
            <div className="moves-list">
              {moveHistory.map((move, index) => (
                <div key={index} className="move-item">
                  <span className="move-number">{Math.floor(index / 2) + 1}.</span>
                  <span className={`move-piece ${move.color}`}>
                    {move.san}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const themes = [
  { name: 'Default', value: 'default' },
  { name: 'Brown', value: 'brown' },
  { name: 'Blue', value: 'blue' },
  { name: 'Green', value: 'green' },
  { name: 'Purple', value: 'purple' },
];

function getThemeColor(theme, squareType) {
  const themes = {
    default: {
      light: '#f0d9b5',
      dark: '#b58863'
    },
    brown: {
      light: '#e8c39e',
      dark: '#8b4513'
    },
    blue: {
      light: '#b0c4de',
      dark: '#4682b4'
    },
    green: {
      light: '#c8e6c9',
      dark: '#2e7d32'
    },
    purple: {
      light: '#e1bee7',
      dark: '#7b1fa2'
    }
  };
  return themes[theme][squareType];
}

export default ChessGame; 