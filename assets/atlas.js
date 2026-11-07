(() => {
  'use strict';
  const core = window.AfterimageCore;
  const { escapeHTML: esc, safeUrl: safeHref, project, coordinateGroups, jobStatus, dateLabel } = core;
  const $ = id => document.getElementById(id);
  const state = { catalog:null, compass:null, orgs:null, community:null, term:'', category:'all' };
  const echo = (v) => esc(String(v ?? ''));
  const asLink = (url, title) =>
    '<a href="' + esc(safeHref(url)) + '" target="_blank" rel="noopener noreferrer">' + echo(title) + '</a>';
  const queryMatches = (item) => !state.term || item.toLowerCase().includes(state.term);
  const empty = (message) => '<p class="placeholder">' + echo(message) + '</p>';


  function employers() {
    return state.catalog?.employers.filter(e =>
      queryMatches([e.name,e.sector,e.district,e.description,...(e.tags||[]),
        ...state.catalog.jobs.filter(j=>j.employer_id===e.id).map(j=>j.title)].join(' '))) || [];
  }
  function directory() {
    return state.compass?.organizations.filter(e =>
      (state.category==='all'||e.category===state.category) &&
      queryMatches([e.name,e.category,e.region,e.location||'',e.description||''].join(' '))) || [];
  }
  function communityRecords() {
    return state.community?.events.filter(e =>
      queryMatches([e.name,e.description,...e.initiatives].join(' '))) || [];
  }
  function organizationRecords() {
    return state.orgs?.organizations.filter(e =>
      queryMatches([e.name,e.description,e.region,...e.tags,
        ...e.connections.map(c=>c.name)].join(' '))) || [];
  }

  function renderMap(){
    // Geographic rendering lives in MapLibre; this file owns the data/search.
    // All source categories are visible at once.
    window.AfterimageCityMap?.update({
      employers:employers(),
      organizations:directory(),
      venue:(!state.term || communityRecords().length)?state.community?.venue:null
    });
  }

  function renderJobs(){
    const cards=employers();
    $('jobs-count').textContent=cards.length+' EMPLOYERS IN THIS VIEW';
    $('jobs-list').innerHTML=cards.length?cards.map(e=>{
      const jobs=state.catalog.jobs.filter(j=>j.employer_id===e.id);
      const active=jobs.filter(j=>j.status==='recently-listed');
      const roles=jobs.length?'<ul class="roles">'+jobs.map(j=>
        '<li class="role"><strong>'+echo(j.title)+'</strong><span class="role-meta">'+echo(jobStatus(j))+' · OBSERVED '+echo(dateLabel(j.observed_at))+' · '+echo(j.track)+'</span>'
        +(j.note?'<p class="description">'+echo(j.note)+'</p>':'')
        +asLink(j.url,'OPEN ORIGINAL LISTING ↗')+'</li>'
      ).join('')+'</ul>':'<p class="description">On the watchlist. No captured vacancies. Interesting is not the same thing as hiring.</p>';
      return '<article class="job-card" id="job-'+esc(e.id)+'">'
        +'<div class="job-card-top"><span class="pill '+(active.length?'':'watch')+'">'+(active.length?active.length+' RECENTLY SEEN ROLE'+(active.length===1?'':'S'):'WATCHLIST ONLY')+'</span><span class="location">'+echo(e.sector.toUpperCase())+'</span></div>'
        +'<h3>'+echo(e.name)+'</h3><span class="location">'+echo(e.district)+' · MAP POSITION '+echo(e.precision||'APPROXIMATE')+'</span>'
        +'<p class="description">'+echo(e.description)+'</p><h4>THE EVIDENCE</h4>'+roles
        +'<div class="job-links">'+asLink(e.careers,'OFFICIAL CAREERS ↗')+asLink(e.source,'SOURCE ↗')+'</div>'
        +'</article>';
    }).join(''):empty('No career leads match this search. Clear the search to bring the whole city back.');
  }

  function renderDirectory(){
    const records=directory();
    $('directory-count').textContent=records.length+' ORGANIZATIONS / '+(state.compass?.count||0)+' IN SNAPSHOT';
    $('directory-list').innerHTML=records.length?records.map(o=>{
      const geo=o.geo_precision==='centroid'?'MUNICIPAL CENTROID, NOT OFFICE':o.geo_precision==='address'?'SOURCED ADDRESS':'NO MAP PIN';
      const desc=o.description?echo(o.description):'No sourced description recorded.';
      return '<article class="dir-row" id="dir-'+esc(o.id)+'"><div class="dir-top"><h3>'+echo(o.name)+'</h3><span class="dir-group">'+echo(o.category)+'</span></div>'
        +'<small>'+echo(o.region)+(o.location?' · '+echo(o.location):'')+'</small>'
        +'<p>'+desc+'</p><small>SOURCE CHECK: '+echo(dateLabel(o.source_date))+' · '+geo
        +(o.quote_pending?' · QUOTE PENDING':'')+'</small>'
        +'<div class="job-links">'+asLink(o.source_url,'CHECK ORIGINAL EVIDENCE ↗')
        +(o.website?asLink(o.website,'ORGANIZATION WEBSITE ↗'):'')
        +(state.compass?.crosswalk?.some(x=>x.compass_id===o.id)
          ?'<a href="#network-'+esc(state.compass.crosswalk.find(x=>x.compass_id===o.id).observer_id)+'">HISTORICAL LINKS ↗</a>':'')
        +'</div></article>';
    }).join(''):empty('No source-checked organizations on that frequency.');
  }

  function positionNetwork(records){
    const hub='org-bc-ai-ecosystem-association',center={x:600,y:305};
    const groups=[
      records.filter(o=>o.id===hub),
      records.filter(o=>o.id!==hub&&o.region==='vancouver'),
      records.filter(o=>o.id!==hub&&o.region!=='vancouver')
    ];
    const pos=new Map();
    if(groups[0].length)pos.set(hub,center);
    const place=(items,rx,ry,start)=>{
      items.forEach((o,i)=>{const a=start+i*2*Math.PI/Math.max(items.length,1);
        pos.set(o.id,{x:center.x+rx*Math.cos(a),y:center.y+ry*Math.sin(a)});});
    };
    place(groups[1],290,150,-Math.PI/2);
    place(groups[2],495,240,-Math.PI/2+.16);
    return pos;
  }

  function renderNetwork(){
    const records=organizationRecords();
    $('network-count').textContent=records.length+' HISTORICAL ORGANIZATIONS / '+(state.orgs?.links.length||0)+' DOCUMENTED ORG-TO-ORG LINKS';
    const positions=positionNetwork(records),ids=new Set(records.map(o=>o.id));
    const lines=(state.orgs?.links||[]).filter(e=>ids.has(e.source)&&ids.has(e.target)).map(e=>{
      const a=positions.get(e.source),b=positions.get(e.target);
      return '<line class="network-edge" x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+b.y.toFixed(1)+'"/>';
    }).join('');
    const dots=records.map(o=>{
      const p=positions.get(o.id);
      const hub=o.id==='org-bc-ai-ecosystem-association';
      const title=o.name.length>23?o.name.slice(0,22)+'…':o.name;
      return '<g class="network-node '+(hub?'hub':'')+'" role="button" tabindex="0" focusable="true" data-network-id="'+esc(o.id)+'" aria-label="Read archived connections for '+esc(o.name)+'">'
        +'<title>'+esc(o.name)+'</title><circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(hub?23:13)+'"/>'
        +'<text x="'+p.x.toFixed(1)+'" y="'+(p.y+(hub?45:34)).toFixed(1)+'" text-anchor="middle">'+esc(title)+'</text></g>';
    }).join('');
    $('relationship-map').innerHTML='<g aria-hidden="true">'+lines+'</g>'+dots;
    $('network-list').innerHTML=records.length?records.map(o=>
      '<article class="network-card" id="network-'+esc(o.id)+'"><h3>'+echo(o.name)+'</h3>'
      +'<small>'+echo(o.region.toUpperCase())+' · '+o.connections.length+' HISTORICAL CONNECTIONS</small>'
      +'<p>'+echo(o.description)+'</p>'
      +'<ul>'+o.connections.map(c=>'<li>'+echo(c.relation)+' → '+echo(c.name)+' <small>('+echo(c.kind)+')</small></li>').join('')+'</ul>'
      +'<p>'+asLink(o.source_url,'ORIGINAL ARCHIVE RECORD ↗')+'</p>'
      +(state.compass?.crosswalk?.some(x=>x.observer_id===o.id)
        ?'<p><a href="#dir-'+esc(state.compass.crosswalk.find(x=>x.observer_id===o.id).compass_id)+'">SOURCE-CHECKED COMPASS RECORD ↗</a></p>':'')
      +'</article>'
    ).join(''):empty('No archive nodes match your search.');
  }

  function renderCommunity(){
    const items=communityRecords();
    $('community-list').innerHTML=items.length?items.map(e=>
      '<article class="community-card"><small>HISTORICAL RECORD · NOT A CURRENT EVENT</small>'
      +'<h3>'+echo(e.name)+'</h3><p>'+echo(e.description)+'</p>'
      +'<small>ARCHIVED DATE REFERENCE: '+echo(dateLabel(e.last_upstream_scheduled_date))+'</small>'
      +'<p>'+asLink(e.source_url,'OPEN ORIGINAL ARCHIVE ↗')+'</p></article>'
    ).join(''):empty('No archived programmes match this search.');
  }

  function renderSignals(){
    const items=state.catalog?.signals.filter(s=>
      queryMatches([s.title,s.summary,s.category].join(' ')))||[];
    $('signals-list').innerHTML=items.length?items.map((s,i)=>
      '<article class="signal-card"><small>0'+(i+1)+' / '+echo(s.category.toUpperCase())+' · SEEN '+echo(dateLabel(s.observed_at))+'</small>'
      +'<h3>'+echo(s.title)+'</h3><p>'+echo(s.summary)+'</p>'+asLink(s.source,'TRACE SOURCE ↗')+'</article>'
    ).join(''):empty('No transmissions match this query.');
  }

  function renderAll(){
    $('stat-employers').textContent=state.catalog?.counts.employers||'—';
    $('stat-jobs').textContent=state.catalog?.counts.recent_roles||'—';
    $('stat-directory').textContent=state.compass?.count||'—';
    $('stat-connections').textContent=state.orgs?.organizations.length||'—';
    renderJobs();renderDirectory();renderNetwork();renderCommunity();renderSignals();renderMap();
    window.AfterimageFutures?.filter(state.term);
    $('search-feedback').textContent=state.term?
      'SEARCHING ALL PUBLIC DATASETS: '+state.term+' · Clear the field to see everything again.' :
      'Every frequency is visible by default. Use search only if you want to narrow it.';
    scheduleHeight();
  }

  let embedReady = false;
  function trustedParentOrigin(){
    try{
      const origin=new URL(document.referrer).origin;
      return ['https://suzyeaston.ca','https://www.suzyeaston.ca'].includes(origin) ? origin : null;
    }catch{return null;}
  }
  function jumpTo(id){
    const target=document.getElementById(id);
    if(!target)return;
    const origin=trustedParentOrigin();
    if(embedReady && window.parent!==window && origin){
      const y=target.getBoundingClientRect().top+window.scrollY;
      window.parent.postMessage({type:'afterimage:scroll',y},origin);
    }else{
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  window.addEventListener('message', event=>{
    if(event.source!==window.parent || event.origin!==trustedParentOrigin())return;
    if(event.data?.type==='afterimage:ready')embedReady=true;
  });
  // Anchor navigation must scroll the actual WordPress document, not an iframe
  // that's already expanded to its full height.
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href^="#"]');
    if(!anchor||!embedReady||window.parent===window)return;
    const id=anchor.getAttribute('href').slice(1);
    if(!document.getElementById(id))return;
    event.preventDefault();
    jumpTo(id);
  });

  function scheduleHeight(){
    if(window.parent===window)return;
    if(scheduleHeight.pending)return;
    scheduleHeight.pending=true;
    requestAnimationFrame(()=>{
      scheduleHeight.pending=false;
      let origin;
      try{origin=new URL(document.referrer).origin;}catch{return;}
      if(!['https://suzyeaston.ca','https://www.suzyeaston.ca'].includes(origin))return;
      const height=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);
      window.parent.postMessage({type:'afterimage:resize',height},origin);
    });
  }
  scheduleHeight.pending=false;

  async function getData(filename){
    const response=await fetch('./data/'+filename+'.json',{cache:'no-cache'});
    if(!response.ok)throw new Error(filename+': HTTP '+response.status);
    return response.json();
  }

  async function init(){
    window.AfterimageCityMap?.start();
    window.AfterimageFutures?.start();
    const files=['catalog','compass','organizations','community'];
    await Promise.all(files.map(async (key)=>{
      try{
        const doc=await getData(key);
        if(key==='catalog'&&(!Array.isArray(doc.employers)||!Array.isArray(doc.jobs)))throw Error('Invalid careers catalogue');
        if(key==='compass'&&!Array.isArray(doc.organizations))throw Error('Invalid Compass directory');
        if(key==='organizations'&&(!Array.isArray(doc.organizations)||!Array.isArray(doc.links)))throw Error('Invalid relationship archive');
        if(key==='community'&&!Array.isArray(doc.events))throw Error('Invalid community archive');
        state[key==='organizations'?'orgs':key]=doc;
        if(key==='compass'){
          $('directory-category').innerHTML='<option value="all">All categories</option>'
            +doc.categories.map(c=>'<option value="'+echo(c)+'">'+echo(c)+'</option>').join('');
        }
      }catch(e){
        console.warn('A public AFTERIMAGE source is unavailable',e);
        const id={catalog:'jobs-list',compass:'directory-list',organizations:'network-list',community:'community-list'}[key];
        $(id).innerHTML=empty('This public dataset could not load. Other sections still work. Please try refreshing.');
      }
    }));
    renderAll();
    document.fonts?.ready.then(scheduleHeight);
    window.addEventListener('load',scheduleHeight);
    window.addEventListener('resize',scheduleHeight);
    if('ResizeObserver' in window)new ResizeObserver(scheduleHeight).observe(document.body);
    else setTimeout(scheduleHeight,500);
  }

  $('relationship-map').addEventListener('click',event=>{
    const element=event.target.closest('[data-network-id]');
    if(element)jumpTo('network-'+element.dataset.networkId);
  });
  $('relationship-map').addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const element=event.target.closest('[data-network-id]');
    if(element){event.preventDefault();jumpTo('network-'+element.dataset.networkId);}
  });
  $('global-search').addEventListener('input',event=>{
    state.term=event.target.value.trim().toLowerCase();
    renderAll();
  });
  $('directory-category').addEventListener('change',event=>{
    state.category=event.target.value;
    renderDirectory();renderMap();scheduleHeight();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){
      event.preventDefault();$('global-search').focus();
    }
  });
  window.AfterimageRequestHeight=scheduleHeight;
  init();
})();