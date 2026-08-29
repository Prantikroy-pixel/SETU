"""
Prediction module for SETU Disruption Risk Model.
=================================================
Provides real-time AI inference to evaluate corridor hazard disruption risk
based on live weather, slope, elevation, drainage, and vegetation metrics.
Integrates directly with RealtimeHazardFetcher for zero-config live prediction.
"""

import os
import time
import pickle
import math
from typing import Any, Dict, Optional, Tuple

try:
    import numpy as np
except ImportError:
    np = None

# Import RealtimeHazardFetcher
try:
    from .realtime_pipeline import RealtimeHazardFetcher
except ImportError:
    try:
        from realtime_pipeline import RealtimeHazardFetcher
    except ImportError:
        RealtimeHazardFetcher = None

_MODEL_CACHE: Optional[Dict[str, Any]] = None
_FETCHER_INSTANCE: Optional[Any] = None
_COORDINATE_CACHE: Dict[Tuple[float, float], Tuple[float, Dict[str, float]]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes cache per coordinate


def _get_fetcher() -> Optional[Any]:
    """Lazy initialize singleton RealtimeHazardFetcher instance."""
    global _FETCHER_INSTANCE
    if _FETCHER_INSTANCE is None and RealtimeHazardFetcher is not None:
        try:
            _FETCHER_INSTANCE = RealtimeHazardFetcher(request_timeout=5)
        except Exception:
            _FETCHER_INSTANCE = None
    return _FETCHER_INSTANCE


def _load_model() -> Optional[Dict[str, Any]]:
    """Lazy load serialized ML model artifact."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model.pkl')
    if os.path.exists(model_path):
        try:
            with open(model_path, 'rb') as f:
                _MODEL_CACHE = pickle.load(f)
                return _MODEL_CACHE
        except Exception as e:
            print(f"Warning: Could not load model.pkl ({e}), falling back to heuristic engine.")
    return None


def _heuristic_risk(
    rainfall: float,
    slope: float,
    elevation: float,
    soil_saturation: float,
    drainage_quality: float,
    vegetation_cover: float,
) -> float:
    """Calibrated physical hazard heuristic fallback."""
    # Landslide triggers
    landslide_condition = (slope >= 15.0 and rainfall >= 55.0) or (slope >= 28.0 and rainfall >= 35.0)
    flood_condition = (slope <= 4.0 and drainage_quality >= 2.0 and rainfall >= 80.0)
    extreme_condition = (rainfall >= 135.0)
    urban_flood_condition = (drainage_quality <= 1.5 and rainfall >= 50.0 and vegetation_cover <= 0.40)

    z = (
        0.028 * rainfall
        + 0.052 * slope
        + 2.1 * soil_saturation
        - 0.35 * drainage_quality
        - 1.4 * vegetation_cover
        + 0.00025 * elevation
        - 3.1
    )
    prob = 1.0 / (1.0 + math.exp(-z))

    if landslide_condition or flood_condition or extreme_condition or urban_flood_condition:
        prob = max(prob, 0.78)

    return float(max(0.01, min(0.99, prob)))


def fetch_realtime_features_for_coord(lat: float, lon: float) -> Tuple[Dict[str, float], bool]:
    """
    Fetches real-time environmental metrics for a given coordinate pair.
    Uses 5-minute memory cache to ensure high performance during bulk matching.
    """
    cache_key = (round(lat, 3), round(lon, 3))
    now = time.time()

    if cache_key in _COORDINATE_CACHE:
        timestamp, cached_data = _COORDINATE_CACHE[cache_key]
        if now - timestamp < CACHE_TTL_SECONDS:
            return cached_data, True

    fetcher = _get_fetcher()
    is_live = False

    if fetcher is not None:
        try:
            telemetry = fetcher.fetch_rainfall_telemetry(lat, lon)
            rain = telemetry["rainfall_24h"]
            rain_dur = telemetry["duration_hours"]
            elev_slope = fetcher.fetch_elevation_and_slope(lat, lon)
            slope = elev_slope["slope"]
            elevation = elev_slope["elevation"]
            drainage = fetcher.estimate_drainage_density(lat, lon)
            veg = fetcher.estimate_vegetation_ndvi(lat, lon, rain)
            soil_sat = min(1.0, max(0.1, 0.2 + (rain / 180.0) + (drainage * 0.04) - (slope * 0.003)))

            features = {
                "rainfall": float(rain),
                "rainfall_duration_hours": float(rain_dur),
                "slope": float(slope),
                "elevation": float(elevation),
                "soil_saturation": round(float(soil_sat), 3),
                "drainage_quality": float(drainage),
                "vegetation_cover": float(veg)
            }
            _COORDINATE_CACHE[cache_key] = (now, features)
            return features, True
        except Exception:
            pass

    # Regional topographical & climatological heuristic fallback
    is_ner = (23.0 <= lat <= 29.0 and 88.0 <= lon <= 97.0)
    slope = 22.0 if is_ner and (lat > 27.0 or (lat < 26.0 and lon > 92.0)) else 4.5
    elevation = 650.0 if slope > 15.0 else 90.0
    rain = 0.0
    rain_dur = 0.0
    drainage = 2.1 if slope <= 5.0 else 1.5
    veg = 0.62 if is_ner else 0.45
    soil_sat = 0.20

    features = {
        "rainfall": rain,
        "rainfall_duration_hours": rain_dur,
        "slope": slope,
        "elevation": elevation,
        "soil_saturation": soil_sat,
        "drainage_quality": drainage,
        "vegetation_cover": veg
    }
    return features, is_live


def predict_risk(
    lat: float,
    lon: float,
    rainfall: Optional[float] = None,
    rainfall_duration_hours: Optional[float] = None,
    slope: Optional[float] = None,
    elevation: Optional[float] = None,
    soil_saturation: Optional[float] = None,
    drainage_quality: Optional[float] = None,
    vegetation_cover: Optional[float] = None,
    use_realtime: bool = True
) -> Dict[str, Any]:
    """
    Predict logistical route and environmental disruption risk for given coordinates.
    If features are not supplied, queries RealtimeHazardFetcher live.

    Returns:
        Dict with risk_score (0.0 to 1.0), risk_level ('low', 'medium', 'high', 'critical'),
        is_realtime_fetched flag, explanatory summary, and exact feature breakdown.
    """
    is_live_fetched = False

    # 1. Fill missing parameters dynamically via RealtimeHazardFetcher
    if (
        rainfall is None or
        slope is None or
        elevation is None or
        drainage_quality is None or
        vegetation_cover is None or
        soil_saturation is None
    ):
        if use_realtime:
            fetched_features, is_live_fetched = fetch_realtime_features_for_coord(lat, lon)
            if rainfall is None:
                rainfall = fetched_features["rainfall"]
            if rainfall_duration_hours is None:
                rainfall_duration_hours = fetched_features.get("rainfall_duration_hours", 0.0)
            if slope is None:
                slope = fetched_features["slope"]
            if elevation is None:
                elevation = fetched_features["elevation"]
            if drainage_quality is None:
                drainage_quality = fetched_features["drainage_quality"]
            if vegetation_cover is None:
                vegetation_cover = fetched_features["vegetation_cover"]
            if soil_saturation is None:
                soil_saturation = fetched_features["soil_saturation"]
        else:
            # Static regional fallback
            if rainfall is None:
                rainfall = 0.0
            if rainfall_duration_hours is None:
                rainfall_duration_hours = 0.0
            if slope is None:
                slope = 28.0 if (23.0 <= lat <= 29.0 and 89.0 <= lon <= 97.0) else 6.0
            if elevation is None:
                elevation = 650.0 if slope > 15.0 else 120.0
            if drainage_quality is None:
                drainage_quality = 2.2
            if vegetation_cover is None:
                vegetation_cover = 0.58
            if soil_saturation is None:
                soil_saturation = min(0.95, max(0.1, 0.25 + (rainfall / 200.0)))

    # Ensure float types
    rainfall = float(rainfall)
    if rainfall_duration_hours is None:
        rainfall_duration_hours = max(1.0, round(rainfall / 16.0, 1)) if rainfall > 0 else 0.0
    else:
        rainfall_duration_hours = float(rainfall_duration_hours)

    rainfall_intensity_mm_hr = round(rainfall / max(0.5, rainfall_duration_hours), 1) if (rainfall > 0 and rainfall_duration_hours > 0) else 0.0

    slope = float(slope)
    elevation = float(elevation)
    soil_saturation = float(soil_saturation)
    drainage_quality = float(drainage_quality)
    vegetation_cover = float(vegetation_cover)

    # 2. Run Trained ML Model Pipeline
    model_data = _load_model() if np is not None else None
    if model_data and 'pipeline' in model_data and np is not None:
        try:
            feature_array = np.array([[
                rainfall,
                slope,
                elevation,
                soil_saturation,
                drainage_quality,
                vegetation_cover
            ]], dtype=np.float64)
            pipeline = model_data['pipeline']
            risk_score = float(pipeline.predict_proba(feature_array)[0, 1])
        except Exception:
            risk_score = _heuristic_risk(
                rainfall, slope, elevation, soil_saturation, drainage_quality, vegetation_cover
            )
    else:
        risk_score = _heuristic_risk(
            rainfall, slope, elevation, soil_saturation, drainage_quality, vegetation_cover
        )

    # Compound Urban Flash Flood Elevation Rule (Guwahati / Silchar / Built Floodplain)
    urban_flash_flood_condition = (
        drainage_quality <= 1.5 and
        vegetation_cover <= 0.40 and
        (rainfall >= 50.0 or rainfall_duration_hours >= 3.0)
    )
    if urban_flash_flood_condition:
        risk_score = max(risk_score, 0.82)

    risk_score = round(max(0.0, min(1.0, risk_score)), 4)

    # 3. Classify Risk Severity
    if risk_score >= 0.75:
        risk_level = 'critical'
    elif risk_score >= 0.50:
        risk_level = 'high'
    elif risk_score >= 0.25:
        risk_level = 'medium'
    else:
        risk_level = 'low'

    # 4. Generate Explainable Factors
    driver_factors = []
    if urban_flash_flood_condition:
        driver_factors.append(
            f"Urban flash flood risk in built basin (low drainage {drainage_quality:.2f} km/km², barren vegetation {vegetation_cover:.2f} NDVI)"
        )

    if slope >= 25.0:
        driver_factors.append(f"Steep mountain grade ({slope:.1f}° incline)")
    elif slope >= 14.0:
        driver_factors.append(f"Moderate slope ({slope:.1f}°)")

    if soil_saturation >= 0.75:
        driver_factors.append("High soil water saturation")
    if drainage_quality >= 2.6 and slope <= 4.0:
        driver_factors.append("Flood basin river congestion")
    elif drainage_quality < 1.3 and not urban_flash_flood_condition:
        driver_factors.append("Poor runoff drainage")

    if vegetation_cover <= 0.35 and not urban_flash_flood_condition:
        driver_factors.append("Sparse vegetation / barren topsoil")

    if driver_factors:
        explanation = f"Elevated corridor hazard due to: {', '.join(driver_factors)}."
    else:
        explanation = "Corridor conditions are stable with clear transit and low likelihood of disruption."

    return {
        'latitude': lat,
        'longitude': lon,
        'risk_score': risk_score,
        'risk_level': risk_level,
        'is_critical': risk_score >= 0.75,
        'is_realtime_fetched': is_live_fetched,
        'explanation': explanation,
        'features': {
            'rainfall_mm': round(rainfall, 2),
            'rainfall_duration_hours': round(rainfall_duration_hours, 1),
            'rainfall_intensity_mm_hr': round(rainfall_intensity_mm_hr, 1),
            'slope_degrees': round(slope, 2),
            'elevation_m': round(elevation, 2),
            'soil_saturation': round(soil_saturation, 3),
            'drainage_quality': round(drainage_quality, 2),
            'vegetation_cover': round(vegetation_cover, 3),
        },
        'model_version': model_data.get('metadata', {}).get('version', '2.0.0') if model_data else 'heuristic'
    }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two coordinates."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def interpolate_route_waypoints(
    waypoints: list,
    max_samples: int = 12,
    min_step_km: float = 8.0
) -> list:
    """
    Interpolates a sequence of (lat, lon) coordinates into evenly spaced waypoints along the route range.
    Returns list of (lat, lon, cumulative_distance_km).
    """
    if not waypoints:
        return []

    # Normalize waypoint tuples/lists
    clean_pts = []
    for p in waypoints:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            clean_pts.append((float(p[0]), float(p[1])))
        elif isinstance(p, dict) and 'lat' in p and 'lon' in p:
            clean_pts.append((float(p['lat']), float(p['lon'])))
        elif isinstance(p, dict) and 'latitude' in p and 'longitude' in p:
            clean_pts.append((float(p['latitude']), float(p['longitude'])))

    if len(clean_pts) <= 1:
        pt = clean_pts[0] if clean_pts else (24.8333, 92.7789)
        return [(pt[0], pt[1], 0.0)]

    # Compute segment distances
    segments = []
    total_km = 0.0
    for i in range(len(clean_pts) - 1):
        p1 = clean_pts[i]
        p2 = clean_pts[i + 1]
        d = haversine_distance(p1[0], p1[1], p2[0], p2[1])
        segments.append((p1, p2, d, total_km))
        total_km += d

    if total_km <= 0.001:
        return [(clean_pts[0][0], clean_pts[0][1], 0.0)]

    # Determine number of sample steps
    num_samples = min(max_samples, max(len(clean_pts), int(total_km / min_step_km) + 1))
    num_samples = max(2, num_samples)
    step_distance = total_km / (num_samples - 1)

    sampled = []
    sampled.append((clean_pts[0][0], clean_pts[0][1], 0.0))

    current_target_dist = step_distance
    for seg_idx, (p1, p2, seg_dist, seg_start_km) in enumerate(segments):
        if seg_dist <= 0:
            continue
        while current_target_dist <= seg_start_km + seg_dist and len(sampled) < num_samples - 1:
            ratio = (current_target_dist - seg_start_km) / seg_dist
            lat = p1[0] + ratio * (p2[0] - p1[0])
            lon = p1[1] + ratio * (p2[1] - p1[1])
            sampled.append((round(lat, 5), round(lon, 5), round(current_target_dist, 2)))
            current_target_dist += step_distance

    # Add terminal point
    sampled.append((clean_pts[-1][0], clean_pts[-1][1], round(total_km, 2)))
    return sampled


def detect_route_anomalies(
    waypoint_results: list,
    rainfall_surge_threshold: float = 30.0,
    slope_critical_threshold: float = 24.0
) -> list:
    """
    Scans sequential waypoint evaluations along a corridor range to identify localized anomalies and threats.
    """
    anomalies = []
    for i, wp in enumerate(waypoint_results):
        features = wp.get('features', {})
        dist = wp.get('distance_along_route_km', 0.0)
        lat = wp.get('latitude')
        lon = wp.get('longitude')
        rain = features.get('rainfall_mm', 0.0)
        slope = features.get('slope_degrees', 0.0)
        soil_sat = features.get('soil_saturation', 0.0)
        drainage = features.get('drainage_quality', 0.0)

        # 1. Extreme Landslide Threat Anomaly
        if slope >= slope_critical_threshold and rain >= 35.0:
            anomalies.append({
                'type': 'landslide_threat',
                'severity': 'critical',
                'title': f'Critical Landslide Hazard at Km {dist:.1f}',
                'description': f'Steep mountain incline ({slope:.1f}°) with elevated 24h precipitation ({rain:.1f}mm). High road obstruction probability.',
                'distance_km': dist,
                'latitude': lat,
                'longitude': lon,
                'metric_value': f'{slope:.1f}° slope, {rain:.1f}mm rain',
            })

        # 2. Localized Rainfall Surge Delta Anomaly
        if i > 0:
            prev_rain = waypoint_results[i - 1].get('features', {}).get('rainfall_mm', 0.0)
            rain_delta = rain - prev_rain
            if rain_delta >= rainfall_surge_threshold:
                anomalies.append({
                    'type': 'rainfall_surge_anomaly',
                    'severity': 'high',
                    'title': f'Micro-Climatic Precipitation Surge (+{rain_delta:.1f}mm)',
                    'description': f'Rapid rainfall intensity increase from {prev_rain:.1f}mm to {rain:.1f}mm over short transit distance.',
                    'distance_km': dist,
                    'latitude': lat,
                    'longitude': lon,
                    'metric_value': f'+{rain_delta:.1f}mm delta',
                })

        # 3. Fluvial River Flood Congestion Anomaly
        if slope <= 3.5 and drainage >= 2.4 and rain >= 70.0:
            anomalies.append({
                'type': 'flood_basin_breach',
                'severity': 'critical',
                'title': f'Fluvial Flood Inundation at Km {dist:.1f}',
                'description': 'Lowland river catchment basin experiencing severe runoff accumulation and potential roadway submergence.',
                'distance_km': dist,
                'latitude': lat,
                'longitude': lon,
                'metric_value': f'{rain:.1f}mm in {drainage:.2f} basin',
            })

        # 4. Saturated Topsoil Risk Anomaly
        if soil_sat >= 0.80 and slope >= 15.0:
            anomalies.append({
                'type': 'soil_saturation_warning',
                'severity': 'warning',
                'title': f'Subgrade Moisture Saturation at Km {dist:.1f}',
                'description': f'Soil water saturation reached {int(soil_sat * 100)}% on hillside pass, increasing debris flow hazard.',
                'distance_km': dist,
                'latitude': lat,
                'longitude': lon,
                'metric_value': f'{int(soil_sat * 100)}% soil saturation',
            })

        # 5. Urban Basin Flash Flood Anomaly (Guwahati / Silchar / Concrete Basin)
        veg = features.get('vegetation_cover', 0.5)
        rain_dur = features.get('rainfall_duration_hours', round(rain / 16.0, 1)) if rain > 0 else 0.0
        if drainage <= 1.5 and veg <= 0.40 and (rain >= 50.0 or rain_dur >= 3.0):
            anomalies.append({
                'type': 'urban_flash_flood',
                'severity': 'critical',
                'title': f'Urban Stormwater Inundation Alert at Km {dist:.1f}',
                'description': f'Severe urban waterlogging risk in built environment (Guwahati/Silchar sector). Continuous rain for {rain_dur:.1f} hours ({rain:.1f}mm total accumulation) with poor storm drainage ({drainage:.2f} km/km²) and sparse vegetation root cover ({veg:.2f} NDVI).',
                'distance_km': dist,
                'latitude': lat,
                'longitude': lon,
                'metric_value': f'{rain:.1f}mm over {rain_dur:.1f}h, {drainage:.2f} drainage',
            })

    return anomalies


def predict_route_risk(
    waypoints: list,
    buffer_km: float = 5.0,
    use_realtime: bool = True,
    custom_features: Optional[dict] = None
) -> dict:
    """
    Evaluates disruption risk, threats, anomalies, and status over an ENTIRE ROUTE / CORRIDOR RANGE.
    
    Args:
        waypoints: List of (lat, lon) pairs or coordinate dicts defining the transit path.
        buffer_km: Spatial corridor buffer radius.
        use_realtime: Whether to query live weather and DEM data.
        custom_features: Optional parameter overrides.

    Returns:
        Dict with route composite risk, range threat level, status, detected anomalies list,
        hazard sub-ranges, and detailed waypoint analysis.
    """
    sampled_waypoints = interpolate_route_waypoints(waypoints, max_samples=10, min_step_km=8.0)
    
    waypoint_results = []
    risk_scores = []
    elevations = []
    rainfalls = []
    slopes = []

    for lat, lon, dist_km in sampled_waypoints:
        single_res = predict_risk(
            lat=lat,
            lon=lon,
            rainfall=custom_features.get('rainfall') if custom_features else None,
            slope=custom_features.get('slope') if custom_features else None,
            elevation=custom_features.get('elevation') if custom_features else None,
            soil_saturation=custom_features.get('soil_saturation') if custom_features else None,
            drainage_quality=custom_features.get('drainage') if custom_features else None,
            vegetation_cover=custom_features.get('vegetation') if custom_features else None,
            use_realtime=use_realtime
        )
        single_res['distance_along_route_km'] = dist_km
        single_res['division'] = 'critical' if single_res['risk_score'] >= 0.70 else ('warning' if single_res['risk_score'] >= 0.35 else 'safe')
        waypoint_results.append(single_res)

        risk_scores.append(single_res['risk_score'])
        elevations.append(single_res['features']['elevation_m'])
        rainfalls.append(single_res['features']['rainfall_mm'])
        slopes.append(single_res['features']['slope_degrees'])

    # Aggregate Route Composite Risk
    # Route risk is predominantly dictated by the most severe bottleneck on the path (80% max + 20% mean)
    max_risk = max(risk_scores) if risk_scores else 0.1
    mean_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.1
    route_composite_risk = round(0.80 * max_risk + 0.20 * mean_risk, 4)

    # Determine Range Threat Level & Corridor Status
    if route_composite_risk >= 0.70:
        threat_level = 'critical'
        corridor_status = 'imminent_blockage'
        status_label = 'Near-Blockage Alert (Imminent Disruption)'
    elif route_composite_risk >= 0.50:
        threat_level = 'high'
        corridor_status = 'high_disruption_threat'
        status_label = 'High Hazard Disruption Threat'
    elif route_composite_risk >= 0.35:
        threat_level = 'moderate'
        corridor_status = 'cautious_transit'
        status_label = 'Moderate Hazard Caution'
    else:
        threat_level = 'low'
        corridor_status = 'clear_route'
        status_label = 'Safe / Clear Corridor'

    # Detect Route Range Anomalies
    detected_anomalies = detect_route_anomalies(waypoint_results)

    # Segment into contiguous hazard sub-ranges
    total_distance_km = sampled_waypoints[-1][2] if sampled_waypoints else 0.0
    hazard_subranges = []
    
    if len(waypoint_results) >= 2:
        for i in range(len(waypoint_results) - 1):
            w1 = waypoint_results[i]
            w2 = waypoint_results[i + 1]
            seg_risk = max(w1['risk_score'], w2['risk_score'])
            seg_div = 'critical' if seg_risk >= 0.70 else ('warning' if seg_risk >= 0.35 else 'safe')
            hazard_subranges.append({
                'segment_index': i + 1,
                'start_km': w1['distance_along_route_km'],
                'end_km': w2['distance_along_route_km'],
                'risk_score': seg_risk,
                'division': seg_div,
                'start_coord': [w1['latitude'], w1['longitude']],
                'end_coord': [w2['latitude'], w2['longitude']],
            })

    # Generate Range Narrative Explanation
    anomaly_summary = f"{len(detected_anomalies)} localized anomaly triggers detected." if detected_anomalies else "No severe micro-anomalies detected along corridor."
    range_summary = (
        f"Route Range ({total_distance_km:.1f} km): Peak 24h rain {max(rainfalls):.1f}mm, "
        f"max slope grade {max(slopes):.1f}°, elevation range {min(elevations):.0f}m–{max(elevations):.0f}m. {anomaly_summary}"
    )

    return {
        'route_composite_risk': route_composite_risk,
        'threat_level': threat_level,
        'corridor_status': corridor_status,
        'status_label': status_label,
        'is_critical_threat': route_composite_risk >= 0.70,
        'total_distance_km': round(total_distance_km, 2),
        'range_metrics': {
            'max_risk': round(max_risk, 4),
            'mean_risk': round(mean_risk, 4),
            'max_rainfall_mm': round(max(rainfalls), 2) if rainfalls else 0.0,
            'max_slope_degrees': round(max(slopes), 2) if slopes else 0.0,
            'min_elevation_m': round(min(elevations), 1) if elevations else 0.0,
            'max_elevation_m': round(max(elevations), 1) if elevations else 0.0,
            'sample_nodes_count': len(waypoint_results),
            'anomalies_count': len(detected_anomalies),
        },
        'detected_anomalies': detected_anomalies,
        'range_summary': range_summary,
        'hazard_subranges': hazard_subranges,
        'waypoint_analysis': waypoint_results,
    }
