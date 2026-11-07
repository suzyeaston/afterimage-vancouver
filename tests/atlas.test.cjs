const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const core=require('../assets/atlas-core.js');

test('the map is a real interactive street map, not the fake coordinate grid',()=>{
  const html=read('index.html');
  const mapjs=read('assets/city-map.js');
  const appjs=read('assets/atlas.js');
  assert.match(html,/id="city-map"/);
  assert.match(html,/maplibre-gl@6\.16\.0/);
  assert.match(html,/city-map\.js/);
  assert.doesNotMatch(html,/id="signal-map"|map-background|map-signals/);
  assert.match(mapjs,/tiles\.openfreemap\.org\/styles\/dark/);
  assert.match(mapjs,/tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(mapjs,/new lib\.Map/);
  assert.match(mapjs,/map\.scrollZoom\.disable\(\)/);
  assert.match(mapjs,/map\.fitBounds/);
  assert.match(mapjs,/atlas-employers/);
  assert.match(mapjs,/cluster:true/);
  assert.match(appjs,/AfterimageCityMap\?\.update/);
  assert.doesNotMatch(appjs,/mapRoot|initMapBackground|map-signals/);
});

test('verified organizations sharing centroid become one cluster, not invented offices',()=>{
  const data=JSON.parse(read('data/compass.json'));
  const groups=core.coordinateGroups(data.organizations);
  assert.equal(data.organizations.length,99);
  assert.equal(groups.length,6);
  assert.ok(groups.some(g=>g.records.length>=50));
  assert.match(read('assets/city-map.js'),/municipal centroid|shared point/i);
  assert.match(read('assets/city-map.js'),/slice\(0,4\)/);
});

test('every dataset is visible through its own section without toggle gates',()=>{
  const html=read('index.html');
  for(const anchor of ['field','jobs','directory','connections','community','transmissions']){
    assert.match(html,new RegExp('id="'+anchor+'"'));
  }
  for(const slot of ['jobs-list','directory-list','network-list','community-list','signals-list','city-map']){
    assert.match(html,new RegExp('id="'+slot+'"'));
  }
  assert.doesNotMatch(html,/type="checkbox"|id="org-network-toggle"|id="compass-toggle"|id="community-enabled"/);
  assert.match(html,/Not LinkedIn with mountains/);
  assert.match(html,/not a current event calendar/i);
});

test('source links are protocol-restricted and content is escaped',()=>{
  assert.equal(core.safeUrl('javascript:alert(1)'),'#');
  assert.equal(core.safeUrl('https://example.com/'), 'https://example.com/');
  assert.equal(core.escapeHTML('<script>"test"</script>'), '&lt;script&gt;&quot;test&quot;&lt;/script&gt;');
  assert.equal(core.jobStatus({status:'interest-only'}),'Interest form, not an opening');
  const js=read('assets/atlas.js');
  assert.match(js,/esc\(safeHref\(url\)\)/);
  assert.match(js,/SOURCE CHECK/);
});

test('derived datasets remain explicitly separate from active hiring',()=>{
  const catalog=JSON.parse(read('data/catalog.json'));
  const compass=JSON.parse(read('data/compass.json'));
  const graph=JSON.parse(read('data/organizations.json'));
  const community=JSON.parse(read('data/community.json'));
  assert.equal(catalog.employers.length,10);
  assert.equal(compass.count,99);
  assert.equal(graph.organizations.length,20);
  assert.equal(community.events.length,7);
  assert.equal(compass.source.licence,'CC BY 4.0');
  assert.match(read('index.html'),/not 99 job offers/i);
});

test('child resizes WordPress iframe with constrained referrer and no secret data',()=>{
  const js=read('assets/atlas.js');
  assert.match(js,/afterimage:resize/);
  assert.match(js,/https:\/\/suzyeaston\.ca/);
  assert.match(js,/afterimage:ready/);
  assert.match(js,/afterimage:scroll/);
  assert.match(js,/jumpTo\(id\)/);
  assert.match(js,/ResizeObserver/);
  assert.match(read('index.html'),/SOURCE CODE/);
});
