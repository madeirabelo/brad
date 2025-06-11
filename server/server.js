const express = require('express');
const cors = require('cors');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const app = express();
const port = process.env.PORT || 5050;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Create data directory if it doesn't exist
const GAMES_DIR = path.join(__dirname, 'data', 'chess');
if (!fs.existsSync(GAMES_DIR)) {
  fs.mkdirSync(GAMES_DIR, { recursive: true });
}

// Clean up old game files
const cleanupOldGames = () => {
  try {
    console.log('=== Cleaning Up Old Games ===');
    const files = fs.readdirSync(GAMES_DIR);
    let deletedCount = 0;
    
    files.forEach(file => {
      if (file.endsWith('.yaml')) {
        const filePath = path.join(GAMES_DIR, file);
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    console.log(`Deleted ${deletedCount} old game files`);
    console.log('===========================');
  } catch (error) {
    console.error('Error cleaning up old games:', error);
  }
};

// Clean up on startup
cleanupOldGames();

// Store game states in memory
const gameStates = {};

// Load existing games
try {
  const files = fs.readdirSync(GAMES_DIR);
  files.forEach(file => {
    if (file.endsWith('.yaml')) {
      const gameKey = file.replace('.yaml', '');
      const content = fs.readFileSync(path.join(GAMES_DIR, file), 'utf8');
      const gameData = yaml.load(content);
      gameStates[gameKey] = gameData;
    }
  });
  console.log('=== Server Startup ===');
  console.log('Loaded existing games:', Object.keys(gameStates));
  console.log('=====================');
} catch (error) {
  console.error('Error loading existing games:', error);
}

// Helper function to save game state
const saveGameState = (gameKey, gameState) => {
  try {
    const gameData = {
      gameKey,
      ...gameState
    };
    const yamlContent = yaml.dump(gameData);
    const filePath = path.join(GAMES_DIR, `${gameKey}.yaml`);
    fs.writeFileSync(filePath, yamlContent);
    console.log('=== Game State Saved ===');
    console.log('Game Key:', gameKey);
    console.log('File Path:', filePath);
    console.log('Status:', gameState.status);
    console.log('=======================');
    return true;
  } catch (error) {
    console.error('Error saving game state:', error);
    return false;
  }
};

// Helper function to load game state
const loadGameState = (gameKey) => {
  try {
    const filePath = path.join(GAMES_DIR, `${gameKey}.yaml`);
    if (!fs.existsSync(filePath)) {
      console.log('=== Game Not Found ===');
      console.log('Game Key:', gameKey);
      console.log('File Path:', filePath);
      console.log('=====================');
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const gameData = yaml.load(content);
    console.log('=== Game State Loaded ===');
    console.log('Game Key:', gameKey);
    console.log('Status:', gameData.status);
    console.log('========================');
    return gameData;
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
};

// Helper function to delete game state
const deleteGameState = (gameKey) => {
  try {
    // Remove from memory
    delete gameStates[gameKey];
    
    // Remove from disk
    const filePath = path.join(GAMES_DIR, `${gameKey}.yaml`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('=== Game State Deleted ===');
      console.log('Game Key:', gameKey);
      console.log('File Path:', filePath);
      console.log('========================');
    }
    return true;
  } catch (error) {
    console.error('Error deleting game state:', error);
    return false;
  }
};

// Create new game
app.post('/api/chess/games', (req, res) => {
  try {
    console.log('=== Creating New Game ===');
    const gameKey = Math.random().toString(36).substring(2, 8);
    const initialGameState = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: [],
      capturedPieces: { w: [], b: [] },
      status: 'waiting',
      lastUpdated: new Date().toISOString()
    };

    // Validate the FEN string
    const chess = new Chess(initialGameState.fen);
    if (!chess.fen()) {
      throw new Error('Invalid FEN string');
    }

    // Save to memory and file
    gameStates[gameKey] = initialGameState;
    if (!saveGameState(gameKey, initialGameState)) {
      throw new Error('Failed to save game state');
    }

    console.log('Game Key:', gameKey);
    console.log('Status: waiting');
    console.log('=====================');
    res.json({ gameKey, ...initialGameState });
  } catch (error) {
    console.error('Error creating new game:', error);
    res.status(500).json({ error: error.message || 'Failed to create new game' });
  }
});

// Get game state
app.get('/api/chess/games/:gameKey', (req, res) => {
  const { gameKey } = req.params;
  console.log('=== Getting Game State ===');
  console.log('Game Key:', gameKey);
  
  try {
    // First check memory
    if (gameStates[gameKey]) {
      console.log('Found in memory');
      console.log('Status:', gameStates[gameKey].status);
      console.log('=====================');
      return res.json(gameStates[gameKey]);
    }

    // If not in memory, try to load from file
    const gameState = loadGameState(gameKey);
    if (gameState) {
      console.log('Loaded from file');
      console.log('Status:', gameState.status);
      console.log('=====================');
      gameStates[gameKey] = gameState;
      return res.json(gameState);
    }

    console.log('Game not found');
    console.log('=====================');
    return res.status(404).json({ 
      error: 'Game not found',
      message: `No game found with key: ${gameKey}`
    });
  } catch (error) {
    console.error('Error getting game state:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve game state'
    });
  }
});

// Update game state
app.put('/api/chess/games/:gameKey', (req, res) => {
  const { gameKey } = req.params;
  const gameState = req.body;

  console.log('=== Updating Game State ===');
  console.log('Game Key:', gameKey);
  console.log('Status:', gameState.status);
  console.log('Last Move:', gameState.lastMove);

  try {
    // First check if game exists in memory or file
    if (!gameStates[gameKey]) {
      const loadedState = loadGameState(gameKey);
      if (!loadedState) {
        console.log('Game not found');
        console.log('=====================');
        return res.status(404).json({ 
          error: 'Game not found',
          message: `No game found with key: ${gameKey}`
        });
      }
      gameStates[gameKey] = loadedState;
    }

    // If this is a join request, validate the game state
    if (gameState.status === 'playing' && gameStates[gameKey].status === 'waiting') {
      console.log('Player joining game');
      
      // Create a new game state that preserves the existing game data
      const updatedGameState = {
        ...gameStates[gameKey],
        status: 'playing',
        lastUpdated: new Date().toISOString()
      };

      // Save to memory and file
      gameStates[gameKey] = updatedGameState;
      if (!saveGameState(gameKey, updatedGameState)) {
        throw new Error('Failed to save game state');
      }

      console.log('Game state updated for joining player');
      console.log('=====================');
      return res.json(updatedGameState);
    }

    // For move updates, validate the FEN string
    if (!gameState.fen) {
      console.log('Invalid game state: missing FEN');
      console.log('=====================');
      return res.status(400).json({ 
        error: 'Invalid game state',
        message: 'Game state must include a FEN string'
      });
    }

    // Validate the FEN string
    const chess = new Chess(gameState.fen);
    if (!chess.fen()) {
      console.log('Invalid FEN string');
      console.log('=====================');
      return res.status(400).json({ 
        error: 'Invalid FEN string',
        message: 'The provided FEN string is invalid'
      });
    }

    // Update the game state
    const updatedGameState = {
      ...gameStates[gameKey],
      fen: gameState.fen,
      moves: gameState.moves || [],
      capturedPieces: gameState.capturedPieces || { w: [], b: [] },
      status: gameState.status || 'playing',
      lastMove: gameState.lastMove,
      lastUpdated: new Date().toISOString()
    };

    // Validate the move history
    const moveHistoryChess = new Chess();
    for (const move of updatedGameState.moves) {
      try {
        moveHistoryChess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion
        });
      } catch (error) {
        console.error('Invalid move in history:', error);
        console.log('=====================');
        return res.status(400).json({ 
          error: 'Invalid move history',
          message: 'The move history contains invalid moves'
        });
      }
    }

    // Verify that the FEN matches the move history
    if (moveHistoryChess.fen() !== updatedGameState.fen) {
      console.error('FEN does not match move history');
      console.log('Move history FEN:', moveHistoryChess.fen());
      console.log('Provided FEN:', updatedGameState.fen);
      console.log('=====================');
      return res.status(400).json({ 
        error: 'FEN does not match move history',
        message: 'The provided FEN string does not match the move history'
      });
    }

    // Check if the game is finished
    if (chess.isGameOver()) {
      console.log('Game is finished');
      updatedGameState.status = 'finished';
      updatedGameState.result = chess.isCheckmate() ? 'checkmate' : 
                              chess.isDraw() ? 'draw' : 
                              chess.isStalemate() ? 'stalemate' : 
                              chess.isThreefoldRepetition() ? 'repetition' : 
                              chess.isInsufficientMaterial() ? 'insufficient' : 
                              'unknown';
      
      // Delete the game after a delay to allow clients to receive the final state
      setTimeout(() => {
        deleteGameState(gameKey);
      }, 5000); // Wait 5 seconds before deleting
    }

    // Save to memory and file
    gameStates[gameKey] = updatedGameState;
    if (!saveGameState(gameKey, updatedGameState)) {
      throw new Error('Failed to save game state');
    }

    console.log('Game state updated successfully');
    console.log('=====================');
    res.json(updatedGameState);
  } catch (error) {
    console.error('Error updating game state:', error);
    console.log('=====================');
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update game state'
    });
  }
});

// Delete game
app.delete('/api/chess/games/:gameKey', (req, res) => {
  const { gameKey } = req.params;
  console.log('Deleting game:', gameKey);

  if (!gameStates[gameKey]) {
    console.log('Game not found:', gameKey);
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    // Delete from memory
    delete gameStates[gameKey];

    // Delete file
    const filePath = path.join(GAMES_DIR, `${gameKey}.yaml`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log('Game deleted successfully');
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port}/api`);
  // Log all available IP addresses
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  console.log('Available IP addresses:');
  for (const [name, addresses] of Object.entries(results)) {
    console.log(`${name}:`);
    addresses.forEach(addr => {
      console.log(`  http://${addr}:${port}/api`);
    });
  }
}); 