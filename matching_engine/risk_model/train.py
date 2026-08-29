"""
SETU Disruption Risk Prediction Model - Training Engine
======================================================
Trains a scikit-learn Gradient Boosting ML model using:
1. Live real-time geo-climatic data ingested via RealtimeHazardFetcher (Open-Meteo, SRTM DEM).
2. Real-world historical disaster & flood disruption datasets (ASDMA, IMD, GSI Bhukosh).
3. Calibrated physics-based geo-environmental augmentation for Northeast India terrain.

Features:
- rainfall_24h (mm)
- slope_degrees (deg)
- elevation_m (meters)
- soil_saturation (0.1 - 1.0)
- drainage_quality (0.5 - 5.0 km/km²)
- vegetation_cover (0.0 - 1.0 NDVI)
"""

import os
import sys
import csv
import math
import pickle
import argparse
from datetime import datetime, timezone
from typing import Tuple, List, Dict, Any, Optional

# Lazy imports - only load when actually used, not during Django startup
# This prevents memory issues on serverless/free tier platforms
numpy = None
GradientBoostingClassifier = None
RandomForestClassifier = None
Pipeline = None
StandardScaler = None
train_test_split = None
StratifiedKFold = None
cross_val_score = None
classification_report = None
roc_auc_score = None
confusion_matrix = None
accuracy_score = None
f1_score = None

def _load_ml_dependencies():
    """Lazy load expensive ML libraries only when needed"""
    global numpy, GradientBoostingClassifier, RandomForestClassifier
    global Pipeline, StandardScaler, train_test_split, StratifiedKFold
    global cross_val_score, classification_report, roc_auc_score
    global confusion_matrix, accuracy_score, f1_score

    if numpy is None:
        import numpy as np_module
        numpy = np_module
        from sklearn.ensemble import GradientBoostingClassifier as GB, RandomForestClassifier as RF
        from sklearn.pipeline import Pipeline as P
        from sklearn.preprocessing import StandardScaler as SS
        from sklearn.model_selection import train_test_split as tts, StratifiedKFold as SKF, cross_val_score as cvs
        from sklearn.metrics import classification_report as cr, roc_auc_score as ras, confusion_matrix as cm, accuracy_score as ac, f1_score as f1

        GradientBoostingClassifier = GB
        RandomForestClassifier = RF
        Pipeline = P
        StandardScaler = SS
        train_test_split = tts
        StratifiedKFold = SKF
        cross_val_score = cvs
        classification_report = cr
        roc_auc_score = ras
        confusion_matrix = cm
        accuracy_score = ac
        f1_score = f1

# Ingest RealtimeHazardFetcher from realtime_pipeline
try:
    from .realtime_pipeline import RealtimeHazardFetcher, NER_CORRIDOR_WAYPOINTS
except ImportError:
    # Direct execution fallback
    from realtime_pipeline import RealtimeHazardFetcher, NER_CORRIDOR_WAYPOINTS


FEATURE_NAMES = [
    'rainfall_24h',
    'slope_degrees',
    'elevation_m',
    'soil_saturation',
    'drainage_quality',
    'vegetation_cover'
]


