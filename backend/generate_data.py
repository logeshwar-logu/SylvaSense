import json
import random
import math

def generate_polygon(center_lng, center_lat, radius_deg, num_points=6):
    points = []
    for i in range(num_points):
        angle = (i / num_points) * (2 * math.pi)
        r = radius_deg * random.uniform(0.7, 1.3)
        x = center_lng + r * math.cos(angle)
        y = center_lat + r * math.sin(angle)
        points.append([x, y])
    points.append(points[0]) # close polygon
    return [points]

def generate_demo_data():
    # Wayanad approximate center
    center_lat = 11.6854
    center_lng = 76.1320
    
    # Generate Forest Boundary
    # 0.1 deg is roughly 11km
    boundary_polygon = [
        [
            [center_lng - 0.1, center_lat - 0.1],
            [center_lng + 0.1, center_lat - 0.1],
            [center_lng + 0.1, center_lat + 0.1],
            [center_lng - 0.1, center_lat + 0.1],
            [center_lng - 0.1, center_lat - 0.1]
        ]
    ]
    
    forest_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": boundary_polygon
                },
                "properties": {
                    "id": "F-WAYANAD-01",
                    "name": "Wayanad Forest Reserve",
                    "area_ha": 48600
                }
            }
        ]
    }
    
    # Generate Canopies
    canopies = []
    num_canopies = 250
    for i in range(num_canopies):
        # random point within boundary
        lng = center_lng + random.uniform(-0.09, 0.09)
        lat = center_lat + random.uniform(-0.09, 0.09)
        
        # radius approx 5-15 meters (~0.00005 to 0.00015 deg)
        radius = random.uniform(0.00005, 0.00015)
        
        area = math.pi * (radius * 111320)**2 # rough area in m2
        height = random.uniform(10.0, 35.0)
        density = random.randint(60, 99)
        confidence = random.randint(75, 98)
        
        # AGB rough estimation (demo methodology)
        agb = (area * height) * 0.05
        carbon = agb * 0.47
        
        canopy = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": generate_polygon(lng, lat, radius, 8)
            },
            "properties": {
                "id": f"T-{i+1:04d}",
                "area_m2": round(area, 1),
                "height_m": round(height, 1),
                "density_pct": density,
                "confidence_pct": confidence,
                "agb_mg": round(agb, 2),
                "carbon_mg": round(carbon, 2)
            }
        }
        canopies.append(canopy)
        
    canopies_geojson = {
        "type": "FeatureCollection",
        "features": canopies
    }
    
    # Generate Change Detection Alerts (2022 -> 2026)
    changes = []
    num_changes = 5
    for i in range(num_changes):
        lng = center_lng + random.uniform(-0.08, 0.08)
        lat = center_lat + random.uniform(-0.08, 0.08)
        radius = random.uniform(0.002, 0.005) # larger area
        
        change_area_ha = math.pi * (radius * 111320)**2 / 10000
        
        change = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": generate_polygon(lng, lat, radius, 6)
            },
            "properties": {
                "id": f"CHG-{i+1:03d}",
                "status": "Potential Canopy Loss",
                "affected_area_ha": round(change_area_ha, 2),
                "comparison": "2022 \u2192 2026",
                "evidence": ["NDVI decrease", "SAR backscatter change", "Canopy coverage reduction"],
                "confidence_pct": random.randint(80, 95)
            }
        }
        changes.append(change)
        
    changes_geojson = {
        "type": "FeatureCollection",
        "features": changes
    }
    
    # Save to files
    import os
    os.makedirs("data", exist_ok=True)
    with open("data/forest.geojson", "w") as f:
        json.dump(forest_geojson, f)
    with open("data/canopies.geojson", "w") as f:
        json.dump(canopies_geojson, f)
    with open("data/changes.geojson", "w") as f:
        json.dump(changes_geojson, f)
        
    print("Demo data generated successfully in 'data' directory.")

if __name__ == "__main__":
    generate_demo_data()
