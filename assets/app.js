(() => {
  'use strict';
  const app = {data:null, community:null, showCommunity:false, communityMarker:null, map:null, markers:new Map(), sector:'all', search:'', rolesOnly:false, selected:null};
  const $ = (id) => document.getElementById(id);
  const safe = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link = (u) => {try {const url = new URL(u); return url.protocol === 'https:' ? url.href : '#';} catch {return '#';}};
  const fmtDate = (v) => v ? new Date(`${v}T12:00:00Z`).toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}) : 'Unknown';
  const validJobs = (id) => app.data.jobs.filter(j => j.employer_id === id);
  const activeJobs = (id) => validJobs(id).filter(j => j.status === 'recently-listed');
  const sectorTitle = {film:'FILM / VFX',audio:'SOUND / MUSIC TECH',games:'GAME WORLDS'};

  function visibleCompanies(){
    const q = app.search.trim().toLowerCase();
    return app.data.employers.filter(c => {
      if(app.sector !== 'all' && c.sector !== app.sector) return false;
      if(app.rolesOnly && !activeJobs(c.id).length) return false;
      if(!q) return true;
      return [c.name,c.district,c.description,...c.tags,...validJobs(c.id).map(j=>j.title)].join(' ').toLowerCase().includes(q);
    });
  }

  function makeMarker(c){
    const n=activeJobs(c.id).length;
    const html=`<div class="pulse-marker ${safe(c.sector)} ${n?'':'is-watch'}" aria-hidden="true"><span class="halo"></span><span class="core"></span>${n?`<span class="role-n">${n}</span>`:''}</div>`;
    return window.L.marker([c.lat,c.lng],{icon:window.L.divIcon({html,iconSize:[36,36],iconAnchor:[18,18],className:'marker-wrapper'}),keyboard:true,title:c.name})
      .bindTooltip(safe(c.name),{direction:'top',offset:[0,-15],className:'afterimage-tip'})
      .on('click',()=>selectCompany(c.id));
  }

  function renderMap(companies){
    if(!app.map) return;
    const visible = new Set(companies.map(c=>c.id));
    for(const c of app.data.employers){
      let marker = app.markers.get(c.id);
      if(!marker){marker=makeMarker(c);app.markers.set(c.id,marker);}
      if(visible.has(c.id) && !app.map.hasLayer(marker)) marker.addTo(app.map);
      if(!visible.has(c.id) && app.map.hasLayer(marker)) app.map.removeLayer(marker);
      const node=marker.getElement();
      node?.querySelector('.pulse-marker')?.classList.toggle('is-selected',c.id===app.selected);
    }
    if(app.showCommunity && app.community?.venue){
      if(!app.communityMarker){
        const venue=app.community.venue;
        app.communityMarker=window.L.marker([venue.lat,venue.lng],{
          title:'BC + AI archive venue (historical)',keyboard:true,
          icon:window.L.divIcon({html:'<div class="community-pin" aria-hidden="true"><span>✳</span><small>BC+AI</small></div>',iconSize:[56,46],iconAnchor:[28,23],className:'marker-wrapper'})
        }).bindTooltip('H.R. MacMillan Space Centre / community archive',{
          direction:'top',offset:[0,-16],className:'afterimage-tip'
        }).on('click',showVenue);
      }
      if(!app.map.hasLayer(app.communityMarker)) app.communityMarker.addTo(app.map);
    } else if(app.communityMarker && app.map.hasLayer(app.communityMarker)){
      app.map.removeLayer(app.communityMarker);
    }
  }

  function renderList(companies){
    $('visible-count').textContent=`${companies.length} LOCATED`;
    $('company-list').innerHTML=companies.length?companies.map(c=>{
      const n=activeJobs(c.id).length;
      return `<button type="button" class="company" data-employer="${safe(c.id)}" aria-current="${c.id===app.selected}"><span class="company-dot ${safe(c.sector)}"></span><span><span class="company-title">${safe(c.name)}</span><span class="company-sub">${safe(c.district)} / ${safe(c.sector.toUpperCase())}</span></span><span class="company-data"><strong class="${n?'':'quiet'}">${n?n+' OPEN*':'WATCH'}</strong><small>← TUNE IN</small></span></button>`;
    }).join(''):'<div class="empty-state">No signals on that frequency. Try another filter or a wider search.</div>';
  }

  function render(){
    if(!app.data) return;
    const companies=visibleCompanies();
    renderList(companies);renderMap(companies);
    if(app.selected && !companies.find(c=>c.id===app.selected)) closeDetail();
  }

  function selectCompany(id){
    const c=app.data.employers.find(c=>c.id===id);
    if(!c) return;
    app.selected=id;
    const jobs=validJobs(id);
    $('detail-code').textContent=`${c.id.toUpperCase()} // RECEIVED`;
    $('detail-body').innerHTML=`
      <div class="details-sector ${safe(c.sector)}">◉ ${safe(sectorTitle[c.sector])}</div>
      <h2>${safe(c.name)}</h2>
      <div class="details-meta"><strong>${safe(c.district.toUpperCase())}</strong><br>${safe(c.address)}<br>MAP PIN: ${safe(c.precision==='city'?'CITY-LEVEL, NOT AN OFFICE LOCATION':'APPROXIMATE LOCATION')}</div>
      <p class="detail-desc">${safe(c.description)}</p>
      <div class="tag-row">${c.tags.map(t=>`<span>#${safe(t)}</span>`).join('')}</div>
      <a class="action-link" href="${link(c.careers)}" target="_blank" rel="noopener noreferrer">VISIT CAREERS ↗</a>
      <hr class="detail-rule"><div class="detail-subheading">CAPTURED TRANSMISSIONS / ${jobs.length} RECORDS</div>
      ${jobs.length?jobs.map(j=>`<article class="role-card"><div class="job-status ${safe(j.status)}">● ${j.status==='recently-listed'?'RECENTLY LISTED':j.status==='interest-only'?'INTEREST FORM · NOT A VACANCY':'NEEDS RECHECK'}</div><h4>${safe(j.title)}</h4><div class="details-meta">${safe(j.track)} · SEEN ${safe(fmtDate(j.observed_at))}</div><p>${safe(j.note||'')}</p><a href="${link(j.url)}" target="_blank" rel="noopener noreferrer">OFFICIAL POSTING ↗</a></article>`).join(''):'<p class="status-muted">In the orbit, but no captured openings right now. This is a watchlist signal, not a claim that they are hiring.</p>'}
      <p class="details-note">* RECENTLY LISTED ≠ CONFIRMED STILL OPEN. Listings can close without notice. Verify at the official source before applying.</p>
      <a class="secondary-link" href="${link(c.source)}" target="_blank" rel="noopener noreferrer">TRACE THE SOURCE ↗</a>`;
    $('detail').hidden=false;
    render();
    if(app.map) app.map.flyTo([c.lat,c.lng],Math.max(app.map.getZoom(),12),{duration:1.1});
    if(window.innerWidth < 760) $('detail').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function showCommunityEvent(id){
    const event=app.community?.events.find(e=>e.id===id);
    if(!event)return;
    app.selected=null;
    $('detail-code').textContent='BC + AI // ARCHIVE RECEIVED';
    const venue=app.community.venue;
    const here=venue.event_ids.includes(id);
    $('detail-body').innerHTML=`
      <div class="details-sector community">◉ COMMUNITY ECHO / NOT A JOB OPENING</div>
      <h2>${safe(event.name)}</h2>
      <div class="details-meta">HISTORICAL RECORD · ${safe(event.initiatives.join(' / ').toUpperCase())}<br>
      ARCHIVED SCHEDULE REFERENCE: ${safe(event.last_upstream_scheduled_date||'UNDATED')}<br>
      ${here?'DOCUMENTED VENUE: '+safe(venue.name)+' / '+safe(venue.address):'NO SPECIFIC PUBLIC VENUE PLOTTED'}</div>
      <p class="detail-desc">${safe(event.description)}</p>
      <p class="details-note">Archived source; dates and programmes may have changed. This is not evidence of an upcoming event, a vacancy, or affiliation with AFTERIMAGE.</p>
      <a class="action-link" href="${link(event.source_url)}" target="_blank" rel="noopener noreferrer">EXPLORE SOURCE RECORD ↗</a>
      <p class="details-note">Adapted from The Observatory — BC + AI ecosystem map (CC BY 4.0).</p>`;
    $('detail').hidden=false;
    render();
    if(here&&app.map)app.map.flyTo([venue.lat,venue.lng],Math.max(app.map.getZoom(),13),{duration:1.1});
    if(window.innerWidth<760)$('detail').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function showVenue(){
    const venue=app.community?.venue;
    if(!venue)return;
    app.selected=null;
    const related=app.community.events.filter(e=>venue.event_ids.includes(e.id));
    $('detail-code').textContent='VENUE // HISTORICAL SIGNAL';
    $('detail-body').innerHTML=`<div class="details-sector community">◉ COMMUNITY ARCHIVE</div>
      <h2>${safe(venue.name)}</h2><div class="details-meta">${safe(venue.address)}<br>VENUE PIN · VERIFIED PUBLIC LOCATION</div>
      <p class="detail-desc">This venue appears in archived BC + AI records. Not a current meetup schedule and not a hiring location.</p>
      ${related.map(e=>`<button type="button" class="archive-venue-link" data-community-id="${safe(e.id)}">${safe(e.name)} ↗</button>`).join('')}
      <p class="details-note">Records adapted from The Observatory — BC + AI ecosystem map (CC BY 4.0).</p>
      <a href="${link(venue.source_url)}" target="_blank" rel="noopener noreferrer">VENUE SOURCE ↗</a>`;
    $('detail').hidden=false;
    render();
  }

  function renderCommunity(){
    const panel=$('community-panel');
    panel.hidden=!app.showCommunity;
    if(!app.showCommunity)return;
    if(!app.community){
      $('community-entries').textContent='Archive source unavailable. Hiring signals still work.';
      return;
    }
    $('community-note').textContent=app.community.notice;
    $('community-entries').innerHTML=app.community.events.map(e=>`
      <button type="button" class="community-entry" data-community-id="${safe(e.id)}">
      <strong>${safe(e.name)}</strong><small>${safe(e.initiatives.join(' / ').toUpperCase())} · HISTORICAL</small></button>`).join('');
  }

  async function loadCommunity(){
    try{
      const response=await fetch('./data/community.json',{cache:'no-cache'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(data.status!=='archived_source_not_live_calendar'||!Array.isArray(data.events))throw new Error('Invalid community archive');
      app.community=data;
    }catch(error){console.warn('Optional BC + AI archive unavailable:',error);}
    renderCommunity();render();
  }

  function closeDetail(){app.selected=null;$('detail').hidden=true;render();}
  function renderSignals(){
    $('signals-list').innerHTML=app.data.signals.map((s,i)=>`<article class="signal-card"><div class="signal-meta"><span class="${safe(s.category)}">${String(i+1).padStart(2,'0')} / ${safe(s.category.toUpperCase())}</span><span>✳</span></div><h3>${safe(s.title)}</h3><p>${safe(s.summary)}</p><a href="${link(s.source)}" target="_blank" rel="noopener noreferrer">READ THE SIGNAL ↗</a></article>`).join('');
  }

  function initMap(){
    if(!window.L){$('no-map').hidden=false;return;}
    app.map=window.L.map('map',{scrollWheelZoom:false,zoomControl:false,preferCanvas:true,minZoom:9,maxZoom:18}).setView([49.269,-123.102],12);
    // Keyless, low-volume OSM tiles: CARTO now requires a key and watermarking is not a map style.
    // No prefetch or no-cache tiles; browsers honour OSM's normal HTTP cache policy.
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      maxZoom:19
    }).on('tileerror',()=>{$('no-map').hidden=false;}).addTo(app.map);
    window.L.control.zoom({position:'bottomright'}).addTo(app.map);
    setTimeout(()=>app.map?.invalidateSize(),250);
  }

  async function init(){
    try{
      const response=await fetch('./data/catalog.json',{cache:'no-cache'});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      app.data=await response.json();
      $('employer-count').textContent=app.data.counts.employers;
      $('job-count').textContent=app.data.counts.recent_roles;
      $('signal-count').textContent=app.data.signals.length;
      $('snapshot-label').textContent=`SNAPSHOT ${fmtDate(app.data.generated_at.slice(0,10)).toUpperCase()} // ${app.data.counts.needs_review} AGED LISTINGS`;
      renderSignals();initMap();render();loadCommunity();
    }catch(err){
      $('company-list').innerHTML=`<div class="empty-state">Unable to load the atlas (${safe(err.message)}). Serve this folder with <code>python3 -m http.server</code>; opening index.html as a file will not work.</div>`;
      $('snapshot-label').textContent='SIGNAL LOST / DATA UNAVAILABLE';
    }
  }
  $('close-detail').addEventListener('click',closeDetail);
  $('company-list').addEventListener('click',e=>{
    const btn=e.target.closest('[data-employer]');if(btn)selectCompany(btn.dataset.employer);
  });
  $('sector-filters').addEventListener('click',e=>{
    const btn=e.target.closest('[data-sector]');if(!btn)return;
    app.sector=btn.dataset.sector;
    for(const chip of $('sector-filters').querySelectorAll('.chip')){
      const active=chip===btn;chip.classList.toggle('is-active',active);chip.setAttribute('aria-pressed',String(active));
    }
    render();
  });
  $('search').addEventListener('input',e=>{app.search=e.target.value;render();});
  $('roles-only').addEventListener('change',e=>{app.rolesOnly=e.target.checked;render();});
  $('community-enabled').addEventListener('change',e=>{app.showCommunity=e.target.checked;renderCommunity();render();});
  $('community-entries').addEventListener('click',e=>{const btn=e.target.closest('[data-community-id]');if(btn)showCommunityEvent(btn.dataset.communityId);});
  $('detail-body').addEventListener('click',e=>{const btn=e.target.closest('[data-community-id]');if(btn)showCommunityEvent(btn.dataset.communityId);});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeDetail();return;}
    if(e.key==='/' && document.activeElement?.tagName!=='INPUT') {e.preventDefault();$('search').focus();}
  });
  init();
})();