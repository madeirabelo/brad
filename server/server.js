const express = require('express');
const cors = require('cors');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Path to the YAML file
const DATA_FILE = path.join(__dirname, 'data', 'visited_countries.yaml');

// Ensure the data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Ensure the YAML file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, yaml.dump({ users: {} }));
}

// Helper functions to read/write YAML
const readData = () => {
  try {
    const fileContents = fs.readFileSync(DATA_FILE, 'utf8');
    return yaml.load(fileContents) || { users: {} };
  } catch (error) {
    console.error('Error reading YAML file:', error);
    return { users: {} };
  }
};

const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, yaml.dump(data));
    return true;
  } catch (error) {
    console.error('Error writing YAML file:', error);
    return false;
  }
};

// Routes
app.get('/api/visited-countries/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const data = readData();
    
    if (!data.users[userId]) {
      data.users[userId] = { countries: [], lastUpdated: new Date().toISOString() };
      writeData(data);
    }
    
    res.json(data.users[userId]);
  } catch (error) {
    console.error('Error fetching visited countries:', error);
    res.status(500).json({ error: 'Failed to fetch visited countries' });
  }
});

app.post('/api/visited-countries/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { countries } = req.body;
    
    const data = readData();
    data.users[userId] = {
      countries,
      lastUpdated: new Date().toISOString()
    };
    
    if (writeData(data)) {
      res.json(data.users[userId]);
    } else {
      res.status(500).json({ error: 'Failed to save visited countries' });
    }
  } catch (error) {
    console.error('Error updating visited countries:', error);
    res.status(500).json({ error: 'Failed to update visited countries' });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the API at http://192.168.31.33:${PORT}/api`);
}); 