def load_historical_csv_datasets(data_dir: str) -> Tuple[np.ndarray, np.ndarray, int]:
    """
    Loads real-world historical disaster incident data from CSV files in data_dir.
    Standardizes columns to the 6 model features and extracts labels.
    """
    rows = []
    labels = []
    loaded_count = 0

    csv_candidates = [
        os.path.join(data_dir, "assam_disruption_filled_data.csv"),
        os.path.join(data_dir, "standardized_bhukosh_disruptions.csv"),
        os.path.join(data_dir, "realtime_ner_hazard_data.csv")
    ]

    for csv_path in csv_candidates:
        if not os.path.exists(csv_path):
            continue

        try:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    try:
                        # Extract rainfall
                        rain = float(row.get("rainfall_24", row.get("rainfall_24h_mm", row.get("rainfall_24h", 0.0))))
                        # Extract slope
                        slope = float(row.get("slope", row.get("slope_deg", row.get("slope_degrees", 0.0))))
                        # Extract elevation
                        elevation = float(row.get("elevation_m", row.get("elevation", 150.0)))
                        # Extract drainage
                        drainage = float(row.get("drainage", row.get("drainage_density_km_per_km2", row.get("drainage_quality", 2.0))))
                        # Extract vegetation
                        veg = float(row.get("vegetation", row.get("vegetation_ndvi", row.get("vegetation_cover", 0.55))))
                        # Compute / extract soil saturation
                        if "soil_saturation" in row:
                            soil_sat = float(row["soil_saturation"])
                        else:
                            soil_sat = float(np.clip(0.2 + (rain / 180.0) + (drainage * 0.04) - (slope * 0.003), 0.1, 1.0))

                        # Extract target label
                        disrupt_raw = row.get("disruption", row.get("disrupted", 0))
                        label = int(float(disrupt_raw))

                        rows.append([rain, slope, elevation, soil_sat, drainage, veg])
                        labels.append(label)
                        loaded_count += 1
                    except (ValueError, TypeError):
                        continue
        except Exception as e:
            print(f"[-] Warning: Failed reading {csv_path}: {e}")

    if rows:
        return np.array(rows, dtype=np.float64), np.array(labels, dtype=np.int64), loaded_count
    return np.empty((0, 6), dtype=np.float64), np.empty((0,), dtype=np.int64), 0


def fetch_live_training_data(
    fetcher: Optional[RealtimeHazardFetcher] = None,
    grid_expansion: bool = True
) -> Tuple[np.ndarray, np.ndarray, int]:
    """
    Uses RealtimeHazardFetcher to query live open APIs for real-time corridor nodes
    and an expanded regional grid across Northeast India.
    """
    if fetcher is None:
        fetcher = RealtimeHazardFetcher(request_timeout=6)

    print(f"[*] Ingesting live data from RealtimeHazardFetcher across {len(NER_CORRIDOR_WAYPOINTS)} corridor waypoints...")
    rows = []
    labels = []
    fetched_count = 0

    points_to_query = list(NER_CORRIDOR_WAYPOINTS)

    # Add regional corridor grid points if enabled
    if grid_expansion:
        # Key mountain passes and river corridors in NER
        additional_points = [
            {"name": "Nagaon Arterial", "district": "Nagaon", "lat": 26.3504, "lon": 92.6923, "state": "Assam"},
            {"name": "Golaghat Highway", "district": "Golaghat", "lat": 26.4092, "lon": 93.9119, "state": "Assam"},
            {"name": "Goalpara River Hub", "district": "Goalpara", "lat": 26.1667, "lon": 90.6167, "state": "Assam"},
            {"name": "Dhubri Border Corridor", "district": "Dhubri", "lat": 26.0675, "lon": 90.0224, "state": "Assam"},
            {"name": "Chirang Foothills", "district": "Chirang", "lat": 26.5253, "lon": 90.4907, "state": "Assam"},
            {"name": "Lakhimpur Flood Zone", "district": "Lakhimpur", "lat": 27.2333, "lon": 94.1167, "state": "Assam"},
            {"name": "Majuli Island Terminal", "district": "Majuli", "lat": 27.0010, "lon": 94.2619, "state": "Assam"},
            {"name": "Sivasagar Transit", "district": "Sivasagar", "lat": 26.9840, "lon": 94.6370, "state": "Assam"},
            {"name": "Cherrapunji High-Rain Corridor", "district": "East Khasi Hills", "lat": 25.2700, "lon": 91.7300, "state": "Meghalaya"},
            {"name": "Mawlynnong Pass", "district": "East Khasi Hills", "lat": 25.2000, "lon": 91.9000, "state": "Meghalaya"},
            {"name": "Tawang Mountain Pass", "district": "Tawang", "lat": 27.5861, "lon": 91.8594, "state": "Arunachal Pradesh"},
            {"name": "Bomdila Pass", "district": "West Kameng", "lat": 27.2645, "lon": 92.4227, "state": "Arunachal Pradesh"},
            {"name": "Ziro Valley Route", "district": "Lower Subansiri", "lat": 27.5644, "lon": 93.8385, "state": "Arunachal Pradesh"},
            {"name": "Mokokchung Highway", "district": "Mokokchung", "lat": 26.3256, "lon": 94.5203, "state": "Nagaland"},
            {"name": "Tuensang Corridor", "district": "Tuensang", "lat": 26.2764, "lon": 94.8290, "state": "Nagaland"},
            {"name": "Churachandpur Transit", "district": "Churachandpur", "lat": 24.3333, "lon": 93.6833, "state": "Manipur"},
            {"name": "Lunglei Hill Arterial", "district": "Lunglei", "lat": 22.8671, "lon": 92.7655, "state": "Mizoram"},
            {"name": "Champhai Border Gate", "district": "Champhai", "lat": 23.4750, "lon": 93.3280, "state": "Mizoram"},
            {"name": "Udaipur South Tripura Route", "district": "Gomati", "lat": 23.5333, "lon": 91.4833, "state": "Tripura"},
            {"name": "Dharmanagar North Transit", "district": "North Tripura", "lat": 24.3833, "lon": 92.1667, "state": "Tripura"},
            {"name": "Namchi South Sikkim Pass", "district": "South Sikkim", "lat": 27.1667, "lon": 88.3500, "state": "Sikkim"},
            {"name": "Mangan North Sikkim Corridor", "district": "North Sikkim", "lat": 27.5000, "lon": 88.5333, "state": "Sikkim"},
        ]
        points_to_query.extend(additional_points)

    for pt in points_to_query:
        lat = float(pt["lat"])
        lon = float(pt["lon"])

        rain = fetcher.fetch_rainfall_24h(lat, lon)
        elev_slope = fetcher.fetch_elevation_and_slope(lat, lon)
        slope = elev_slope["slope"]
        elevation = elev_slope["elevation"]
        drainage = fetcher.estimate_drainage_density(lat, lon)
        veg = fetcher.estimate_vegetation_ndvi(lat, lon, rain)
        disruption = fetcher.determine_disruption(rain, slope, drainage, veg, elevation)

        soil_sat = float(np.clip(0.2 + (rain / 180.0) + (drainage * 0.04) - (slope * 0.003), 0.1, 1.0))

        rows.append([rain, slope, elevation, soil_sat, drainage, veg])
        labels.append(disruption)
        fetched_count += 1

    print(f"[+] Live fetch completed: {fetched_count} live corridor data points collected.")
    return np.array(rows, dtype=np.float64), np.array(labels, dtype=np.int64), fetched_count


