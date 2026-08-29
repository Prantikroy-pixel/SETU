"""
Spatial Compatibility Layer for SETU.
Allows transparent operation in full PostGIS/GDAL environments (Docker/Cloud VM)
as well as local development environments where GDAL C-libraries might not be pre-installed.
"""

import json
from django.db import models

try:
    from django.contrib.gis.db import models as gis_models
    from django.contrib.gis.geos import Point, Polygon
    HAS_GIS = True
except Exception:
    gis_models = None
    HAS_GIS = False


# Always define FallbackSpatialField (needed for migrations to work)
class MockPoint:
    """Lightweight Point object mimicking GEOSGeometry Point."""
    def __init__(self, x=0.0, y=0.0, srid=4326):
        if isinstance(x, (list, tuple)) and len(x) >= 2:
            self.x = float(x[0])  # longitude
            self.y = float(x[1])  # latitude
        else:
            self.x = float(x)
            self.y = float(y)
        self.srid = srid

    @property
    def coords(self):
        return (self.x, self.y)

    @property
    def longitude(self):
        return self.x

    @property
    def latitude(self):
        return self.y

    @property
    def lat(self):
        return self.y

    @property
    def lon(self):
        return self.x

    @property
    def geojson(self):
        return json.dumps({
            "type": "Point",
            "coordinates": [self.x, self.y]
        })

    def __str__(self):
        return f"POINT ({self.x} {self.y})"

    def __repr__(self):
        return f"<Point x={self.x} y={self.y}>"


class FallbackSpatialField(models.JSONField):
    """Fallback field storing GeoJSON / coordinates when GDAL is not installed."""
    def __init__(self, *args, geography=True, spatial_index=True, srid=4326, **kwargs):
        self.geography = geography
        self.spatial_index = spatial_index
        self.srid = srid
        kwargs.setdefault('null', True)
        kwargs.setdefault('blank', True)
        super().__init__(*args, **kwargs)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except Exception:
                return value
        if isinstance(value, dict) and value.get('type') == 'Point':
            coords = value.get('coordinates', [0, 0])
            return MockPoint(coords[0], coords[1])
        elif isinstance(value, (list, tuple)) and len(value) >= 2:
            return MockPoint(value[0], value[1])
        return value

    def to_python(self, value):
        if value is None or isinstance(value, MockPoint):
            return value
        if isinstance(value, dict) and value.get('type') == 'Point':
            coords = value.get('coordinates', [0, 0])
            return MockPoint(coords[0], coords[1])
        if isinstance(value, (list, tuple)) and len(value) >= 2:
            return MockPoint(value[0], value[1])
        return super().to_python(value)

    def get_prep_value(self, value):
        if value is None:
            return None
        if isinstance(value, MockPoint):
            return {"type": "Point", "coordinates": [value.x, value.y]}
        if isinstance(value, dict):
            return value
        return super().get_prep_value(value)


if HAS_GIS:
    SpatialPointField = gis_models.PointField
    SpatialPolygonField = gis_models.PolygonField
    SpatialGeometryField = gis_models.GeometryField
else:
    SpatialPointField = FallbackSpatialField
    SpatialPolygonField = FallbackSpatialField
    SpatialGeometryField = FallbackSpatialField
