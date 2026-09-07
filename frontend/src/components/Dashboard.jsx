import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, AlertTriangle, CalendarDays, Check, ChevronRight, Database, Download,
  Layers3, Leaf, MapPin, MousePointer2, Play, Ruler, Search, Satellite,
  TreePine, X, ZoomIn, ZoomOut
} from 'lucide-react';
import {
  FOREST_BOUNDARY, FOREST_SEARCHES, PROCESSING_STEPS, LAYER_COLORS,
  ANALYTICS_DEMO, CANOPIES_GEOJSON, CHANGES_GEOJSON
} from '../data/demoData';
import { analyzeForest, detectCanopy, getChanges, getLayer, getReport, searchForest } from '../api/client';

const DEFAULT_FOREST = FOREST_SEARCHES[0];
const YEARS = [2022, 2023, 2024, 2025, 2026];
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function Metric({ icon: Icon, label, value, unit }) {
  return <div className="metric-card"><div className="metric-label"><Icon size={13}/> {label}</div><div className="metric-value">{value}<span className="metric-unit"> {unit}</span></div></div>;
}

function Confidence({ value = 0, label = 'Confidence' }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const cls = safe >= 85 ? 'high' : safe >= 70 ? 'med' : 'low';
  return <div className="confidence-bar"><div className="confidence-header"><span>{label}</span><b className={`confidence-value ${cls}`}>{safe}%</b></div><div className="confidence-track"><div className={`confidence-fill ${cls}`} style={{ width: `${safe}%` }}/></div></div>;
}

function LayerToggle({ label, active, color, onToggle, source = 'DEMO' }) {
  return <button type="button" className="layer-item" onClick={onToggle} aria-pressed={active}>
    <span className={`layer-switch ${active ? 'active' : ''}`} style={active ? { background: color, borderColor: color } : {}}><span/></span>
    <span className="layer-dot" style={{ background: active ? color : 'rgba(255,255,255,.16)' }}/>
    <span className="layer-label">{label}</span><small className={source === 'LIVE' ? 'live' : ''}>{source}</small>
  </button>;
}

