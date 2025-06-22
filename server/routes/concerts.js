const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const router = express.Router();

const CONCERTS_FILE = path.join(__dirname, '../data/concerts.yaml');

function readConcerts() {
  if (!fs.existsSync(CONCERTS_FILE)) {
    return { 'default-user': [] };
  }
  return yaml.load(fs.readFileSync(CONCERTS_FILE, 'utf8')) || { 'default-user': [] };
}

// GET all concerts with optional search
router.get('/', (req, res) => {
  try {
    const data = readConcerts();
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';
    
    // Get all concerts from all users
    let allConcerts = [];
    Object.keys(data).forEach(user => {
      if (Array.isArray(data[user])) {
        allConcerts = allConcerts.concat(data[user]);
      }
    });
    
    // Filter by search query if provided
    if (searchQuery) {
      allConcerts = allConcerts.filter(concert => 
        concert.concert && concert.concert.toLowerCase().includes(searchQuery)
      );
    }
    
    res.json({
      concerts: allConcerts,
      total: allConcerts.length,
      searchQuery: searchQuery || null
    });
  } catch (error) {
    console.error('Error reading concerts:', error);
    res.status(500).json({ error: 'Failed to read concerts data' });
  }
});

// GET concerts for a specific user
router.get('/:user', (req, res) => {
  try {
    const data = readConcerts();
    const user = req.params.user;
    const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';
    
    const userConcerts = data[user] || [];
    
    // Filter by search query if provided
    let filteredConcerts = userConcerts;
    if (searchQuery) {
      filteredConcerts = userConcerts.filter(concert => 
        concert.concert && concert.concert.toLowerCase().includes(searchQuery)
      );
    }
    
    res.json({
      concerts: filteredConcerts,
      total: filteredConcerts.length,
      searchQuery: searchQuery || null
    });
  } catch (error) {
    console.error('Error reading concerts for user:', error);
    res.status(500).json({ error: 'Failed to read concerts data' });
  }
});

module.exports = router; 