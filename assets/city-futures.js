(() => {
  'use strict';
  const {escapeHTML:esc,safeUrl,dateLabel}=window.AfterimageCore;
  const $=id=>document.getElementById(id);
  const state={civic:null,news:null,term:'',year:'all'};
  const value=v=>esc(String(v??''));
  const link=(url,label)=>'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(url))+'">'+value(label)+'</a>';
  const text=(...xs)=>xs.filter(Boolean).join(' ').toLowerCase();
  function match(record) {
    if(!state.term)return true;
    return text(record.title,record.name,record.summary,record.what_to_watch,record.watch,
      record.category,record.role,record.purpose,record.kind,record.type).includes(state.term);
  }
  function issueRows(){
    if(!state.civic)return[];
    return state.civic.issues.filter(match);
  }
  function timeline(){
    if(!state.civic)return[];
    return state.civic.milestones.filter(m=>{
      const year=m.date?m.date.slice(0,4):String(m.year);
      if(state.year!=='all'&&year!==state.year)return false;
      return !state.term||match(m)||issueRows().some(i=>i.id===m.issue_id);
    });
  }
  function linkSource(issue){
    return '<div class="futures-links">'+link(issue.source_url,'PRIMARY SOURCE ↗')
      +(issue.supporting_source?' '+link(issue.supporting_source,'SUPPORTING RECORD ↗'):'')
      +'</div>';
  }
  function renderIssues(){
    const rows=issueRows();
    $('futures-issues').innerHTML=rows.length?rows.map(i=>
      '<article class="futures-issue" id="civic-'+value(i.id)+'"><div class="futures-issue-top"><span>'+value(i.category.toUpperCase())+'</span><span>'+value(i.kind.toUpperCase())+' · '+value(dateLabel(i.observed_on))+'</span></div>'
      +'<h3>'+value(i.title)+'</h3><p>'+value(i.summary)+'</p>'
      +'<h4>THE NEXT MEASURABLE SIGNAL</h4><p>'+value(i.watch)+'</p>'
      +'<details><summary>IF / THEN · EXPLORE A SCENARIO, NOT A FORECAST</summary><p>'+value(i.scenario)+'</p></details>'
      +'<p class="futures-muted">LOCATION: '+value(i.scope)+' · A policy has no single coordinate.</p>'+linkSource(i)+'</article>'
    ).join(''):'<p class="futures-blank">No sourced civic issues match this search.</p>';
  }
  function renderMilestones(){
    const rows=timeline();
    $('futures-milestones').innerHTML=rows.length?rows.map(m=>
      '<div class="futures-milestone"><time>'+value(m.date?dateLabel(m.date):m.year)+'</time>'
      +'<h4>'+value(m.title)+'</h4><small>'+value(m.status.toUpperCase())+'</small>'
      +'<p>'+link(m.source_url,'ORIGINAL SOURCE ↗')+'</p></div>'
    ).join(''):'<div class="futures-blank">Nothing scheduled on this frequency. That is not evidence nothing will happen.</div>';
  }
  function renderNews(){
    const items=(state.news?.items||[]).filter(n=>!state.term||match(n)
      ||(n.issue_ids||[]).some(id=>issueRows().some(i=>i.id===id)));
    $('futures-news').innerHTML=items.length?items.slice(0,16).map(n=>
      '<article class="futures-news-card"><small class="futures-source">'+value(n.publisher_kind==='government-news-release'?'OFFICIAL PRESS RELEASE':'INDEPENDENT NEWSROOM')+'</small>'
      +'<h4>'+value(n.title)+'</h4><small>'+value(n.publisher)+' · '+value(dateLabel(n.published_on))+'</small>'
      +'<p>'+link(n.url,'READ AT THE PUBLISHER ↗')+'</p></article>'
    ).join(''):'<p class="futures-blank">No recent sourced headlines in this snapshot. This is not a measure of issue importance.</p>';
  }
  function renderContacts(){
    const rows=(state.civic?.contacts||[]).filter(c=>!state.term||match(c));
    $('futures-contacts').innerHTML=rows.length?rows.map(c=>
      '<article class="futures-contact"><small class="contact-kind">'+value(c.type.replace(/-/g,' '))+'</small>'
      +'<h4>'+value(c.name)+'</h4><p>'+value(c.role)+'</p>'
      +link(c.url,'OFFICIAL PUBLIC CONTACT ↗')
      +(c.email&&/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(c.email)
        ?'<a class="mail-link" href="mailto:'+encodeURIComponent(c.email)+'">'+value(c.email)+'</a>':'')
      +'</article>'
    ).join(''):'<p class="futures-blank">No office contacts match this search. Clear the search for the full list.</p>';
  }
  function render(){
    if(!state.civic)return;
    renderIssues();renderMilestones();renderNews();renderContacts();
    $('futures-status').textContent=state.civic.issues.length+' TRACKED TOPICS · '
      +(state.news?.items.length||0)+' LINKED HEADLINES · CURATED '+state.civic.as_of
      +' · NEWS CHECK '+(state.news?.observed_at||'NOT YET REFRESHED')
      +' · NO ELECTORAL FORECASTS';
  }
  async function get(name){
    const res=await fetch('./data/'+name+'.json',{cache:'no-cache'});
    if(!res.ok)throw Error(name+' HTTP '+res.status);
    return res.json();
  }
  async function start(){
    try{
      const [civic,news]=await Promise.all([get('civic'),get('city-news').catch(()=>null)]);
      if(!Array.isArray(civic.issues)||!Array.isArray(civic.contacts)||!Array.isArray(civic.milestones))
        throw Error('Unexpected civic schema');
      state.civic=civic;
      state.news=news&&Array.isArray(news.items)?news:{items:[]};
      window.AfterimageCityMap?.updateCivic(civic.map_points||[]);
      render();
      if(typeof window.AfterimageRequestHeight==='function')window.AfterimageRequestHeight();
    }catch(err){
      console.warn('CITY FUTURES optional dataset unavailable:',err);
      $('futures-status').textContent='CIVIC RECEIVER OFFLINE / ORIGINAL GOVERNMENT LINKS BELOW';
      $('futures-issues').innerHTML='<p class="futures-blank">Civic dataset unavailable. <a href="https://vancouver.ca/your-government/city-council-meetings-and-decisions.aspx" target="_blank" rel="noopener noreferrer">Open the official Council records ↗</a>.</p>';
    }
  }
  function filter(query){state.term=String(query||'').trim().toLowerCase();render();}
  $('futures-horizon').addEventListener('change',e=>{state.year=e.target.value;renderMilestones();});
  window.AfterimageFutures={start,filter};
})();