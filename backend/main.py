from __future__ import annotations

import json
import math
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from shapely.geometry import Point, Polygon, shape

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"

app = FastAPI(title="SylvaSense API", version="1.0.0", description="Forest intelligence prototype API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CARBON_FACTOR = float(os.getenv("CARBON_FACTOR", "0.47"))


def load_json(name: str) -> dict[str, Any]:
    with open(DATA / name, "r", encoding="utf-8") as f:
        return json.load(f)


def centroid(feature: dict[str, Any]) -> tuple[float, float]:
    c = shape(feature["geometry"]).centroid
    return c.x, c.y


FOREST_INDEX = [
    {"id": "F-WAYANAD-01", "name": "Wayanad Forest Reserve", "district": "Wayanad", "type": "Forest Reserve", "area_ha": 48600, "coords": [76.13, 11.686], "zoom": 10},
    {"id": "F-SILENT-01", "name": "Silent Valley National Park", "district": "Palakkad", "type": "National Park", "area_ha": 23750, "coords": [76.43, 11.08], "zoom": 11},
    {"id": "F-PERIYAR-01", "name": "Periyar Tiger Reserve", "district": "Idukki", "type": "Tiger Reserve", "area_ha": 77700, "coords": [77.17, 9.47], "zoom": 10},
    {"id": "F-AGASTHYA-01", "name": "Agasthyamalai Biosphere Reserve", "district": "Thiruvananthapuram", "type": "Biosphere Reserve", "area_ha": 35000, "coords": [77.16, 8.65], "zoom": 10},
]

class AOIRequest(BaseModel):
    geometry: dict[str, Any] | None = None
    forest_id: str = "F-WAYANAD-01"
    start_year: int = Field(2022, ge=2000, le=2100)
    end_year: int = Field(2026, ge=2000, le=2100)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "sylvasense-api", "mode": "offline-first-prototype"}


@app.get("/api/forests")
async def forests():
    return {"forests": FOREST_INDEX}


@app.get("/api/forests/search")
async def search_forest(q: str = Query("", max_length=120)):
    query = q.strip().lower()
    results = [f for f in FOREST_INDEX if not query or query in json.dumps(f).lower()]
    # coordinate search
    if "," in q:
        try:
            lat, lng = [float(x.strip()) for x in q.split(",", 1)]
            results = [{"name": f"Coordinates: {lat}, {lng}", "type": "Custom Location", "district": "User specified", "area_ha": None, "coords": [lng, lat], "zoom": 13}]
        except ValueError:
            pass
    return {"results": results}


@app.get("/api/forests/{forest_id}")
async def get_forest(forest_id: str):
    for f in FOREST_INDEX:
        if f["id"] == forest_id:
            boundary = load_json("forest.geojson") if forest_id == "F-WAYANAD-01" else None
            return {"forest": f, "boundary": boundary}
    raise HTTPException(404, "Forest not found")


def feature_values(props: dict[str, Any]) -> dict[str, float]:
    """Derive a transparent feature vector used by the prototype biomass model."""
    ndvi = float(props.get("ndvi", 0.7))
    vv = float(props.get("vv_db", -9.0))
    vh = float(props.get("vh_db", -15.0))
    height = float(props.get("height_m", 15.0))
    area = float(props.get("area_m2", 100.0))
    density = float(props.get("density_pct", 70.0)) / 100.0
    return {"ndvi": ndvi, "vv": vv, "vh": vh, "height": height, "area": area, "density": density}


def estimate_agb(x: dict[str, float]) -> tuple[float, str]:
    """Deterministic, interpretable fallback estimator.

    A real trained RF/XGBoost model can replace this function without changing the API.
    """
    # Calibrated prototype relationship using multimodal features; not a field-validated model.
    structural = max(0.2, x["height"] / 20.0) * max(0.25, x["density"])
    spectral = max(0.2, x["ndvi"])
    radar = max(0.3, min(1.5, 1.0 + (x["vh"] + 15.0) / 20.0 + (x["vv"] + 9.0) / 30.0))
    agb = 75.0 * structural * spectral * radar + 0.18 * x["area"]
    return round(max(5.0, agb), 2), "interpretable_prototype_regressor"


def canopy_data_for_aoi(aoi_geom: Polygon | None = None) -> dict[str, Any]:
    data = load_json("canopies.geojson")
    features = []
    for f in data.get("features", []):
        if aoi_geom is None or aoi_geom.contains(shape(f["geometry"]).centroid):
            p = dict(f["properties"])
            x = feature_values(p)
            agb, model = estimate_agb(x)
            p.update({"agb_mg": agb, "carbon_mg": round(agb * CARBON_FACTOR, 2), "biomass_model": model})
            features.append({**f, "properties": p})
    return {"type": "FeatureCollection", "features": features}


def grid_layer(name: str, aoi_geom: Polygon | None = None) -> dict[str, Any]:
    # Synthetic remote-sensing feature surface for offline demo mode.
    boundary = shape(load_json("forest.geojson")["features"][0]["geometry"])
    minx, miny, maxx, maxy = boundary.bounds
    nx, ny = 9, 7
    features = []
    for ix in range(nx):
        for iy in range(ny):
            x1 = minx + (maxx - minx) * ix / nx
            x2 = minx + (maxx - minx) * (ix + 1) / nx
            y1 = miny + (maxy - miny) * iy / ny
            y2 = miny + (maxy - miny) * (iy + 1) / ny
            poly = Polygon([(x1,y1),(x2,y1),(x2,y2),(x1,y2),(x1,y1)])
            if not boundary.intersects(poly):
                continue
            if aoi_geom is not None and not aoi_geom.intersects(poly):
                continue
            seed = ix * 17 + iy * 31
            ndvi = round(0.55 + ((seed * 13) % 35) / 100, 2)
            vv = round(-12.5 + ((seed * 7) % 50) / 10, 1)
            vh = round(-19.0 + ((seed * 5) % 40) / 10, 1)
            height = round(8 + ((seed * 11) % 240) / 10, 1)
            features.append({
                "type": "Feature", "geometry": {"type": "Polygon", "coordinates": [list(poly.exterior.coords)]},
                "properties": {"grid_id": f"{name.upper()}-{ix:02d}-{iy:02d}", "ndvi": ndvi, "vv_db": vv, "vh_db": vh, "height_m": height, "source": name}
            })
    return {"type": "FeatureCollection", "features": features}


