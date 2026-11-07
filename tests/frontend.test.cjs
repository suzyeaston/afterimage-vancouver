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

test('org constellation is separated from the hiring and geographic layers', () => {
  const html=read('index.html');
  const js=read('assets/app.js');
  const css=read('assets/style.css');
  assert.match(html, /id="org-network-toggle"/);
  assert.match(html, /id="org-network-layer"/);
  assert.match(html, /id="organization-list"/);
  assert.match(js, /data\/organizations\.json/);
  assert.match(js, /renderOrganizationGraph/);
  assert.match(js, /orgPositions/);
  assert.match(js, /NOT A JOB LISTING/);
  assert.match(js, /POSITIONS ARE CONCEPTUAL, NOT LOCATIONS/);
  assert.match(css, /org-network-layer\[hidden\]/);
});

test('published snapshot includes attributed organization graph', () => {
  const manifest=read('.github/workflows/publish.yml');
  assert.match(manifest,/data\/organizations\.json/);
  const data=JSON.parse(read('data/organizations.json'));
  assert.equal(data.organizations.length,20);
  assert.equal(data.links.length,16);
  assert.equal(data.source.licence,'CC BY 4.0');
});


test('BC AI Compass runs as a distinct organization-only layer with provenance', () => {
  const html=read('index.html');
  const js=read('assets/app.js');
  const data=JSON.parse(read('data/compass.json'));
  assert.match(html,/id="compass-toggle"/);
  assert.match(html,/id="compass-panel"/);
  assert.match(html,/id="compass-category"/);
  assert.match(html,/id="compass-local-only"/);
  assert.match(js,/data\/compass\.json/);
  assert.match(js,/compassLocationGroups/);
  assert.match(js,/MUNICIPAL CENTROID \/ NOT AN OFFICE ADDRESS/);
  assert.match(js,/DOCUMENTED ORG \/ NOT A JOB POSTING/);
  assert.match(js,/Source-checked ≠ verified currently hiring/);
  assert.match(html,/bc-aicompass\.ca/);
  assert.equal(data.count,99);
  assert.equal(data.source.licence,'CC BY 4.0');
});

test('Compass JSON is included in GitHub Pages deployment and not mixed with employer records', () => {
  const workflow=read('.github/workflows/publish.yml');
  assert.match(workflow,/data\/compass\.json/);
  const js=read('assets/app.js');
  assert.match(js,/compassMode/);
  assert.match(js,/app\.compassLayer/);
  assert.match(js,/app\.map\.removeLayer\(marker\)/);
});


test('curated same-entity Compass links do not imply current partnerships',()=>{
  const js=read('assets/app.js');
  const data=JSON.parse(read('data/compass.json'));
  assert.equal(data.crosswalk.length,4);
  assert.match(js,/data-compass-crosswalk/);
  assert.match(js,/data-observer-crosswalk/);
  assert.match(js,/navigateToCompass/);
  assert.match(js,/navigateToObserver/);
  assert.match(js,/NOT PROOF OF A CURRENT RELATIONSHIP/);
});
