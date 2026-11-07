const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('v2 ships one visible page with all data and original sources',()=>{
  const html=read('index.html');
  for(const id of ['field','jobs','directory','connections','community','transmissions']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/atlas\.css/);
  assert.match(html,/atlas-core\.js/);
  assert.match(html,/atlas\.js/);
  assert.match(html,/city-map\.js/);
  assert.match(html,/maplibre-gl/);
  assert.match(html,/bc-aicompass\.ca/);
  assert.match(html,/WalksWithASwagger\/official-observer/);
  assert.doesNotMatch(html,/type="checkbox"/);
  assert.doesNotMatch(html,/leaflet/i);
});

test('all published public datasets are retained and credited',()=>{
  const snapshot=JSON.parse(read('data/catalog.json'));
  const compass=JSON.parse(read('data/compass.json'));
  const graph=JSON.parse(read('data/organizations.json'));
  const community=JSON.parse(read('data/community.json'));
  assert.equal(snapshot.employers.length,10);
  assert.equal(compass.organizations.length,99);
  assert.equal(graph.organizations.length,20);
  assert.equal(community.events.length,7);
  assert.equal(compass.source.licence,'CC BY 4.0');
  assert.equal(graph.source.licence,'CC BY 4.0');
  assert.equal(community.source.licence,'CC BY 4.0');
  assert.equal(compass.crosswalk.length,4);
  assert.ok(snapshot.jobs.every(j=>j.url.startsWith('https://')));
});

test('original job sightings still have explicit fresh vs review statuses',()=>{
  const js=read('assets/atlas.js');
  assert.match(js,/jobStatus\(j\)/);
  assert.match(js,/dateLabel\(j\.observed_at\)/);
  assert.match(js,/WATCHLIST ONLY/);
  assert.match(js,/OFFICIAL CAREERS/);
  assert.match(js,/OPEN ORIGINAL LISTING/);
  assert.match(js,/SOURCE-CHECKED ORGANIZATIONS/);
});

test('publication remains dependency-free and includes all four datasets',()=>{
  const wf=read('.github/workflows/publish.yml');
  for(const name of ['catalog.json','history.json','community.json','organizations.json','compass.json']){
    assert.ok(wf.includes('data/'+name),name+' must be published');
  }
  assert.match(wf,/node --check assets\/atlas\.js/);
  assert.match(wf,/node --test tests\/atlas\.test\.cjs/);
});
