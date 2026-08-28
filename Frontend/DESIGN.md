# SETU — Strategic Command Portal Design System (`DESIGN.md`)

Welcome to the **SETU** Design System Specification. This document outlines the updated visual theme, typography, color tokens, layout specifications, component rules, and Material iconography implemented in the SETU Disaster Response Command Portal.

---

## 1. Design System & Theme Identity

The SETU Command Portal utilizes a high-contrast, dual-tier command header aesthetic with ambient blurred gradient cards, Google Material Symbols, and precise government strategic blue tones.

```
+-------------------------------------------------------------------------------+
|  TOP OPERATIONAL BAR: Operational status dot | UTC clock | Language | Role   |
+-------------------------------------------------------------------------------+
|  MAIN NAVY HEADER: #001736 (Deep Navy) | Logo S | SETU | Upper Nav Tabs       |
+-------------------------------------------------------------------------------+
|  MAIN CONTAINER: Gradient from #F0F9FF (Command Start) to #FFFFFF (End)        |
+-------------------------------------------------------------------------------+
```

---

## 2. Color Tokens & Theme System (`tailwind.config.js`)

### 2.1 Primary & Secondary Palette
- **Primary Navy** (`#001736`): Top main header, primary buttons, logo badge background.
- **Primary Container** (`#002b5b`): Sub-headers & secondary action containers.
- **Secondary Blue** (`#006591`): Active fleets metric, logistics highlights.
- **Secondary Container** (`#39b8fd`): Ambient blue glow background accents.
- **Tertiary Dark** (`#2f0c00`): Inventory level metrics & progress bars.

### 2.2 Status & Priority Badges
| Status Indicator | Hex Code | Utility Class | Usage |
| :--- | :--- | :--- | :--- |
| **Status Optimal** | `#10B981` | `bg-status-optimal text-white` | Operational, Ready, Verified Fit |
| **Status Moderate** | `#F59E0B` | `bg-status-moderate text-white` | Warning, Transit delays, Medium priority |
| **Status Critical** | `#DC2626` | `bg-status-critical text-white` | Urgent SOS, Severe Bottlenecks |

### 2.3 Background & Surface Scales
- **Page Background**: `bg-background` (`#faf9fe`)
- **Page Gradient**: `from-command-bg-start (#F0F9FF)` to `to-command-bg-end (#FFFFFF)`
- **Card Surface Lowest**: `bg-surface-container-lowest` (`#ffffff`)
- **Card Surface Low**: `bg-surface-container-low` (`#f4f3f8`)
- **Card Border**: `border-outline-variant/30` (`#c4c6d0`)

---

## 3. Typography Rules

Powered by Google Fonts (`Manrope` for display headlines & metrics, `Hanken Grotesk` for body text and uppercase label caps).

| Typography Class | Font Family | Size / Line Height | Usage |
| :--- | :--- | :--- | :--- |
| `font-headline-lg` | Manrope (Bold 700) | `32px` / `40px` | Page titles (`District Overview`) |
| `font-headline-md` | Manrope (SemiBold 600) | `24px` / `32px` | Section titles (`Tactical GIS Map`, `AI Matcher`) |
| `font-headline-sm` | Manrope (SemiBold 600) | `20px` / `28px` | Card headers (`Active Fleets`, `Relief Demands`) |
| `font-metric-value` | Manrope (Bold 700) | `28px` / `1.1` | Display numbers (`34`, `142`, `94%`) |
| `font-label-caps` | Hanken Grotesk (Bold 700) | `12px` / `16px` | Uppercase tracking labels & badges |
| `font-body-md` | Hanken Grotesk (Regular 400) | `16px` / `24px` | Standard paragraph body |
| `font-body-sm` | Hanken Grotesk (Regular 400) | `14px` / `20px` | Secondary caption text |

---

## 4. Component Layout Specifications

### 4.1 Ambient Glow Stat Cards
- **HTML Container**: `bg-surface-container-lowest rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow relative overflow-hidden group`
- **Glow Background Element**: `absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-secondary-container/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500`

### 4.2 Tactical Map Container
- **Leaflet Overlay**: `w-full flex-1 rounded-lg relative overflow-hidden border border-outline-variant/30`
- **Legend Box**: `absolute bottom-4 right-4 bg-surface-container-lowest/90 backdrop-blur p-3 rounded-xl shadow-lg border border-outline-variant/30 z-[1000]`

### 4.3 AI Matcher & Data Tables
- **Header Row**: `text-label-caps font-label-caps text-on-surface-variant uppercase border-b border-surface-variant`
- **Action Buttons**: `bg-primary text-on-primary px-4 py-1.5 rounded-full text-label-caps font-label-caps hover:bg-primary/90 transition-colors shadow-sm`

---

## 5. Summary & Key Code References

- **Header Component**: [`Navbar.jsx`](file:///d:/SETU/SETU/frontend/src/components/Navbar.jsx)
- **App Shell & Footer**: [`App.jsx`](file:///d:/SETU/SETU/frontend/src/App.jsx)
- **District Command Dashboard**: [`DistrictDashboard.jsx`](file:///d:/SETU/SETU/frontend/src/pages/DistrictDashboard.jsx)
- **Auth Forms**: [`Login.jsx`](file:///d:/SETU/SETU/frontend/src/pages/Login.jsx) & [`Register.jsx`](file:///d:/SETU/SETU/frontend/src/pages/Register.jsx)
- **Tailwind Tokens**: [`tailwind.config.js`](file:///d:/SETU/SETU/frontend/tailwind.config.js)
