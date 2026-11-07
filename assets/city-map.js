(() => {
  'use strict';

  // Real geographic cartography: OpenFreeMap vector streets in MapLibre.
  // Compass "pins" are only reported municipal centroids unless a sourced
  // record explicitly says otherwise. Never invent office locations.
  const { coordinateGroups, escapeHTML: esc, safeUrl } = window.AfterimageCore;
  const DARK = 'https://tiles.openfreemap.org/styles/dark';
  const LIBERTY = 'https://tiles.openfreemap.org/styles/liberty';
  const $ = id => document.getElementById(id);
  const city = {
    map:null, ready:false, loaded:false, triedFallback:false,
    employers:[], organizations:[], venue:null, compassGroups:new Map(),
  };
  const fc = features => ({type:'FeatureCollection',features});
  const point = (lng,lat,properties) => ({
    type:'Feature',geometry:{type:'Point',coordinates:[lng,lat]},properties
  });
  const escape = x => esc(String(x??''));
  function sourceUrl(url) { return esc(safeUrl(url)); }

  function unavailable(){
    $('city-map-fallback').hidden=false;
    $('city-map').classList.add('is-unavailable');
  }
  function setReadout(html){
    $('map-readout').innerHTML=html;
    const anchor=$('map-readout').querySelector('a[href^="#"]');
    if(anchor && anchor.hash) anchor.setAttribute('aria-label','Read the full source-backed record below');
  }

  function readEmployer(employers, cluster=false){
    if(!employers.length)return;
    const n=employers.length;
    const sorted=[...employers].sort((a,b)=>a.name.localeCompare(b.name));
    const first=sorted[0];
    setReadout('<span class="eyebrow">PINK / CREATIVE EMPLOYER'+(n>1?'S':'')+'</span>'
      +'<h3>'+ (n===1?escape(first.name):n+' creative employers nearby')+'</h3>'
      +'<p>'+ (cluster?'Several employers appear close together at this zoom level. Zoom in to separate them.':
        'Location is approximate unless supported by a specific source.') +'</p>'
      +(n>1?'<ul class="readout-list">'+sorted.slice(0,5).map(e=>'<li>'+escape(e.name)+'</li>').join('')+'</ul>'
        +(n>5?'<p>…and '+(n-5)+' more in the job leads section.</p>':''):'')
      +'<p class="readout-note">A watched employer does not necessarily have a currently open vacancy.</p>'
      +'<div class="readout-actions"><a class="action" href="#job-'+escape(first.id)+'">SEE JOB EVIDENCE ↗</a></div>');
  }

  function readCompass(group){
    if(!group || !group.records.length)return;
    const items=group.records,n=items.length;
    const counters=new Map();
    for(const item of items)counters.set(item.category,(counters.get(item.category)||0)+1);
    const cats=[...counters].sort((a,b)=>b[1]-a[1]).slice(0,3);
    const exemplar=items.slice(0,4);
    setReadout('<span class="eyebrow">MINT / BC AI COMPASS</span>'
      +'<h3>'+n+' research organization'+(n===1?'':'s')+'</h3>'
      +'<p>This shared point represents a '+(items.every(i=>i.geo_precision==='address')?'source-identified address':'municipal centroid')
      +'. It does <strong>not</strong> mean these organizations share a building or office.</p>'
      +'<p class="readout-note">AT THIS COORDINATE / TYPES</p>'
      +'<ul class="readout-list">'+cats.map(([name,count])=>'<li>'+count+' · '+escape(name)+'</li>').join('')+'</ul>'
      +'<p class="readout-note">EXAMPLE ORGANIZATIONS</p>'
      +'<ul class="readout-list">'+exemplar.map(i=>'<li>'+escape(i.name)+'</li>').join('')+'</ul>'
      +(n>4?'<p>…plus '+(n-4)+' more source-linked records.</p>':'')
      +'<div class="readout-actions"><a class="action" href="#directory">BROWSE EVIDENCE ↗</a></div>');
  }

  function readVenue(){
    const venue=city.venue;
    if(!venue)return;
    setReadout('<span class="eyebrow">AMBER / ARCHIVED COMMUNITY VENUE</span>'
      +'<h3>'+escape(venue.name)+'</h3>'
      +'<p>'+escape(venue.address||'Vancouver')+'</p>'
      +'<p class="readout-note">Historical BC + AI and Futureproof programme venue. This is not a currently scheduled event or hiring location.</p>'
      +'<div class="readout-actions"><a class="action" href="#community">READ HISTORICAL RECORDS ↗</a></div>');
  }

  function layers(){
    const map=city.map;
    const blank=fc([]);
    map.addSource('atlas-compass',{type:'geojson',data:blank});
    map.addLayer({id:'atlas-compass-bubbles',type:'circle',source:'atlas-compass',
      paint:{
        'circle-color':'#153f48','circle-radius':['step',['get','count'],16,3,20,15,24,35,30],
        'circle-stroke-color':'#99ffdf','circle-stroke-width':2.8,'circle-opacity':.93
      }});
    map.addLayer({id:'atlas-compass-count',type:'symbol',source:'atlas-compass',
      layout:{'text-field':['to-string',['get','count']],'text-size':15,'text-font':['Noto Sans Regular'],'text-allow-overlap':true,'text-ignore-placement':true},
      paint:{'text-color':'#b9ffe5'}});
    map.addSource('atlas-venue',{type:'geojson',data:blank});
    map.addLayer({id:'atlas-venue-point',type:'circle',source:'atlas-venue',
      paint:{'circle-color':'#f6bd80','circle-radius':11,'circle-stroke-color':'#101b27','circle-stroke-width':3}});
    map.addSource('atlas-employers',{type:'geojson',data:blank,cluster:true,clusterRadius:58,clusterMaxZoom:14});
    map.addLayer({id:'atlas-employer-clusters',type:'circle',source:'atlas-employers',
      filter:['has','point_count'],
      paint:{'circle-color':'#492636','circle-radius':['step',['get','point_count'],19,4,24,8,29],
        'circle-stroke-color':'#ff87bd','circle-stroke-width':2.5}});
    map.addLayer({id:'atlas-employer-cluster-count',type:'symbol',source:'atlas-employers',
      filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],
        'text-size':13,'text-font':['Noto Sans Regular'],'text-ignore-placement':true},
      paint:{'text-color':'#ffffff'}});
    map.addLayer({id:'atlas-employer-point',type:'circle',source:'atlas-employers',
      filter:['!', ['has','point_count']],
      paint:{'circle-color':'#ff87bd','circle-radius':10,'circle-stroke-color':'#111a27','circle-stroke-width':3}});

    map.on('click','atlas-compass-bubbles', e=>{
      const id=e.features?.[0]?.properties?.key;
      readCompass(city.compassGroups.get(id));
    });
    map.on('click','atlas-venue-point',()=>readVenue());
    map.on('click','atlas-employer-point',e=>{
      const id=e.features?.[0]?.properties?.id;
      const match=city.employers.find(x=>x.id===id);
      if(match)readEmployer([match],false);
    });
    map.on('click','atlas-employer-clusters',async e=>{
      const feature=e.features?.[0];
      if(!feature)return;
      const clusterId=feature.properties.cluster_id;
      const source=map.getSource('atlas-employers');
      try{
        const leaves=await source.getClusterLeaves(clusterId,100,0);
        const ids=new Set(leaves.map(f=>f.properties.id));
        const matches=city.employers.filter(x=>ids.has(x.id));
        readEmployer(matches,true);
        const zoom=await source.getClusterExpansionZoom(clusterId);
        if(Number.isFinite(zoom) && zoom>map.getZoom())
          map.easeTo({center:feature.geometry.coordinates,zoom,duration:550});
      }catch(error){
        console.warn('Could not expand employer cluster',error);
        map.easeTo({center:feature.geometry.coordinates,zoom:Math.min(15,map.getZoom()+1),duration:500});
      }
    });
    const clickLayers=['atlas-compass-bubbles','atlas-employer-point','atlas-employer-clusters','atlas-venue-point'];
    for(const layer of clickLayers){
      map.on('mouseenter',layer,()=>{map.getCanvas().style.cursor='pointer';});
      map.on('mouseleave',layer,()=>{map.getCanvas().style.cursor='';});
    }
  }

  function render(){
    if(!city.ready || !city.map)return;
    const g=coordinateGroups(city.organizations);
    city.compassGroups=new Map(g.map((group,i)=>['compass-'+i,group]));
    const compass=fc(g.map((group,i)=>
      point(group.lng,group.lat,{key:'compass-'+i,count:group.records.length})));
    const employers=fc(city.employers
      .filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lng))
      .map(e=>point(e.lng,e.lat,{id:e.id,sector:e.sector,name:e.name})));
    const venues=city.venue && Number.isFinite(city.venue.lat)&&Number.isFinite(city.venue.lng)
      ? fc([point(city.venue.lng,city.venue.lat,{name:city.venue.name})]):fc([]);
    city.map.getSource('atlas-compass').setData(compass);
    city.map.getSource('atlas-employers').setData(employers);
    city.map.getSource('atlas-venue').setData(venues);
  }

  function start(){
    const element=$('city-map');
    if(!element)return;
    if(!window.maplibregl || !window.maplibregl.supported()){
      unavailable();return;
    }
    const lib=window.maplibregl;
    try{
      const map=new lib.Map({
        container:element,
        style:DARK,
        center:[-123.08,49.235],
        zoom:10.4,
        minZoom:8.7,
        maxZoom:17.5,
        attributionControl:true,
        dragRotate:false,
        pitchWithRotate:false,
        cooperativeGestures:false
      });
      city.map=map;
      // Scrolling the WordPress page must never unexpectedly zoom the inner map.
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.addControl(new lib.NavigationControl({showCompass:false}),'top-right');
      map.on('load',()=>{
        city.loaded=true;
        city.ready=true;
        layers();
        render();
        map.fitBounds([[-123.33,49.07],[-122.63,49.37]],{
          padding:{top:65,bottom:60,left:35,right:35},duration:0,maxZoom:11.5
        });
      });
      map.on('error',event=>{
        if(city.loaded)return;
        console.warn('Vector map style did not load cleanly',event.error);
        if(!city.triedFallback){
          city.triedFallback=true;
          map.setStyle(LIBERTY);
        }else{
          unavailable();
        }
      });
      // A refused style can otherwise leave a permanent blank map.
      window.setTimeout(()=>{if(!city.loaded)unavailable();},20000);
    }catch(error){
      console.warn('Real street map unavailable; source directories remain functional',error);
      unavailable();
    }
  }

  function update(next){
    city.employers=Array.isArray(next.employers)?next.employers:[];
    city.organizations=Array.isArray(next.organizations)?next.organizations:[];
    city.venue=next.venue||null;
    render();
  }

  window.AfterimageCityMap={start,update};
})();