function OfflineForestMap({ boundary, canopies, changes, layers, selectedTree, selectedChange, drawMode, aoiPoints, onMapClick, onSelectTree, onSelectChange, onZoom }) {
  const vb = { minX: 76.0, maxX: 76.29, minY: 11.56, maxY: 11.83 };
  const project = ([lng, lat]) => [((lng - vb.minX) / (vb.maxX - vb.minX)) * 1000, ((vb.maxY - lat) / (vb.maxY - vb.minY)) * 650];
  const polygonPoints = (coords) => coords.map(project).map(([x,y]) => `${x},${y}`).join(' ');
  const boundaryCoords = boundary?.features?.[0]?.geometry?.coordinates?.[0] || [];
  const visibleCanopies = (canopies?.features || []).slice(0, 220);
  const visibleChanges = changes?.features || [];
  const aoiPath = aoiPoints.map(project).map(([x,y]) => `${x},${y}`).join(' ');
  return <div className="offline-map" role="application" aria-label="SylvaSense forest map">
    <div className="offline-map-grid"/>
    <svg viewBox="0 0 1000 650" preserveAspectRatio="none" className="offline-map-svg" onClick={onMapClick}>
      <defs><linearGradient id="forestSurface" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#173b29"/><stop offset="1" stopColor="#07150d"/></linearGradient></defs>
      <rect width="1000" height="650" fill="url(#forestSurface)"/>
      <path d="M0 510 C180 420 260 530 430 455 S730 390 1000 470 L1000 650 L0 650Z" fill="#0b2618" opacity=".8"/>
      {boundaryCoords.length > 2 && <polygon points={polygonPoints(boundaryCoords)} fill="rgba(0,230,118,.10)" stroke="#00e676" strokeWidth="3"/>}
      {layers.sentinel2 && <g opacity=".3"><rect x="80" y="110" width="220" height="150" fill="#69f0ae"/><rect x="310" y="270" width="210" height="180" fill="#00c853"/><rect x="560" y="90" width="250" height="190" fill="#26a69a"/><rect x="700" y="350" width="190" height="160" fill="#69f0ae"/></g>}
      {layers.ndvi && <g opacity=".25"><circle cx="300" cy="230" r="130" fill="#00c853"/><circle cx="670" cy="380" r="150" fill="#69f0ae"/><circle cx="800" cy="180" r="100" fill="#00e676"/></g>}
      {layers.lidar && <g opacity=".28" fill="#7e57c2">{[...Array(45)].map((_,i)=><circle key={i} cx={120+(i*97)%760} cy={100+(i*53)%430} r={3+(i%5)}/>)}</g>}
      {layers.sentinel1 && <g opacity=".22" stroke="#00bcd4" strokeWidth="2">{[0,1,2,3,4,5].map(i=><path key={i} d={`M${70+i*155} 80 Q${180+i*140} 320 ${70+i*155} 570`}/>)} </g>}
      {layers.change && visibleChanges.map((f,i)=><polygon key={f.properties.id || i} points={polygonPoints(f.geometry.coordinates[0])} fill={f.properties.status === 'Potential Canopy Loss' ? '#ef5350' : f.properties.status === 'Vegetation Recovery' ? '#42a5f5' : '#ffa726'} opacity=".48" stroke="#fff" strokeWidth="1.5" onClick={(e)=>{e.stopPropagation(); onSelectChange(f.properties)}}/>)}
      {layers.canopy && visibleCanopies.map((f,i)=><polygon key={f.properties.id || i} points={polygonPoints(f.geometry.coordinates[0])} fill={f.properties.id === selectedTree?.id ? '#ffca28' : '#00e676'} opacity={f.properties.id === selectedTree?.id ? '.9' : '.5'} stroke={f.properties.id === selectedTree?.id ? '#fff' : '#00e676'} strokeWidth={f.properties.id === selectedTree?.id ? '3' : '1'} onClick={(e)=>{e.stopPropagation(); onSelectTree(f.properties)}}/>)}
      {aoiPoints.map((p,i)=>{const [x,y]=project(p); return <circle key={i} cx={x} cy={y} r="6" fill="#ffca28" stroke="#07150d" strokeWidth="3"/>})}
      {aoiPoints.length > 1 && <polyline points={aoiPath} fill="none" stroke="#ffca28" strokeWidth="3" strokeDasharray="8 6"/>}
    </svg>
    <div className="offline-map-label"><MapPin size={13}/> Wayanad, Kerala · Offline demo map</div>
    <div className="offline-map-controls"><button type="button" onClick={()=>onZoom(1)} title="Zoom in"><ZoomIn size={16}/></button><button type="button" onClick={()=>onZoom(-1)} title="Zoom out"><ZoomOut size={16}/></button></div>
    <div className="offline-map-note">{drawMode ? 'AOI mode: click the map to add points.' : 'Add a Mapbox token for live basemap tiles.'}</div>
  </div>;
}


function LeafletMapBridge({ mapRef, center, zoom }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; return () => { if (mapRef.current === map) mapRef.current = null; }; }, [map, mapRef]);
  const [lng, lat] = center;
  useEffect(() => {
    map.flyTo([lat, lng], zoom || 11, { duration: 1.0 });
  }, [map, lat, lng, zoom]);
  return null;
}

