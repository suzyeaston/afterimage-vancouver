const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('map uses attributed OSM tiles without secret or paid CARTO tiles', () => {
  const js = read('assets/app.js');
  assert.match(js, /https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(js, /OpenStreetMap contributors/);
  assert.doesNotMatch(js, /basemaps\.cartocdn\.com/);
});

test('community is opt-in and never presented as current hiring', () => {
  const html = read('index.html');
  const js = read('assets/app.js');
  assert.match(html, /id="community-enabled" type="checkbox"/);
  assert.match(html, /RECLAIMED TRANSMISSIONS \/ NOT JOBS/);
  assert.match(js, /ARCHIVE RECEIVED/);
  assert.match(js, /NOT A JOB OPENING/);
  assert.match(js, /app\.showCommunity/);
  assert.match(js, /data\/community\.json/);
  assert.match(html, /creativecommons\.org\/licenses\/by\/4\.0/);
});

test('publisher includes the committed public community dataset', () => {
  const wf = read('.github/workflows/publish.yml');
  assert.match(wf, /data\/community\.json/);
});