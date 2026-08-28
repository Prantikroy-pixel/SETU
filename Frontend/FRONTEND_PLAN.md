# FRONTEND_PLAN — SETU Frontend Specifications & API Contract

This document provides a comprehensive mapping of the Django REST Framework (DRF) backend to guide the frontend development of **SETU**.

---

## 1. Authentication & Session Management

- **Mechanism**: JSON Web Token (JWT) via `django-rest-framework-simplejwt`.
- **JWT Lifetimes**: Access Token: 60 minutes (customizable in env) | Refresh Token: 7 days.
- **Storage**: Store access and refresh tokens in `localStorage`.
- **API Request Header**: `Authorization: Bearer <access_token>`.

### Authentication Endpoints

#### `POST /api/auth/register/` (AllowAny)
Registers a new user profile and returns tokens for automatic log-in.
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "password": "securepassword123",
    "role": "field_officer", // choice: field_officer, transport_operator, district_admin, citizen, ngo, admin
    "email": "john@example.com", // optional
    "first_name": "John", // optional
    "last_name": "Doe", // optional
    "phone_number": "+919876543210", // optional
    "preferred_language": "en", // choice: en, as, bn, hi
    "district_id": 1 // home district ID (optional)
  }
  ```
- **Response Shape (201 Created)**:
  ```json
  {
    "message": "User successfully registered.",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "field_officer",
      "phone_number": "+919876543210",
      "preferred_language": "en",
      "district": 1,
      "district_name": "Cachar",
      "district_state": "Assam",
      "is_verified": false,
      "created_at": "2026-08-24T12:00:00Z"
    },
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
  ```

#### `POST /api/auth/login/` (AllowAny)
Authenticates credentials and returns user profile + token pair.
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "password": "securepassword123"
  }
  ```
- **Response Shape (200 OK)**:
  ```json
  {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "username": "johndoe",
      "role": "field_officer",
      "district": 1,
      "district_name": "Cachar",
      "is_verified": false
      // ...other user fields
    }
  }
  ```

#### `POST /api/auth/token/refresh/` (AllowAny)
Rotates access token.
- **Request Body**: `{ "refresh": "<refresh_token>" }`
- **Response Shape (200 OK)**: `{ "access": "<new_access_token>" }`

#### `GET /api/auth/me/` & `PATCH /api/auth/me/` (IsAuthenticated)
Gets or partially updates the current user profile (preferred language, phone, etc.).

#### `GET /api/auth/users/` (IsAuthenticated)
Queries users in the system. Filter parameters: `?role=&district=`.

---

## 2. API Endpoints Map

### 2.1 Core Domain Entities (`/api/`)

#### Districts (`/api/districts/`)
- **`GET /api/districts/`**: Paginated list (size 50) of all NER districts. Query parameter: `?search=Cachar`.
  - **Item Shape**:
    ```json
    {
      "id": 1,
      "name": "Cachar",
      "state": "Assam",
      "boundary": null, // Polygon geometry (if pre-synced)
      "centroid": {
        "type": "Point",
        "coordinates": [92.7789, 24.8333],
        "latitude": 24.8333,
        "longitude": 92.7789
      },
      "population": 1736617,
      "open_needs_count": 3,
      "available_resources_count": 8
    }
    ```
- **`GET /api/districts/{id}/boundary/`**: Returns official boundary coordinates (fetching live from OSM Overpass if not cached).
- **`POST /api/districts/sync-boundaries/`**: Triggers boundary sync. Payload: `{ "state": "Assam" }` (optional).

#### Needs / Demands (`/api/needs/`)
- **`GET /api/needs/`**: List relief needs. Filters: `?status=open&type=water&district=1&urgency=critical`.
- **`POST /api/needs/`**: Submits a new need. Auto-associates logged-in user as reporter.
  - **Request Body**:
    ```json
    {
      "type": "food", // food, water, medicine, construction_material, agricultural_produce, other
      "latitude": 24.83,
      "longitude": 92.78,
      "district": 1, // District ID
      "urgency": "critical", // critical, high, medium, low
      "quantity": 500,
      "unit": "packets",
      "description": "Urgent requirements for flood victims in Silchar"
    }
    ```
- **`POST /api/needs/{id}/attachments/`**: Uploads multipart image/video files for verification.
  - **Payload**: Multipart form with `file` and `media_type` (`photo` or `video`).

#### Resource Stockpiles (`/api/resources/`)
- **`GET /api/resources/`**: List stockpiles. Filters: `?type=&district=&verification_status=&available_only=true`.
- **`POST /api/resources/`**: Register stockpile availability. Auto-sets provider to current user and verification status to `verified_org` if user `is_verified` is true.
  - **Request Body**: `{ "type": "food", "latitude": 24.83, "longitude": 92.78, "district": 1, "quantity_available": 1000, "unit": "packets" }`

