import { FOREST_BOUNDARY, CANOPIES_GEOJSON, CHANGES_GEOJSON, ANALYTICS_DEMO } from '../data/demoData';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, options = {}, fallback = null) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.warn(`[SylvaSense] API fallback: ${path}`, err.message);
    if (fallback !== null) return fallback;
    throw err;
  }
}

export async function searchForest(query) {
  const data = await request(`/api/forests/search?q=${encodeURIComponent(query)}`, {}, { results: [] });
  return data.results || [];
}
export async function getForest(id = 'F-WAYANAD-01') {
  return request(`/api/forests/${id}`, {}, { forest: null, boundary: FOREST_BOUNDARY });
}
export async function analyzeForest(payload) {
  return request('/api/analysis', { method: 'POST', body: JSON.stringify(payload) }, { analysis_id: 'DEMO-001', status: 'completed', metrics: ANALYTICS_DEMO });
}
export async function detectCanopy(payload) {
  return request('/api/canopy/detect', { method: 'POST', body: JSON.stringify(payload) }, { status: 'completed', mode: 'precomputed-inference', geojson: CANOPIES_GEOJSON });
}
export async function getCanopies() {
  const data = await request('/api/canopy', {}, CANOPIES_GEOJSON);
  return data;
}
export async function getAnalytics(id) {
  return request(`/api/analytics/${id || 'DEMO-001'}`, {}, ANALYTICS_DEMO);
}
export async function getChanges(start = 2022, end = 2026) {
  return request(`/api/change-detection?start=${start}&end=${end}`, {}, CHANGES_GEOJSON);
}
export async function getLayer(name, aoiGeometry = null) {
  const q = aoiGeometry ? `?aoi=${encodeURIComponent(JSON.stringify(aoiGeometry))}` : '';
  return request(`/api/layers/${name}${q}`, {}, null);
}
export async function getReport(id) {
  return request(`/api/reports/${id}`);
}
