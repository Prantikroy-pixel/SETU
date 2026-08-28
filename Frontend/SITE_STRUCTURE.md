# SETU — Frontend UI Architecture & Site Structure

This document provides a comprehensive structural file of the frontend application (`setu-frontend`) to guide UI updates, component restyling, design enhancement, and layout redesigns.

---

## 1. Project Directory Structure

```
frontend/
├── index.html                  # HTML entry point (title, viewport, fonts)
├── package.json                # Project dependencies, scripts, dependencies
├── vite.config.js              # Vite build configuration & server port setup
├── tailwind.config.js          # Tailwind CSS theme extension & color palette
├── postcss.config.js           # PostCSS configuration for Tailwind
├── FRONTEND_PLAN.md            # API contract & backend integration specs
├── SITE_STRUCTURE.md          # UI Architecture & Site Structure reference file (this file)
├── public/                     # Static public assets
└── src/                        # Main React source code
    ├── main.jsx                # React DOM root render
    ├── App.jsx                 # Routing hierarchy, Role Dispatcher & Layout Guards
    ├── index.css               # Global styles, Tailwind directives & Leaflet overrides
    ├── api.js                  # Axios instance, API endpoints, mock data fallbacks
    ├── components/             # Reusable UI components
    │   └── Navbar.jsx          # Top navigation bar, role badge, user profile, logout
    ├── context/                # React Context Providers
    │   └── AuthContext.jsx     # User auth state, tokens, role persistence, login/logout
    └── pages/                  # Main page layouts and role-based portals
        ├── Login.jsx           # Sign in view
        ├── Register.jsx        # User registration view (Role selection & District pick)
        ├── DistrictDashboard.jsx # Admin / District Control Center portal
        ├── FieldOfficerPortal.jsx # Field Officer assessment & demand logging portal
        ├── NgoPortal.jsx       # NGO resource allocation & supply tracking portal
        ├── TransportPortal.jsx # Transport operator fleet & logistics management portal
        └── CitizenPortal.jsx   # Public citizen SOS reporting & disaster tracking portal
```

---

## 2. Route & Role Matrix