#### Ground Conditions & Hazards (`/api/conditions/`)
- **`GET /api/conditions/`**: List environmental reports. Filters: `?district=&condition_type=road_status&source=field_report`.
- **`POST /api/conditions/`**: Log a condition. Triggers automated downstream delay cascade and SMS broadcasts if value is `blocked`/`flooded`/`landslide`.
  - **Request Body**:
    ```json
    {
      "condition_type": "road_status", // road_status, rainfall, landslide_risk, traffic
      "value": "blocked", // blocked, clear, 45mm, etc.
      "latitude": 24.832,
      "longitude": 92.775,
      "district": 1,
      "risk_score": 0.85 // optional
    }
    ```
- **`POST /api/conditions/{id}/attachments/`**: Logs incident photo/video evidence.

#### Active Allocations (`/api/allocations/`)
- **`GET /api/allocations/`**: Fetch active transits.
- **`PATCH /api/allocations/{id}/`**: Update transit milestone.
  - **Request Body**: `{ "delivery_status": "en_route", "vehicle": 2 }`
  - **Status Transitions**: `matched` $\rightarrow$ `dispatched` $\rightarrow$ `en_route` $\rightarrow$ `delivered` (closes associated Need automatically) | `delayed`.

#### System Alerts (`/api/alerts/`)
- **`GET /api/alerts/`**: Queries active alert feed. Filters: `?district=&severity=&alert_type=road_blocked`.

#### Critical Institutions (`/api/institutions/`)
- **`GET /api/institutions/`**: Query master public registry. Query params: `?category=hospital&state=Assam&live=true` (syncs OSM live if `live=true`).
- **`POST /api/institutions/sync-external/`**: Mass-syncs OSM and SDMA datasets. Payload: `{ "include_osm": true, "district": "Cachar" }`.
- **`POST /api/institutions/fetch-live/`**: Live overpass spatial bounding box queries. Payload: `{ "bbox": [min_lat, min_lon, max_lat, max_lon] }`.

#### Spatial Boundary & Geofencing (`/api/boundaries/`)
- **`GET /api/boundaries/ner-borders/`**: Returns all international checkposts (Dawki, Moreh) and permit gateways.
- **`GET /api/boundaries/check-proximity/?lat=25.18&lon=92.02`**: Real-time geofence warnings (e.g. proximity warning if vehicle is $<15\text{ km}$ from the border).
- **`POST /api/boundaries/analyze-route/`**: Inspects transit coordinates arrays for ILP crossings.
  - **Payload**: `{ "route_points": [ {"lat": 26.14, "lon": 91.73}, ... ] }`

---

### 2.2 Matching Engine (`/api/`)

#### Discovery & Explainable Scoring (`GET /api/needs/{id}/matches/`)
Triggers the multi-criteria scoring loop. Computes Urgency, Exponential Proximity decay ($e^{-\lambda d}$), Verification Status, Quantity Fit, and Dynamic Corridor Hazard Risk.
- **Response Shape**:
  ```json
  {
    "need_id": 1,
    "need_type": "food",
    "urgency": "critical",
    "quantity_required": 500,
    "total_candidates_evaluated": 2,
    "matches": [
      {
        "id": 15,
        "need": 1,
        "resource": 4,
        "resource_details": {
          "id": 4,
          "type": "food",
          "quantity_available": 1000,
          "unit": "packets",
          "provider_username": "redcross_depot"
        },
        "score": 0.8942,
        "score_breakdown": {
          "urgency": 1.0,
          "proximity": 0.824,
          "verification": 1.0,
          "quantity_fit": 1.0,
          "delay_risk": 0.95,
          "distance_km": 12.4
        },
        "status": "proposed"
      }
    ]
  }
  ```

#### Confirm Match & Assign Fleet (`POST /api/matches/{id}/confirm/`)
Atomically seals matching, creates Allocation, and routes transit path.
- **Request Body**:
  ```json
  {
    "vehicle_id": 2 // Optional Vehicle Primary Key
  }
  ```
- **Response Shape (200 OK)**:
  ```json
  {
    "message": "Match confirmed and resource allocated successfully.",
    "allocation": {
      "id": 10,
      "match": 15,
      "delivery_status": "dispatched",
      "route_geojson": {
        "type": "Feature",
        "geometry": {
          "type": "LineString",
          "coordinates": [[92.7789, 24.8333], [92.782, 24.835], [92.795, 24.84]]
        },
        "properties": {
          "distance_km": 12.4,
          "estimated_duration_minutes": 31
        }
      }
    }
  }
  ```