def generate_physics_augmented_data(n_samples: int = 4000, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates physics-based geo-climatic augmented samples covering full disaster spectrum:
    - High-incline flash landslides (slope > 25 deg, high rainfall, saturated soil)
    - Low-incline river basin flash floods (slope < 3 deg, high drainage congestion, heavy rainfall)
    - Moderate monsoon conditions and dry/clear weather corridors
    """
    np.random.seed(random_state)

    # 1. Rainfall (mm): Mixture of clear, moderate, heavy, and extreme torrential rainfall
    rain_clear = np.random.uniform(0, 15, size=int(n_samples * 0.4))
    rain_monsoon = np.random.exponential(scale=45.0, size=int(n_samples * 0.4))
    rain_extreme = np.random.uniform(75, 280, size=int(n_samples * 0.2))
    rainfall = np.concatenate([rain_clear, rain_monsoon, rain_extreme])
    rainfall = np.clip(rainfall, 0, 300)
    np.random.shuffle(rainfall)

    # 2. Slope (degrees): plains (0-5 deg), foothills (5-20 deg), steep mountains (20-60 deg)
    slope = np.random.beta(a=1.8, b=3.2, size=n_samples) * 60.0

    # 3. Elevation (meters): 30m in floodplains to 2800m in Himalayan passes
    elevation = np.random.uniform(30, 2600, size=n_samples)

    # 4. Drainage Quality (km/km2): 0.8 to 4.0
    drainage = np.random.uniform(0.8, 3.8, size=n_samples)

    # 5. Vegetation Cover (NDVI): 0.15 (barren/cleared) to 0.88 (dense forest)
    vegetation = np.random.uniform(0.20, 0.85, size=n_samples)

    # 6. Soil Saturation: Derived from rainfall, slope, and drainage
    soil_saturation = 0.25 + (rainfall / 220.0) + (drainage * 0.05) - (slope * 0.003)
    soil_saturation = np.clip(soil_saturation + np.random.normal(0, 0.03, size=n_samples), 0.1, 1.0)

    # Ground truth physical disruption trigger logic
    # Landslide trigger: steep slope + heavy rainfall + saturated soil + low vegetation
    landslide_risk = (slope >= 15.0) & (rainfall >= 55.0) & (soil_saturation >= 0.55)
    severe_landslide = (slope >= 28.0) & (rainfall >= 35.0)

    # River basin flood trigger: flat terrain + high drainage density + torrential rain
    flood_risk = (slope <= 4.0) & (drainage >= 2.1) & (rainfall >= 80.0)
    extreme_weather_risk = (rainfall >= 135.0)

    # Continuous logit score
    z = (
        0.028 * rainfall
        + 0.052 * slope
        + 2.1 * soil_saturation
        - 0.35 * drainage
        - 1.4 * vegetation
        + 0.00025 * elevation
        - 3.1
    )
    prob = 1.0 / (1.0 + np.exp(-z))

    # Binary label with physical override
    labels = ((prob >= 0.5) | landslide_risk | severe_landslide | flood_risk | extreme_weather_risk).astype(int)

    X = np.column_stack([
        rainfall,
        slope,
        elevation,
        soil_saturation,
        drainage,
        vegetation
    ])

    return X, labels


def assemble_unified_training_dataset(
    data_dir: Optional[str] = None,
    fetch_live: bool = True,
    n_augmented: int = 4000
) -> Tuple[np.ndarray, np.ndarray, Dict[str, int]]:
    """
    Assembles a unified dataset combining:
    1. Historical CSV disruption data
    2. Live API-fetched real-time corridor data
    3. Physics-augmented disaster boundary data
    """
    if data_dir is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(base_dir, "..", ".."))
        data_dir = os.path.join(project_root, "Real-time data sample")

    X_list = []
    y_list = []
    meta_counts = {"historical": 0, "live_fetched": 0, "augmented": 0}

    # 1. Historical Data
    if os.path.exists(data_dir):
        X_hist, y_hist, count_hist = load_historical_csv_datasets(data_dir)
        if count_hist > 0:
            X_list.append(X_hist)
            y_list.append(y_hist)
            meta_counts["historical"] = count_hist
            print(f"[+] Loaded {count_hist} historical disruption records from {data_dir}")

    # 2. Live API Real-Time Ingestion
    if fetch_live:
        try:
            X_live, y_live, count_live = fetch_live_training_data()
            if count_live > 0:
                X_list.append(X_live)
                y_list.append(y_live)
                meta_counts["live_fetched"] = count_live
        except Exception as e:
            print(f"[-] Live fetching warning: {e}. Continuing with historical & augmented data.")

    # 3. Physics-Augmented Data
    X_aug, y_aug = generate_physics_augmented_data(n_samples=n_augmented)
    X_list.append(X_aug)
    y_list.append(y_aug)
    meta_counts["augmented"] = len(X_aug)

    X_total = np.vstack(X_list)
    y_total = np.concatenate(y_list)
    meta_counts["total"] = len(X_total)

    print(f"[+] Unified dataset assembled: {len(X_total)} total samples ({meta_counts['historical']} historical, {meta_counts['live_fetched']} live API, {meta_counts['augmented']} physics-augmented).")
    return X_total, y_total, meta_counts


def train_and_save_model(
    output_path: Optional[str] = None,
    data_dir: Optional[str] = None,
    fetch_live: bool = True,
    n_augmented: int = 4500
) -> Dict[str, Any]:
    """
    Trains the Disruption Risk Gradient Boosting Pipeline and serializes model.pkl.
    """
    if output_path is None:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(current_dir, 'model.pkl')

    print("\n" + "=" * 65)
    print("SETU DISRUPTION RISK MODEL - TRAINING WITH REAL-TIME FETCHER")
    print("=" * 65)

    X, y, meta_counts = assemble_unified_training_dataset(
        data_dir=data_dir,
        fetch_live=fetch_live,
        n_augmented=n_augmented
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    model_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', GradientBoostingClassifier(
            n_estimators=150,
            learning_rate=0.08,
            max_depth=5,
            subsample=0.85,
            min_samples_leaf=4,
            random_state=42
        ))
    ])

    print(f"\n[*] Training GradientBoostingClassifier on {len(X_train)} training instances...")
    model_pipeline.fit(X_train, y_train)

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model_pipeline, X, y, cv=cv, scoring='roc_auc')
    print(f"[+] 5-Fold Cross-Validation ROC-AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    # Evaluation on Holdout Test Set
    y_pred = model_pipeline.predict(X_test)
    y_proba = model_pipeline.predict_proba(X_test)[:, 1]

    roc_auc = float(roc_auc_score(y_test, y_proba))
    acc = float(accuracy_score(y_test, y_pred))
    f1 = float(f1_score(y_test, y_pred))
    cm = confusion_matrix(y_test, y_pred).tolist()

    print(f"\n[+] Holdout Test Evaluation:")
    print(f"    - ROC-AUC:  {roc_auc:.4f}")
    print(f"    - Accuracy: {acc:.4f}")
    print(f"    - F1-Score: {f1:.4f}")
    print(f"\nClassification Report:\n{classification_report(y_test, y_pred, target_names=['Clear/Normal', 'Disrupted/Hazard'])}")

    # Extract Feature Importances
    gb_classifier = model_pipeline.named_steps['classifier']
    importances = gb_classifier.feature_importances_
    feat_importance_dict = {
        name: round(float(imp), 4)
        for name, imp in zip(FEATURE_NAMES, importances)
    }

    print("Feature Importances:")
    for name, imp in sorted(feat_importance_dict.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {name:<18}: {imp*100:5.2f}%")

    model_payload = {
        'pipeline': model_pipeline,
        'feature_names': FEATURE_NAMES,
        'feature_importances': feat_importance_dict,
        'metrics': {
            'roc_auc': round(roc_auc, 4),
            'accuracy': round(acc, 4),
            'f1_score': round(f1, 4),
            'cv_roc_auc_mean': round(float(cv_scores.mean()), 4),
            'confusion_matrix': cm
        },
        'metadata': {
            'trained_at': datetime.now(timezone.utc).isoformat(),
            'total_samples': meta_counts['total'],
            'historical_samples': meta_counts['historical'],
            'live_fetched_samples': meta_counts['live_fetched'],
            'augmented_samples': meta_counts['augmented'],
            'version': '2.0.0-realtime-enhanced'
        }
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'wb') as f:
        pickle.dump(model_payload, f)

    print(f"\n[+] Model artifact successfully trained and serialized to: {output_path}")
    print("=" * 65 + "\n")
    return model_payload


def main():
    parser = argparse.ArgumentParser(description="SETU Disruption Risk Model Training Engine with Realtime Hazard Fetcher")
    parser.add_argument("--fetch-live", action="store_true", default=True, help="Fetch live real-time API data during training")
    parser.add_argument("--no-live", dest="fetch_live", action="store_false", help="Skip live API fetching (use historical & augmented only)")
    parser.add_argument("--data-dir", type=str, default=None, help="Directory containing historical CSV samples")
    parser.add_argument("--output", type=str, default=None, help="Output path for model.pkl")
    parser.add_argument("--samples", type=int, default=4500, help="Number of physics-augmented samples to generate")

    args = parser.parse_args()
    train_and_save_model(
        output_path=args.output,
        data_dir=args.data_dir,
        fetch_live=args.fetch_live,
        n_augmented=args.samples
    )


if __name__ == '__main__':
    main()