All routes use `react-router-dom` v6 with role-based layout guards (`RoleRoute` & `MainLayout` in [`App.jsx`](file:///d:/SETU/SETU/frontend/src/App.jsx)).

| Route Path | Associated Page Component | Allowed Roles | Description / Function |
| :--- | :--- | :--- | :--- |
| `/login` | [`Login.jsx`](file:///d:/SETU/SETU/frontend/src/pages/Login.jsx) | Public (All) | User login portal |
| `/register` | [`Register.jsx`](file:///d:/SETU/SETU/frontend/src/pages/Register.jsx) | Public (All) | Account registration with district & role selection |
| `/` | `RoleRedirectDispatcher` | Authenticated | Dynamic home dispatcher that redirects users based on `user.role` |
| `/dashboard` | [`DistrictDashboard.jsx`](file:///d:/SETU/SETU/frontend/src/pages/DistrictDashboard.jsx) | `district_admin`, `admin` | Strategic district control dashboard, maps, AI matching engine metrics |
| `/officer` | [`FieldOfficerPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/FieldOfficerPortal.jsx) | `field_officer` | Rapid field assessment logs, relief demands, location tags |
| `/ngo` | [`NgoPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/NgoPortal.jsx) | `ngo` | Inventory supply posting, donation matching, distribution status |
| `/operator` | [`TransportPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/TransportPortal.jsx) | `transport_operator` | Fleet tracking, vehicle dispatch, route status, capacity updates |
| `/citizen` | [`CitizenPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/CitizenPortal.jsx) | `citizen` | Emergency SOS broadcast, shelter maps, supply request updates |

---

## 3. UI Component Breakdown & Page Layouts

### 3.1 Global Elements
- **Navigation Bar ([`Navbar.jsx`](file:///d:/SETU/SETU/frontend/src/components/Navbar.jsx))**:
  - Displays SETU logo & branding.
  - Role pill indicator with distinct color coding per role.
  - Language selector dropdown (`en`, `as`, `bn`, `hi`).
  - User profile modal toggle & Logout button.

- **Global Shell ([`App.jsx`](file:///d:/SETU/SETU/frontend/src/App.jsx))**:
  - Encapsulated by `AuthProvider` ([`AuthContext.jsx`](file:///d:/SETU/SETU/frontend/src/context/AuthContext.jsx)).
  - `MainLayout`: Renders persistent top navigation bar + responsive container for pages.

---

### 3.2 Key Pages Overview for Design Customization

1. **[`DistrictDashboard.jsx`](file:///d:/SETU/SETU/frontend/src/pages/DistrictDashboard.jsx)**:
   - **Header**: District status selector, emergency alert level.
   - **Stat Cards**: Critical demands count, active fleets, allocated supplies, matching score.
   - **Interactive Map Section**: Leaflet map displaying demand pins, supply routes, and district boundaries.
   - **AI Demand-Supply Matcher Widget**: AI recommendation table with action buttons (Approve/Dispatch).
   - **Real-time Feeds**: Live field updates, incoming SOS alerts.

2. **[`FieldOfficerPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/FieldOfficerPortal.jsx)**:
   - **Demand Logging Form**: Form for logging food, medical, shelter, or water needs with priority tag (Low/Medium/High/Critical).
   - **Field Status Map**: Local area map with field pin drops.
   - **Active Demands List**: Table/cards showing logged demands and fulfillment status.

3. **[`NgoPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/NgoPortal.jsx)**:
   - **Supply Registration**: Add relief goods (item type, quantity, unit, warehouse location).
   - **Active Supplies Grid**: Cards displaying registered stock and reserved items.
   - **Match Fulfillment Queue**: Pending requests awaiting NGO approval.

4. **[`TransportPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/TransportPortal.jsx)**:
   - **Fleet Overview**: Heavy trucks, boats, 4x4 vehicles, drones.
   - **Vehicle Capacity & Availability Controls**: Toggle status (Available / In Transit / Maintenance).
   - **Dispatch Orders**: Route navigation, cargo load specifications, delivery confirmation.

5. **[`CitizenPortal.jsx`](file:///d:/SETU/SETU/frontend/src/pages/CitizenPortal.jsx)**:
   - **Emergency SOS Button**: One-tap panic trigger for immediate location broadcast.
   - **Assistance Request Form**: Request food, water, medical kit, or evacuation.
   - **Shelter & Relief Map**: Nearby relief camps and medical camps.

6. **[`Login.jsx`](file:///d:/SETU/SETU/frontend/src/pages/Login.jsx) & [`Register.jsx`](file:///d:/SETU/SETU/frontend/src/pages/Register.jsx)**:
   - Modern glassmorphic login card with brand gradients, form validation, and role selection pills.

---

## 4. Design System & Theme Configuration

### 4.1 Color Palette (`tailwind.config.js`)
- **Primary Scale (MDoNER / Government Strategic Blue)**:
  - `primary-50`: `#f0f9ff`
  - `primary-100`: `#e0f2fe`
  - `primary-500`: `#0ea5e9`
  - `primary-600`: `#0284c7`
  - `primary-700`: `#0369a1`
  - `primary-900`: `#0c4a6e`
- **Backgrounds**: Slate scales (`bg-slate-50`, `bg-slate-900`, `bg-white`).
- **Status Colors**:
  - Red (`red-500` / `red-600`) - Critical / Emergency SOS
  - Amber (`amber-500`) - High Priority / In Transit
  - Green (`emerald-500` / `green-600`) - Fulfilled / Available

### 4.2 Icons & Mapping Libraries
- **Icon Set**: `lucide-react` (e.g. `Shield`, `Truck`, `HeartHandshake`, `AlertTriangle`, `MapPin`, `User`, `CheckCircle`).
- **Mapping**: `leaflet` & `react-leaflet` for GIS visualization.

---

## 5. Development & UI Modification Workflow

To run and preview UI design changes locally:

1. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```
2. **Start Vite Development Server**:
   ```bash
   npm run dev
   ```
3. **Build Production Bundle**:
   ```bash
   npm run build
   ```
