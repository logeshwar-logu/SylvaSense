// ============================================================
// DEMO DATA — Precomputed fallback for hackathon demonstration
// ============================================================

// Wayanad center coordinates
export const WAYANAD_CENTER = [76.1320, 11.6854];
export const WAYANAD_ZOOM = 11;

// Forest boundary polygon (demo)
export const FOREST_BOUNDARY = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.0200, 11.5800],
          [76.2600, 11.5750],
          [76.2800, 11.7100],
          [76.2400, 11.8000],
          [76.1500, 11.8200],
          [76.0500, 11.7800],
          [76.0100, 11.6900],
          [76.0200, 11.5800],
        ]]
      },
      properties: {
        id: "F-WAYANAD-01",
        name: "Wayanad Wildlife Sanctuary & Forest Reserve",
        district: "Wayanad, Kerala, India",
        area_ha: 48600,
        type: "Wildlife Sanctuary + Reserved Forest",
        coordinates: "11.6854°N, 76.1320°E"
      }
    }
  ]
};

// Generate canopies procedurally (deterministic seed simulation)
function generateCanopies() {
  const features = [];
  const center = WAYANAD_CENTER;
  // pseudo-random but deterministic
  const seed = (n) => {
    let x = Math.sin(n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };

  const count = 312;
  for (let i = 0; i < count; i++) {
    const lng = center[0] + (seed(i * 3 + 0) - 0.5) * 0.18;
    const lat = center[1] + (seed(i * 3 + 1) - 0.5) * 0.18;
    const rDeg = 0.00006 + seed(i * 3 + 2) * 0.00012;
    const numPts = 7;
    const pts = [];
    for (let j = 0; j < numPts; j++) {
      const angle = (j / numPts) * Math.PI * 2;
      const r = rDeg * (0.75 + seed(i * 7 + j) * 0.5);
      pts.push([lng + r * Math.cos(angle), lat + r * Math.sin(angle)]);
    }
    pts.push(pts[0]);

    const areaSqM = Math.PI * Math.pow(rDeg * 111320, 2);
    const height = 10 + seed(i + 100) * 28;
    const density = 55 + Math.floor(seed(i + 200) * 45);
    const conf = 74 + Math.floor(seed(i + 300) * 25);
    const agb = (areaSqM * height) * 0.045;
    const carbon = agb * 0.47;

    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [pts] },
      properties: {
        id: `T-${String(i + 1).padStart(4, '0')}`,
        area_m2: Math.round(areaSqM * 10) / 10,
        height_m: Math.round(height * 10) / 10,
        density_pct: density,
        confidence_pct: conf,
        agb_mg: Math.round(agb * 100) / 100,
        carbon_mg: Math.round(carbon * 100) / 100,
        center_lng: lng,
        center_lat: lat,
      }
    });
  }
  return { type: "FeatureCollection", features };
}

export const CANOPIES_GEOJSON = generateCanopies();

