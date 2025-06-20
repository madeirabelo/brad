const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const router = express.Router();

const COUNTRIES_FILE = path.join(__dirname, '../data/visited_countries.yaml');

function readCountries() {
  if (!fs.existsSync(COUNTRIES_FILE)) {
    fs.writeFileSync(COUNTRIES_FILE, yaml.dump({ users: {} }));
    return { users: {} };
  }
  return yaml.load(fs.readFileSync(COUNTRIES_FILE, 'utf8')) || { users: {} };
}

function writeCountries(data) {
  fs.writeFileSync(COUNTRIES_FILE, yaml.dump(data));
}

// GET visited countries for a user
router.get('/:user', (req, res) => {
  const data = readCountries();
  const user = req.params.user;
  const userData = (data.users && data.users[user]) || { countries: [], lastUpdated: null };
  res.json(userData);
});

// POST/PUT to update visited countries for a user
router.post('/:user', (req, res) => {
  const data = readCountries();
  const user = req.params.user;
  if (!data.users) data.users = {};
  data.users[user] = {
    countries: req.body.countries || [],
    lastUpdated: new Date().toISOString()
  };
  writeCountries(data);
  res.json({ success: true });
});

module.exports = router;