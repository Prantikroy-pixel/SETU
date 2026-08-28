"""
Disruption Risk Prediction Model for SETU
Predicts logistical disruption and route risk based on real-time weather, slope, and terrain features.
"""

from .predict import (
    predict_risk,
    predict_route_risk,
    fetch_realtime_features_for_coord,
    interpolate_route_waypoints,
    detect_route_anomalies,
)
from .realtime_pipeline import RealtimeHazardFetcher

# Lazy import train_and_save_model to avoid loading sklearn on Django startup
def train_and_save_model(*args, **kwargs):
    """Lazy wrapper for training - only imports sklearn when actually called"""
    from .train import train_and_save_model as _train
    return _train(*args, **kwargs)

__all__ = [
    'predict_risk',
    'predict_route_risk',
    'fetch_realtime_features_for_coord',
    'interpolate_route_waypoints',
    'detect_route_anomalies',
    'train_and_save_model',
    'RealtimeHazardFetcher'
]