function ForestLeafletMap({
  mapRef, selectedForest, layers, remoteLayers, aoi, aoiPoints, drawMode,
  filteredCanopies, changes, selectedTree, onSelectTree, onSelectChange,
  onMapClick
}) {
  const [satellite, setSatellite] = useState(false);
  const center = [selectedForest.coords[1], selectedForest.coords[0]];
  const canopyStyle = (feature) => {
    const selected = feature?.properties?.id === selectedTree?.id;
    return {
      color: selected ? '#ffffff' : '#00e676',
      weight: selected ? 3 : 1.5,
      fillColor: selected ? '#ffca28' : '#00e676',
      fillOpacity: selected ? 0.82 : 0.48
    };
  };
  const changeStyle = (feature) => ({
    color: '#ffffff',
    weight: 1.5,
    fillColor: feature?.properties?.status === 'Potential Canopy Loss' ? '#ef5350' : feature?.properties?.status === 'Vegetation Recovery' ? '#42a5f5' : '#ffa726',
    fillOpacity: 0.42
  });
  const eventsFor = (onSelect) => ({
    click: (e) => { e.originalEvent?.stopPropagation(); onSelect(e.layer.feature.properties); }
  });
  const remoteColors = { sentinel2: '#69f0ae', ndvi: '#00c853', sentinel1: '#00bcd4', lidar: '#7e57c2' };

  return (
    <div className="leaflet-map-shell">
      <MapContainer
        center={center}
        zoom={selectedForest.zoom || 11}
        zoomControl={false}
        scrollWheelZoom
        doubleClickZoom
        className="leaflet-map"
        eventHandlers={{ click: onMapClick }}
      >
        <LeafletMapBridge mapRef={mapRef} center={selectedForest.coords} zoom={selectedForest.zoom || 11} />
        {satellite ? (
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <ZoomControl position="bottomright" />
        {layers.boundary && <GeoJSON data={FOREST_BOUNDARY} style={() => ({ color: '#00e676', weight: 3, fillColor: '#00e676', fillOpacity: 0.08 })} />}
        {Object.keys(remoteLayers).map(name => layers[name] && remoteLayers[name] && (
          <GeoJSON key={name} data={remoteLayers[name]} style={() => ({ color: remoteColors[name] || '#26a69a', weight: 1, fillColor: remoteColors[name] || '#26a69a', fillOpacity: 0.22 })} />
        ))}
        {aoi && <GeoJSON data={{ type: 'Feature', geometry: aoi, properties: {} }} style={() => ({ color: '#ffca28', weight: 3, dashArray: '8 6', fillColor: '#ffca28', fillOpacity: 0.12 })} />}
        {drawMode && aoiPoints.length > 0 && <>
          <Polyline positions={aoiPoints.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: '#ffca28', weight: 3, dashArray: '8 6' }} />
          {aoiPoints.map(([lng, lat], i) => <CircleMarker key={`${lng}-${lat}-${i}`} center={[lat, lng]} radius={6} pathOptions={{ color: '#07150d', weight: 3, fillColor: '#ffca28', fillOpacity: 1 }} />)}
        </>}
        {layers.canopy && filteredCanopies && <GeoJSON key={`canopies-${selectedTree?.id || 'none'}`} data={filteredCanopies} style={canopyStyle} onEachFeature={(feature, layer) => layer.on(eventsFor(onSelectTree))} />}
        {layers.change && changes && <GeoJSON key="changes" data={changes} style={changeStyle} onEachFeature={(feature, layer) => layer.on(eventsFor(onSelectChange))} />}
      </MapContainer>
      <button type="button" className="leaflet-basemap-toggle" onClick={() => setSatellite(v => !v)}>{satellite ? 'Map' : 'Satellite'}</button>
      <div className="leaflet-map-label"><MapPin size={13}/> Wayanad, Kerala · Interactive map</div>
      <div className="leaflet-basemap-note">{satellite ? 'Satellite imagery · Esri' : 'Street map · OpenStreetMap'}</div>
    </div>
  );
}

export default function Dashboard({ onBack }) {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState({ longitude: DEFAULT_FOREST.coords[0], latitude: DEFAULT_FOREST.coords[1], zoom: DEFAULT_FOREST.zoom });
  const [selectedForest, setSelectedForest] = useState(DEFAULT_FOREST);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [layers, setLayers] = useState({ boundary:true, sentinel2:false, ndvi:false, sentinel1:false, lidar:false, canopy:false, biomass:false, carbon:false, change:false });
  const [remoteLayers, setRemoteLayers] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [canopies, setCanopies] = useState(null);
  const [changes, setChanges] = useState(null);
  const [selectedTree, setSelectedTree] = useState(null);
  const [selectedChange, setSelectedChange] = useState(null);
  const [treeSearch, setTreeSearch] = useState('');
  const [filterHeight, setFilterHeight] = useState(0);
  const [filterConf, setFilterConf] = useState(0);
  const [timelineStart, setTimelineStart] = useState(2022);
  const [timelineEnd, setTimelineEnd] = useState(2026);
  const [drawMode, setDrawMode] = useState(false);
  const [aoiPoints, setAoiPoints] = useState([]);
  const [aoi, setAoi] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [mobilePanel, setMobilePanel] = useState(false);

  const toast = useCallback((message, type='info') => { const id = Date.now()+Math.random(); setToasts(t=>[...t,{id,message,type}]); window.setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200); }, []);

  const selectForest = useCallback((forest) => {
    const f = { ...forest, id: forest.id || `F-${String(forest.name).toUpperCase().replace(/[^A-Z0-9]+/g,'-').slice(0,24)}` };
    setSelectedForest(f); setSearchQuery(f.name); setSearchResults([]); setAnalysisComplete(false); setAnalysis(null); setCanopies(null); setChanges(null); setSelectedTree(null); setSelectedChange(null); setAoi(null); setAoiPoints([]);
    mapRef.current?.flyTo([f.coords[1], f.coords[0]], f.zoom || 11, { duration: 1.2 });
    toast(`Located ${f.name}`, 'success');
  }, [toast]);

  const onSearch = async (e) => { const q=e.target.value; setSearchQuery(q); if(q.trim().length<2){setSearchResults([]);return;} const results=await searchForest(q); setSearchResults(results); };

  const handleMapClick = (e) => {
    if(drawMode){ const p=[e.lngLat.lng,e.lngLat.lat]; setAoiPoints(prev=>[...prev,p]); return; }
    const feature=(e.features||[]).find(f=>['canopy-fill','change-fill'].includes(f.layer?.id));
    if(!feature){setSelectedTree(null);setSelectedChange(null);return;}
    if(feature.layer.id==='canopy-fill')setSelectedTree(feature.properties); else setSelectedChange(feature.properties);
  };
  const handleOfflineClick = (e) => {
    if(!drawMode) return;
    const rect=e.currentTarget.getBoundingClientRect();
    const x=Math.max(0,Math.min(1000,((e.clientX-rect.left)/rect.width)*1000));
    const y=Math.max(0,Math.min(650,((e.clientY-rect.top)/rect.height)*650));
    const lng=76.0+(x/1000)*.29; const lat=11.83-(y/650)*.27;
    setAoiPoints(p=>[...p,[lng,lat]]);
  };

  const finishAOI=()=>{ if(aoiPoints.length<3){toast('Add at least 3 points first','error');return;} const geometry={type:'Polygon',coordinates:[[...aoiPoints,aoiPoints[0]]]}; setAoi(geometry);setDrawMode(false);toast('AOI created — ready to analyze','success'); };
  const clearAOI=()=>{setAoiPoints([]);setAoi(null);setDrawMode(false);};

  const runAnalysis=async()=>{
    if(isAnalyzing)return;
    setIsAnalyzing(true);setAnalysisComplete(false);setSelectedTree(null);setSelectedChange(null);setAnalysisProgress(0);
    const payload={forest_id:selectedForest.id || 'F-WAYANAD-01',geometry:aoi,start_year:timelineStart,end_year:timelineEnd};
    try{
      const result=await analyzeForest(payload);
      for(let i=0;i<PROCESSING_STEPS.length;i++){setAnalysisStep(i);setAnalysisProgress(Math.round((i/(PROCESSING_STEPS.length-1))*100));await new Promise(r=>setTimeout(r,180));}
      const canopyResult=await detectCanopy(payload);
      setAnalysis(result);setCanopies(canopyResult.geojson || CANOPIES_GEOJSON);setAnalysisComplete(true);setLayers(l=>({...l,canopy:true,boundary:true}));toast('Forest analysis complete','success');
    }catch(err){toast(`Analysis failed: ${err.message}. Demo data remains available.`,'error');setAnalysis({metrics:ANALYTICS_DEMO});setCanopies(CANOPIES_GEOJSON);setAnalysisComplete(true);setLayers(l=>({...l,canopy:true,boundary:true}));}
    finally{setIsAnalyzing(false);}
  };

  const loadLayer=async(name)=>{
    const next=!layers[name]; setLayers(l=>({...l,[name]:next}));
    if(next && !remoteLayers[name]){try{const d=await getLayer(name,aoi);setRemoteLayers(x=>({...x,[name]:d}));}catch{toast(`${name} API unavailable — using available demo layers`,'error');}}
  };
  const runChanges=async()=>{if(timelineStart===timelineEnd){toast('Choose two different years','error');return;}try{const d=await getChanges(timelineStart,timelineEnd);setChanges(d);setLayers(l=>({...l,change:true}));toast(`Compared ${timelineStart} → ${timelineEnd}`,'success');}catch{setChanges(CHANGES_GEOJSON);setLayers(l=>({...l,change:true}));toast('Using prepared temporal demo data','info');}};
  const filteredCanopies=useMemo(()=>canopies?{...canopies,features:(canopies.features||[]).filter(f=>Number(f.properties.height_m)>=filterHeight&&Number(f.properties.confidence_pct)>=filterConf)}:null,[canopies,filterHeight,filterConf]);
  const A=analysis?.metrics || ANALYTICS_DEMO;
  const locateTree=(value)=>{setTreeSearch(value);if(!canopies||!value)return;const f=canopies.features.find(x=>String(x.properties.id).toLowerCase()===value.toLowerCase());if(f){setSelectedTree(f.properties);mapRef.current?.flyTo([f.properties.center_lat,f.properties.center_lng],15,{duration:0.7});toast(`${f.properties.id} located`,'success');}else toast('Tree ID not found in current analysis','error');};
  const downloadReport=async()=>{try{const data=await getReport(analysis?.analysis_id||'DEMO-001');const lines=[data.title,'='.repeat(48),`Forest: ${selectedForest.name}`,`Generated: ${new Date().toLocaleString()}`,'','FOREST METRICS',`Area: ${A.total_area_ha} ha`,`Canopies: ${A.detected_canopies}`,`Coverage: ${A.canopy_coverage_pct}%`,`Average height: ${A.avg_height_m} m`,`AGB: ${A.total_agb_mg} Mg`,`Carbon: ${A.total_carbon_mg} Mg C`,'','HISTORICAL ANALYSIS',`${timelineStart} → ${timelineEnd}`,`Change areas: ${changes?.features?.length||0}`,'','METHODOLOGY','AI-assisted canopy identification with prepared prototype inference.',`Carbon = AGB × ${data.methodology?.carbon_factor ?? .47}.`,'','LIMITATIONS','Prototype analytical estimates; not legal carbon-credit certification.'];const blob=new Blob([lines.join('\n')],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='sylvasense-forest-report.txt';a.click();URL.revokeObjectURL(url);toast('Report downloaded','success');}catch{toast('Could not generate report','error');}};

  return <div className="dashboard-v3">
    <header className="dash-nav-v3">
      <button type="button" className="brand-button" onClick={onBack}><span className="brand-mark">🌲</span><span><b>SYLVASENSE</b><small>FOREST INTELLIGENCE</small></span></button>
      <div className="top-search"><Search size={18}/><input value={searchQuery} onChange={onSearch} placeholder="Search forest, reserve, district or coordinates…"/><span className="search-shortcut">⌘ K</span>{searchResults.length>0&&<div className="search-dropdown">{searchResults.slice(0,6).map((r,i)=><button type="button" key={r.id||r.name||i} onClick={()=>selectForest(r)}><MapPin size={15}/><span><b>{r.name}</b><small>{r.type||'Forest'} · {r.district||'Location'}</small></span><ChevronRight size={14}/></button>)}</div>}</div>
      <div className="nav-actions"><span className="system-status"><i/> Prototype ready</span><button type="button" className="nav-icon-btn" onClick={onBack} title="Back to home">Home</button><button type="button" className="mobile-panel-btn" onClick={()=>setMobilePanel(v=>!v)}>Controls</button></div>
    </header>

    <aside className={`control-sidebar ${mobilePanel?'mobile-open':''}`}>
      <div className="sidebar-mobile-close"><b>Forest Controls</b><button type="button" onClick={()=>setMobilePanel(false)}><X size={18}/></button></div>
      <section className="workflow-card"><div className="section-title-row"><div><span className="eyebrow">STEP 01</span><h2>Choose your forest</h2></div><span className="step-status"><Check size={12}/> Ready</span></div><div className="selected-forest"><div className="forest-icon"><TreePine size={20}/></div><div><b>{selectedForest.name}</b><span>{selectedForest.district} · {selectedForest.type}</span><small>{selectedForest.area_ha ? `${Number(selectedForest.area_ha).toLocaleString()} ha` : 'Custom location'}</small></div></div></section>

      <section className="control-section"><div className="section-heading"><Layers3 size={16}/><div><b>Map layers</b><small>Turn data views on or off</small></div></div>
        <LayerToggle label="Forest boundary" active={layers.boundary} color={LAYER_COLORS.boundary} onToggle={()=>setLayers(l=>({...l,boundary:!l.boundary}))} source="DATA"/>
        <LayerToggle label="Sentinel-2 optical" active={layers.sentinel2} color={LAYER_COLORS.sentinel2} onToggle={()=>loadLayer('sentinel2')}/>
        <LayerToggle label="NDVI vegetation" active={layers.ndvi} color={LAYER_COLORS.ndvi} onToggle={()=>loadLayer('ndvi')}/>
        <LayerToggle label="Sentinel-1 SAR" active={layers.sentinel1} color={LAYER_COLORS.sentinel1} onToggle={()=>loadLayer('sentinel1')}/>
        <LayerToggle label="LiDAR / GEDI height" active={layers.lidar} color={LAYER_COLORS.lidar} onToggle={()=>loadLayer('lidar')}/>
        <LayerToggle label="AI canopy" active={layers.canopy} color={LAYER_COLORS.canopy} onToggle={()=>setLayers(l=>({...l,canopy:!l.canopy}))} source={analysisComplete?'AI':'DEMO'}/>
        <LayerToggle label="Forest change" active={layers.change} color={LAYER_COLORS.change} onToggle={()=>setLayers(l=>({...l,change:!l.change}))} source="DEMO"/>
      </section>

      <section className="control-section"><div className="section-heading"><MapPin size={16}/><div><b>Area of interest</b><small>Draw the area you want to analyze</small></div></div><button type="button" className={`big-action draw ${drawMode?'active':''}`} onClick={()=>setDrawMode(v=>!v)}><MousePointer2 size={17}/>{drawMode?'Drawing on map…':'Draw forest area'}</button>{aoiPoints.length>0&&<div className="aoi-status"><span>{aoiPoints.length} points</span><span>{aoi?'AOI ready':'Add at least 3'}</span></div>}<div className="button-row"><button type="button" onClick={finishAOI} disabled={aoiPoints.length<3}>Finish AOI</button><button type="button" onClick={clearAOI} disabled={!aoiPoints.length}>Clear</button></div></section>

      <section className="control-section analysis-section"><div className="section-heading"><Activity size={16}/><div><b>Forest analysis</b><small>Run the full intelligence pipeline</small></div></div><button type="button" className="big-action analyze" onClick={runAnalysis} disabled={isAnalyzing}><Play size={17}/>{isAnalyzing?'Analyzing forest…':'Analyze forest'}</button><div className="pipeline-mini"><span>Satellite</span><b>→</b><span>AI canopy</span><b>→</b><span>AGB</span><b>→</b><span>Carbon</span></div></section>

      <section className="control-section"><div className="section-heading"><Search size={16}/><div><b>Find a canopy</b><small>Inspect a detected tree crown</small></div></div><div className="tree-search"><Search size={15}/><input value={treeSearch} onChange={e=>locateTree(e.target.value)} placeholder="e.g. T-0024"/><button type="button" onClick={()=>locateTree(treeSearch)}>Find</button></div>{analysisComplete&&<><label className="range-label">Minimum height <b>{filterHeight} m</b></label><input type="range" min="0" max="40" value={filterHeight} onChange={e=>setFilterHeight(Number(e.target.value))}/><label className="range-label">Minimum confidence <b>{filterConf}%</b></label><input type="range" min="0" max="99" value={filterConf} onChange={e=>setFilterConf(Number(e.target.value))}/></>}</section>

      <section className="control-section"><div className="section-heading"><CalendarDays size={16}/><div><b>Historical change</b><small>Compare forest condition</small></div></div><div className="year-row"><select value={timelineStart} onChange={e=>setTimelineStart(Number(e.target.value))}>{YEARS.map(y=><option key={y}>{y}</option>)}</select><span>to</span><select value={timelineEnd} onChange={e=>setTimelineEnd(Number(e.target.value))}>{YEARS.map(y=><option key={y}>{y}</option>)}</select></div><button type="button" className="secondary-action" onClick={runChanges}><Activity size={15}/> Compare years</button></section>

      <section className="control-section"><div className="section-heading"><Download size={16}/><div><b>Export</b><small>Save an analysis summary</small></div></div><button type="button" className="secondary-action" onClick={downloadReport}><Download size={15}/> Download forest report</button></section>
      <div className="science-note"><b>Scientific note</b><p>Tree-level results are AI-assisted prototype estimates. High-resolution or prepared canopy data is used for segmentation. Change alerts describe potential change, not legal deforestation.</p></div>
    </aside>

    <main className="map-workspace">
      <div className="map-header"><div><span className="eyebrow">LIVE FOREST MAP</span><h1>{selectedForest.name}</h1><p><MapPin size={13}/> {selectedForest.district} · {selectedForest.area_ha ? `${Number(selectedForest.area_ha).toLocaleString()} ha` : 'Selected location'}</p></div><div className="map-header-actions"><button type="button" onClick={()=>setLayers(l=>({...l,boundary:true}))}><Layers3 size={15}/> Boundary</button><button type="button" onClick={()=>{setDrawMode(true);toast('Click 3+ points on the map, then Finish AOI','info')}} className={drawMode?'active':''}><MapPin size={15}/> {drawMode?'Drawing':'Draw AOI'}</button></div></div>
      <div className="map-stage">
        <ForestLeafletMap
          mapRef={mapRef}
          selectedForest={selectedForest}
          layers={layers}
          remoteLayers={remoteLayers}
          aoi={aoi}
          aoiPoints={aoiPoints}
          drawMode={drawMode}
          filteredCanopies={filteredCanopies}
          changes={changes}
          selectedTree={selectedTree}
          onSelectTree={setSelectedTree}
          onSelectChange={setSelectedChange}
          onMapClick={(e) => {
            if (!drawMode) return;
            const { lat, lng } = e.latlng;
            setAoiPoints(prev => [...prev, [lng, lat]]);
          }}
        />
        <div className="map-status-card"><div className="map-status-top"><span className="status-dot-large"/><b>LIVE MAP</b><span>OpenStreetMap</span></div><div className="map-status-grid"><span><b>{analysisComplete?Number(A.detected_canopies).toLocaleString():'—'}</b> canopies</span><span><b>{analysisComplete?A.avg_height_m:'—'}</b> avg height</span><span><b>{analysisComplete?A.total_carbon_mg:'—'}</b> Mg C</span></div></div>
        <div className="map-legend"><b>Map legend</b>{layers.boundary&&<span><i style={{background:LAYER_COLORS.boundary}}/> Forest boundary</span>}{layers.canopy&&<span><i style={{background:LAYER_COLORS.canopy}}/> AI canopy</span>}{layers.change&&<span><i style={{background:LAYER_COLORS.change}}/> Potential canopy loss</span>}{layers.lidar&&<span><i style={{background:LAYER_COLORS.lidar}}/> LiDAR height</span>}</div>
        {drawMode&&<div className="draw-banner"><MousePointer2 size={16}/><div><b>Draw your analysis area</b><span>Click at least 3 points on the map, then choose <strong>Finish AOI</strong>.</span></div></div>}
        {selectedTree&&<div className="detail-panel"><div className="detail-header"><div><span className="eyebrow">CANOPY DETAIL</span><h2>{selectedTree.id}</h2></div><button type="button" onClick={()=>setSelectedTree(null)}><X size={17}/></button></div><div className="detail-grid"><Metric icon={Leaf} label="Canopy area" value={selectedTree.area_m2} unit="m²"/><Metric icon={Ruler} label="Height" value={selectedTree.height_m} unit="m"/><Metric icon={Activity} label="Density" value={selectedTree.density_pct} unit="%"/><Metric icon={Database} label="AGB" value={selectedTree.agb_mg} unit="Mg"/></div><div className="carbon-highlight"><span>Estimated carbon stock</span><b>{selectedTree.carbon_mg} Mg C</b></div><Confidence value={selectedTree.confidence_pct} label="AI detection confidence"/><p className="detail-coord"><MapPin size={13}/> {Number(selectedTree.center_lat).toFixed(5)}°N, {Number(selectedTree.center_lng).toFixed(5)}°E</p><div className="detail-note">AI-assisted canopy identification. Biomass and carbon are prototype analytical estimates.</div></div>}
        {selectedChange&&<div className="detail-panel change-detail"><div className="detail-header"><div><span className="eyebrow">CHANGE ALERT</span><h2>{selectedChange.status}</h2></div><button type="button" onClick={()=>setSelectedChange(null)}><X size={17}/></button></div><div className="alert-summary"><b>{selectedChange.affected_area_ha} ha</b><span>{selectedChange.period||selectedChange.comparison}</span></div><p><strong>Where:</strong> {selectedChange.zone}</p><p><strong>Evidence:</strong></p><ul>{(Array.isArray(selectedChange.evidence)?selectedChange.evidence:[selectedChange.evidence]).map((x,i)=><li key={i}>{x}</li>)}</ul><Confidence value={selectedChange.confidence_pct} label="Change confidence"/><div className="detail-note">This is verification support/evidence assessment, not a legal determination.</div></div>}
        {!selectedTree&&!selectedChange&&!drawMode&&<div className="map-help"><MousePointer2 size={15}/><span>Turn on <b>AI canopy</b>, then click a canopy to inspect it.</span></div>}
      </div>

      <section className="results-strip"><div className="results-heading"><span className="eyebrow">FOREST INTELLIGENCE</span><b>{analysisComplete?'Analysis complete':'Run analysis to populate results'}</b></div><Metric icon={TreePine} label="Forest area" value={analysisComplete?(Number(A.total_area_ha)/1000).toFixed(1)+'K':'—'} unit="ha"/><Metric icon={Leaf} label="Canopies" value={analysisComplete?Number(A.detected_canopies).toLocaleString():'—'} unit="detected"/><Metric icon={Activity} label="Coverage" value={analysisComplete?A.canopy_coverage_pct:'—'} unit="%"/><Metric icon={Ruler} label="Avg height" value={analysisComplete?A.avg_height_m:'—'} unit="m"/><Metric icon={Database} label="AGB" value={analysisComplete?Number(A.total_agb_mg).toLocaleString():'—'} unit="Mg"/><Metric icon={Leaf} label="Carbon" value={analysisComplete?Number(A.total_carbon_mg).toLocaleString():'—'} unit="Mg C"/></section>
    </main>

    {isAnalyzing&&<div className="processing-overlay-v3"><div className="processing-card-v3"><div className="processing-icon">🌿</div><span className="eyebrow">AI FOREST ANALYSIS</span><h2>Understanding the forest…</h2><div className="progress-track-v3"><div style={{width:`${analysisProgress}%`}}/></div><div className="progress-meta"><b>{analysisProgress}%</b><span>{PROCESSING_STEPS[analysisStep]}</span></div><div className="processing-steps">{PROCESSING_STEPS.map((s,i)=><div key={s} className={i<analysisStep?'done':i===analysisStep?'active':''}><span>{i<analysisStep?'✓':i===analysisStep?'●':'○'}</span>{s}</div>)}</div></div></div>}
    <div className="toast-stack">{toasts.map(t=><div key={t.id} className={`toast-v3 ${t.type}`}>{t.type==='success'?<Check size={15}/>:<AlertTriangle size={15}/>} {t.message}</div>)}</div>
  </div>;
}