---

### 2.3 Logistics GPS Telemetry (`/api/`)

#### List Vehicles (`GET /api/vehicles/`)
Queries fleet availability. Filter parameters: `?status=idle&operator=1`.

#### Register Vehicle (`POST /api/vehicles/`)
Registers registration number and type (5-Ton Truck, Relief Boat, 4x4 Pickup). Payload: `{ "registration_number": "AS-01-AB-1234", "vehicle_type": "5-Ton Truck" }`.

#### GPS Ping Location Stream (`POST /api/vehicles/{id}/ping/`)
Updates GPS telemetry.
- **Request Body**:
  ```json
  {
    "latitude": 24.8351,
    "longitude": 92.7794,
    "status": "en_route" // optional status update
  }
  ```
- **Response Shape**:
  ```json
  {
    "message": "Vehicle GPS ping updated successfully.",
    "vehicle": {
      "id": 2,
      "registration_number": "AS-01-AB-1234",
      "current_location": {
        "type": "Point",
        "coordinates": [92.7794, 24.8351],
        "latitude": 24.8351,
        "longitude": 92.7794
      },
      "status": "en_route",
      "last_ping_at": "2026-08-24T12:05:00Z"
    }
  }
  ```

---

### 2.4 Command Analytics (`/api/dashboard/`)

#### District Command Summary (`GET /api/dashboard/district-summary/`)
Core analytics card loader for MDoNER dashboards.
- **Response Shape**:
  ```json
  {
    "overview": {
      "total_districts_monitored": 8,
      "total_open_needs": 15,
      "total_critical_needs": 4,
      "total_fulfilled_needs": 28,
      "total_available_resources": 42,
      "total_blocked_corridors": 2,
      "total_critical_alerts": 3,
      "system_health_status": "normal_operations"
    },
    "districts": [
      {
        "district_id": 1,
        "name": "Cachar",
        "state": "Assam",
        "population": 1736617,
        "centroid": { "latitude": 24.83, "longitude": 92.78 },
        "needs": { "total": 10, "open": 3, "critical": 1, "fulfilled": 7 },
        "resources": { "available_count": 8, "verified_org_count": 6 },
        "hazards": { "blocked_roads_count": 1, "high_risk_conditions_count": 2, "active_alerts_count": 1 },
        "logistics": { "active_allocations": 2, "delayed_allocations": 1 },
        "bottleneck_index": 5.4,
        "connectivity_status": "moderate_stress" // severe_bottleneck, moderate_stress, stable, optimal
      }
    ]
  }
  ```

---

## 3. AI/ML Inference Points

### 3.1 Landslide Disruption Risk Inference (`GET /api/conditions/predict-risk/`)
- **Execution Mode**: In-process Synchronous Classifier evaluation.
- **Latency Factors**:
  - **Heuristic mode (Manual feature input)**: `<0.1s` (instantly evaluates physics heuristic).
  - **Live GIS query mode (`use_realtime=true` with omitted geo-inputs)**: `2.0s - 5.0s`. Calls live weather and DEM elevation/slope servers to build parameters.
- **Design Directive**: Displays a spinner with descriptive steps (e.g. *"Querying satellite elevation model..."*, *"Fetching Open-Meteo precipitation indexes..."*, *"Running Gradient Boosting inference..."*) to reflect the active pipelines.

---

## 4. WebSockets / SSE Channels
- **None Active**: The backend uses standard stateless REST operations. Real-time updates on active dashboards are driven by **HTTP polling** (`10s` intervals for dashboard stats and `15s` for vehicle map coordinates).

---

## 5. Granular Role-Based Access Control (RBAC)

| Role Code | Role Name | Primary Interface Features |
|---|---|---|
| `citizen` | Citizen | Report urgent needs, view public road passability map, check notification broadcasts in home language. |
| `field_officer` | Field Officer | Log road blockages/hazards, trigger instant risk predictors, upload photo evidence, view district status. |
| `ngo` | NGO / Depot Provider | Register relief stockpile inventories, monitor incoming matched requests. |
| `transport_operator` | Fleet Operator | Register vehicles, monitor active routing allocations, simulate driver GPS coordinates ping. |
| `district_admin` | Command Admin | Full summary maps, sync boundary coordinates, perform AI need-to-resource matching, allocate vehicles. |
| `admin` | Administrator | Complete data configuration control. |

---

## 6. CORS & Settings Configuration
- **CORS Status**: Fully compatible. `CORS_ALLOW_ALL_ORIGINS = True` in debug mode. No proxy headers are required.
- **Database Fallbacks**: SQLite transparent spatial layers are active. Local database operations will execute smoothly without local GDAL installation dependencies.
