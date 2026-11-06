(() => {
  'use strict';
  const app = {data:null, map:null, markers:new Map(), sector:'all', search:'', rolesOnly:false, selected:null};
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

  function closeDetail(){app.selected=null;$('detail').hidden=true;render();}
  function renderSignals(){
    $('signals-list').innerHTML=app.data.signals.map((s,i)=>`<article class="signal-card"><div class="signal-meta"><span class="${safe(s.category)}">${String(i+1).padStart(2,'0')} / ${safe(s.category.toUpperCase())}</span><span>✳</span></div><h3>${safe(s.title)}</h3><p>${safe(s.summary)}</p><a href="${link(s.source)}" target="_blank" rel="noopener noreferrer">READ THE SIGNAL ↗</a></article>`).join('');
  }

  function initMap(){
    if(!window.L){$('no-map').hidden=false;return;}
    app.map=window.L.map('map',{scrollWheelZoom:false,zoomControl:false,preferCanvas:true,minZoom:9,maxZoom:18}).setView([49.269,-123.102],12);
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',maxZoom:19,subdomains:'abcd'
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
      renderSignals();initMap();render();
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
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeDetail();return;}
    if(e.key==='/' && document.activeElement?.tagName!=='INPUT') {e.preventDefault();$('search').focus();}
  });
  init();
})();
