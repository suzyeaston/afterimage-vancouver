const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('city futures always visible, sourced and not hidden in a switch',()=>{
  const page=read('index.html');
  for(const id of ['futures','futures-issues','futures-milestones','futures-news','futures-contacts','futures-horizon'])
    assert.match(page,new RegExp('id="'+id+'"'));
  assert.match(page,/city-futures\.js/);
  assert.doesNotMatch(page,/id="futures-toggle"|id="civic-toggle"|futures-panel.*hidden/);
  assert.match(page,/OBSERVED ≠ SCHEDULED ≠ SCENARIO/);
});

test('public contacts are limited to sourced official offices and newsroom',()=>{
  const d=JSON.parse(read('data/civic.json'));
  assert.equal(d.contacts.length,5);
  assert.equal(d.map_points.length,1);
  assert.match(d.map_points[0].role,/NOT/);
  assert.ok(d.contacts.every(c=>c.source.startsWith('https://')));
  assert.ok(d.issues.every(i=>i.kind&&i.watch&&i.scenario&&i.source_url));
  assert.match(read('assets/city-futures.js'),/citywide|A policy has no single coordinate/);
  assert.match(read('assets/city-futures.js'),/government-news-release/);
});

test('map draws only a sourced civic landmark, not neighborhood policy impacts',()=>{
  const map=read('assets/city-map.js');
  assert.match(map,/atlas-civic-office/);
  assert.match(map,/updateCivic/);
  assert.match(map,/Policies affecting the whole city are NOT mapped/);
  assert.match(read('assets/atlas.js'),/AfterimageFutures\?\.start/);
  assert.match(read('assets/atlas.js'),/AfterimageFutures\?\.filter/);
});

test('civic records and curated news travel through Pages and RSS refresh',()=>{
  const site=read('.github/workflows/publish.yml');
  const check=read('.github/workflows/check.yml');
  const daily=read('.github/workflows/update-signals.yml');
  assert.match(site,/data\/civic\.json/);
  assert.match(site,/data\/city-news\.json/);
  assert.match(site,/city-futures\.js/);
  assert.match(check,/city-futures\.js/);
  assert.match(daily,/update_civic_news\.py/);
});