// Change detection polygons
export const CHANGES_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.09, 11.65], [76.115, 11.64], [76.13, 11.66],
          [76.12, 11.68], [76.10, 11.68], [76.09, 11.65]
        ]]
      },
      properties: {
        id: "CHG-001",
        status: "Potential Canopy Loss",
        severity: "high",
        affected_area_ha: 18.4,
        comparison: "2022 → 2026",
        period: "2024–2026",
        zone: "Zone A — Northwest Sector",
        evidence: ["NDVI decrease (-0.18)", "SAR VV backscatter shift (+3.2 dB)", "Canopy coverage reduction (~22%)", "Thermal anomaly detected"],
        confidence_pct: 89,
        ndvi_delta: -0.18,
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.18, 11.72], [76.205, 11.715], [76.22, 11.735],
          [76.20, 11.755], [76.175, 11.745], [76.18, 11.72]
        ]]
      },
      properties: {
        id: "CHG-002",
        status: "Potential Disturbance",
        severity: "medium",
        affected_area_ha: 8.7,
        comparison: "2022 → 2026",
        period: "2025–2026",
        zone: "Zone B — Eastern Edge",
        evidence: ["NDVI decrease (-0.09)", "SAR backscatter variability", "Partial canopy fragmentation"],
        confidence_pct: 82,
        ndvi_delta: -0.09,
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.05, 11.75], [76.075, 11.74], [76.09, 11.76],
          [76.075, 11.78], [76.055, 11.77], [76.05, 11.75]
        ]]
      },
      properties: {
        id: "CHG-003",
        status: "Vegetation Recovery",
        severity: "low",
        affected_area_ha: 5.2,
        comparison: "2022 → 2026",
        period: "2022–2024",
        zone: "Zone C — Southern Buffer",
        evidence: ["NDVI increase (+0.12)", "SAR backscatter stable", "Canopy regrowth observed"],
        confidence_pct: 78,
        ndvi_delta: 0.12,
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.15, 11.61], [76.175, 11.605], [76.19, 11.625],
          [76.17, 11.645], [76.145, 11.635], [76.15, 11.61]
        ]]
      },
      properties: {
        id: "CHG-004",
        status: "Potential Canopy Loss",
        severity: "high",
        affected_area_ha: 12.1,
        comparison: "2022 → 2026",
        period: "2023–2025",
        zone: "Zone D — Southern Corridor",
        evidence: ["NDVI decrease (-0.22)", "SAR VH polarization change", "Land surface temperature increase", "Consecutive dry-season anomaly"],
        confidence_pct: 91,
        ndvi_delta: -0.22,
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [76.22, 11.64], [76.24, 11.63], [76.255, 11.65],
          [76.24, 11.67], [76.215, 11.66], [76.22, 11.64]
        ]]
      },
      properties: {
        id: "CHG-005",
        status: "Detected Change",
        severity: "medium",
        affected_area_ha: 6.9,
        comparison: "2022 → 2026",
        period: "2024–2026",
        zone: "Zone E — Perimeter",
        evidence: ["Optical texture change", "SAR backscatter variability", "Phenological anomaly"],
        confidence_pct: 76,
        ndvi_delta: -0.06,
      }
    }
  ]
};

export const ANALYTICS_DEMO = {
  total_area_ha: 48600,
  detected_canopies: 312,
  canopy_coverage_pct: 71.4,
  avg_height_m: 21.3,
  total_agb_mg: 8742.5,
  total_carbon_mg: 4108.9,
};

export const FOREST_SEARCHES = [
  {
    name: "Wayanad Wildlife Sanctuary",
    type: "Wildlife Sanctuary",
    district: "Wayanad, Kerala",
    area_ha: 48600,
    coords: [76.1320, 11.6854],
    zoom: 11,
  },
  {
    name: "Silent Valley National Park",
    type: "National Park",
    district: "Palakkad, Kerala",
    area_ha: 8952,
    coords: [76.4524, 11.0763],
    zoom: 12,
  },
  {
    name: "Periyar Tiger Reserve",
    type: "Tiger Reserve",
    district: "Idukki, Kerala",
    area_ha: 78530,
    coords: [77.2025, 9.4712],
    zoom: 11,
  },
  {
    name: "Nagarhole National Park",
    type: "National Park",
    district: "Mysuru, Karnataka",
    area_ha: 64339,
    coords: [76.0900, 12.0320],
    zoom: 11,
  },
];

export const PROCESSING_STEPS = [
  "Loading forest boundary",
  "Loading satellite observations",
  "Aligning Sentinel-2 + Sentinel-1 datasets",
  "Extracting spectral features (NDVI, EVI, SWIR)",
  "Extracting SAR features (VV, VH backscatter)",
  "Extracting LiDAR/GEDI structural features",
  "Running AI canopy segmentation model",
  "Running Random Forest biomass model",
  "Estimating carbon stock (AGB × 0.47)",
  "Comparing historical Landsat observations",
  "Generating forest intelligence report",
];

export const LAYER_COLORS = {
  boundary:   '#00e676',
  sentinel2:  '#69f0ae',
  ndvi:       '#00c853',
  sentinel1:  '#00bcd4',
  lidar:      '#7e57c2',
  canopy:     '#00e676',
  biomass:    '#ffa726',
  carbon:     '#ef9a9a',
  change:     '#ef5350',
  alerts:     '#f44336',
};