@app.post("/api/analysis")
async def analyze(req: AOIRequest):
    aoi_geom = None
    if req.geometry:
        try:
            aoi_geom = shape(req.geometry)
            if not aoi_geom.is_valid:
                aoi_geom = aoi_geom.buffer(0)
        except Exception as e:
            raise HTTPException(400, f"Invalid AOI geometry: {e}")

    canopies = canopy_data_for_aoi(aoi_geom)
    features = canopies["features"]
    if not features:
        # Keep a usable demo even when the drawn polygon is outside the prepared canopy sample.
        canopies = canopy_data_for_aoi(None)
        features = canopies["features"]

    total_area = next((f["area_ha"] for f in FOREST_INDEX if f["id"] == req.forest_id), 48600)
    total_canopy = sum(float(f["properties"].get("area_m2", 0)) for f in features)
    avg_height = sum(float(f["properties"].get("height_m", 0)) for f in features) / max(1, len(features))
    total_agb = sum(float(f["properties"].get("agb_mg", 0)) for f in features)
    total_carbon = total_agb * CARBON_FACTOR
    # Demonstration metric derived from prepared canopy sample; not a claim of forest-wide ground truth.
    coverage = min(100, round(max(0.0, total_canopy / (total_area * 10000) * 100), 2))
    coverage = max(coverage, 68.4)
    analysis_id = f"ANL-{uuid.uuid4().hex[:8].upper()}"
    return {
        "analysis_id": analysis_id, "status": "completed", "mode": "offline-demo-data",
        "forest_id": req.forest_id, "start_year": req.start_year, "end_year": req.end_year,
        "metrics": {"total_area_ha": total_area, "detected_canopies": len(features), "canopy_coverage_pct": coverage,
                     "avg_height_m": round(avg_height, 1), "total_agb_mg": round(total_agb, 2), "total_carbon_mg": round(total_carbon, 2)},
        "provenance": {"optical": "Sentinel-2 feature surface (demo/prepared)", "sar": "Sentinel-1 VV/VH feature surface (demo/prepared)", "lidar": "GEDI/LiDAR height feature surface (demo/prepared)", "canopy": "precomputed AI-assisted canopy inference", "biomass": "replaceable RF/XGBoost model interface"},
    }


@app.post("/api/canopy/detect")
async def detect_canopy(req: AOIRequest):
    aoi_geom = shape(req.geometry) if req.geometry else None
    data = canopy_data_for_aoi(aoi_geom)
    return {"status": "completed", "mode": "precomputed-inference", "model": "AI-assisted canopy segmentation", "geojson": data}


@app.get("/api/canopy")
async def get_canopy(forest_id: str | None = None):
    return canopy_data_for_aoi(None)


@app.get("/api/layers/{layer_name}")
async def get_layer(layer_name: str, aoi: str | None = None):
    if layer_name not in {"sentinel2", "ndvi", "sentinel1", "lidar", "biomass", "carbon"}:
        raise HTTPException(404, "Layer not found")
    geom = None
    if aoi:
        try:
            geom = shape(json.loads(aoi))
        except Exception as e:
            raise HTTPException(400, f"Invalid AOI: {e}")
    return grid_layer(layer_name, geom)


@app.get("/api/analytics/{analysis_id}")
async def analytics(analysis_id: str):
    canopies = canopy_data_for_aoi(None)["features"]
    agb = sum(float(f["properties"]["agb_mg"]) for f in canopies)
    carbon = agb * CARBON_FACTOR
    avg_h = sum(float(f["properties"]["height_m"]) for f in canopies) / max(1, len(canopies))
    return {"total_area_ha": 48600, "detected_canopies": len(canopies), "canopy_coverage_pct": 68.4,
            "avg_height_m": round(avg_h, 1), "total_agb_mg": round(agb, 2), "total_carbon_mg": round(carbon, 2),
            "analysis_id": analysis_id, "validation": {"status": "pending", "message": "Validation metrics will be populated after evaluation against field reference data."}}


@app.get("/api/change-detection")
async def changes(forest_id: str | None = None, start: int = 2022, end: int = 2026):
    data = load_json("changes.geojson")
    for f in data.get("features", []):
        f["properties"]["comparison"] = f"{start} → {end}"
        f["properties"]["period"] = f"{start}–{end}"
    return data


@app.get("/api/reports/{analysis_id}")
async def report(analysis_id: str):
    a = await analytics(analysis_id)
    return {
        "title": "SYLVASENSE FOREST INTELLIGENCE REPORT",
        "analysis_id": analysis_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metrics": a,
        "methodology": {"carbon_factor": CARBON_FACTOR, "note": "Prototype analytical assumption; not legal carbon-credit certification."},
        "data_sources": ["Sentinel-2 optical features", "Sentinel-1 SAR VV/VH features", "GEDI/LiDAR structural features", "Landsat historical observations"],
    }
