const express = require('express');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const router = express.Router();

const PROVINCIAS_FILE = path.join(__dirname, '../data/visited_provincias.yaml');

function readProvincias() {
  if (!fs.existsSync(PROVINCIAS_FILE)) {
    fs.writeFileSync(PROVINCIAS_FILE, yaml.dump({}));
    return {};
  }
  return yaml.load(fs.readFileSync(PROVINCIAS_FILE, 'utf8')) || {};
}

function writeProvincias(data) {
  fs.writeFileSync(PROVINCIAS_FILE, yaml.dump(data));
}

router.get('/:user', (req, res) => {
  const data = readProvincias();
  const user = req.params.user;
  res.json({ provincias: data[user] || [] });
});

router.post('/:user', (req, res) => {
  const data = readProvincias();
  const user = req.params.user;
  data[user] = req.body.provincias;
  writeProvincias(data);
  res.json({ success: true });
});

module.exports = router; 