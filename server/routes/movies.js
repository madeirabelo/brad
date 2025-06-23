const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const router = express.Router();

const MOVIES_FILE = path.join(__dirname, '../data/movies.yaml');

function readMovies() {
  if (!fs.existsSync(MOVIES_FILE)) {
    return { 'default-user': [] };
  }
  return yaml.load(fs.readFileSync(MOVIES_FILE, 'utf8')) || { 'default-user': [] };
}

// GET all movies with optional search
router.get('/', (req, res) => {
  try {
    const data = readMovies();
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';
    
    // Get all movies from all users
    let allMovies = [];
    Object.keys(data).forEach(user => {
      if (Array.isArray(data[user])) {
        allMovies = allMovies.concat(data[user]);
      }
    });
    
    // Filter by search query if provided
    if (searchQuery) {
      allMovies = allMovies.filter(movie => 
        movie.movie && movie.movie.toLowerCase().includes(searchQuery)
      );
    }
    
    res.json({
      movies: allMovies,
      total: allMovies.length,
      searchQuery: searchQuery || null
    });
  } catch (error) {
    console.error('Error reading movies:', error);
    res.status(500).json({ error: 'Failed to read movies data' });
  }
});

// GET movies for a specific user
router.get('/:user', (req, res) => {
  try {
    const data = readMovies();
    const user = req.params.user;
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';
    
    const userMovies = data[user] || [];
    
    // Filter by search query if provided
    let filteredMovies = userMovies;
    if (searchQuery) {
      filteredMovies = userMovies.filter(movie => 
        movie.movie && movie.movie.toLowerCase().includes(searchQuery)
      );
    }
    
    res.json({
      movies: filteredMovies,
      total: filteredMovies.length,
      searchQuery: searchQuery || null
    });
  } catch (error) {
    console.error('Error reading movies for user:', error);
    res.status(500).json({ error: 'Failed to read movies data' });
  }
});

module.exports = router; 