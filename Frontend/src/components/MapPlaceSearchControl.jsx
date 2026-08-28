import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Search, MapPin, Loader2, X, Navigation, Compass } from 'lucide-react';

// Fast local index of major Northeast Indian cities, corridors, and strategic hubs
const PRESET_PLACES = [
  { name: 'Guwahati Strategic Hub', district: 'Kamrup Metro', state: 'Assam', lat: 26.1445, lon: 91.7362 },
  { name: 'Dispur State Capital', district: 'Kamrup Metro', state: 'Assam', lat: 26.1500, lon: 91.7900 },
  { name: 'Shillong Hill Pass', district: 'East Khasi Hills', state: 'Meghalaya', lat: 25.5788, lon: 91.8933 },
  { name: 'Silchar Central Depot', district: 'Cachar', state: 'Assam', lat: 24.8333, lon: 92.7789 },
  { name: 'Jowai Pass Checkpoint', district: 'West Jaintia Hills', state: 'Meghalaya', lat: 25.4450, lon: 92.2080 },
  { name: 'Lumshnong Vulnerable Pass', district: 'East Jaintia Hills', state: 'Meghalaya', lat: 25.1812, lon: 92.3800 },
  { name: 'Khliehriat HQ', district: 'East Jaintia Hills', state: 'Meghalaya', lat: 25.3110, lon: 92.3680 },
  { name: 'Nongpoh Transit Point', district: 'Ri-Bhoi', state: 'Meghalaya', lat: 25.9015, lon: 91.8804 },
  { name: 'Karimganj Border Hub', district: 'Karimganj', state: 'Assam', lat: 24.8650, lon: 92.3580 },
  { name: 'Hailakandi Sector', district: 'Hailakandi', state: 'Assam', lat: 24.6833, lon: 92.5667 },
  { name: 'Haflong Hill Station', district: 'Dima Hasao', state: 'Assam', lat: 25.1680, lon: 93.0250 },
  { name: 'Maibang Bypass', district: 'Dima Hasao', state: 'Assam', lat: 25.3200, lon: 93.1200 },
  { name: 'Lumding Corridor', district: 'Hojai', state: 'Assam', lat: 25.7500, lon: 93.1700 },
  { name: 'Nagaon Junction', district: 'Nagaon', state: 'Assam', lat: 26.3450, lon: 92.6840 },
  { name: 'Tezpur Bridge Point', district: 'Sonitpur', state: 'Assam', lat: 26.6528, lon: 92.7926 },
  { name: 'Jorhat Eastern Sector', district: 'Jorhat', state: 'Assam', lat: 26.7509, lon: 94.2037 },
  { name: 'Dibrugarh Terminal', district: 'Dibrugarh', state: 'Assam', lat: 27.4728, lon: 94.9120 },
  { name: 'Aizawl Gateway', district: 'Aizawl', state: 'Mizoram', lat: 23.7271, lon: 92.7176 },
  { name: 'Agartala Capital', district: 'West Tripura', state: 'Tripura', lat: 23.8315, lon: 91.2868 },
  { name: 'Kohima Pass', district: 'Kohima', state: 'Nagaland', lat: 25.6751, lon: 94.1086 },
  { name: 'Imphal Valley Hub', district: 'Imphal West', state: 'Manipur', lat: 24.8170, lon: 93.9368 },
];

const searchPinIcon = new L.DivIcon({
  className: 'search-target-pin',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 24px; height: 24px; border-radius: 50%; background: #2563EB; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

export default function MapPlaceSearchControl({ onSelectLocation, className = '' }) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = useCallback(async (text) => {
    if (!text || text.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const clean = text.trim().toLowerCase();
    
    // 1. Fast local preset match
    const localMatches = PRESET_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(clean) ||
        p.district.toLowerCase().includes(clean) ||
        p.state.toLowerCase().includes(clean)
    ).map((p) => ({
      display_name: `${p.name}, ${p.district}, ${p.state}`,
      lat: p.lat,
      lon: p.lon,
      source: 'preset',
    }));

    setResults(localMatches);
    setIsOpen(true);

    // 2. Fetch live OpenStreetMap Nominatim results
    setSearching(true);
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        text.trim()
      )}&countrycodes=in&limit=5`;
      const response = await fetch(nominatimUrl, {
        headers: { 'Accept-Language': 'en' },
      });
      if (response.ok) {
        const data = await response.json();
        const osmResults = data.map((item) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          source: 'osm',
        }));

        // Merge without exact duplicates
        const combined = [...localMatches];
        for (const r of osmResults) {
          if (!combined.some((c) => Math.abs(c.lat - r.lat) < 0.05 && Math.abs(c.lon - r.lon) < 0.05)) {
            combined.push(r);
          }
        }
        setResults(combined);
      }
    } catch {
      // Keep local matches if offline
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      searchPlaces(val);
    }, 280);
  };

  const handleSelectPlace = (place) => {
    setQuery(place.display_name.split(',')[0]);
    setIsOpen(false);
    setSelectedPlace(place);

    // Fly map smoothly to location
    map.flyTo([place.lat, place.lon], 13, { duration: 1.2 });

    // Notify parent
    if (onSelectLocation) {
      onSelectLocation(place.lat, place.lon, place.display_name);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedPlace(null);
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`leaflet-top leaflet-left z-[1000] p-2.5 pointer-events-auto ${className}`}
        style={{ marginTop: '4px', marginLeft: '4px', maxWidth: '320px', width: '90vw' }}
      >
        <div className="relative shadow-lg rounded-xl overflow-visible bg-white/95 backdrop-blur-md border border-slate-300/80">
          <div className="flex items-center px-3 py-2 gap-2">
            {searching ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
                else if (query.trim().length >= 2) searchPlaces(query);
              }}
              placeholder="Search area, town, or district..."
              className="w-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none pr-1"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {isOpen && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Matching Locations</span>
                <span className="text-primary font-mono">{results.length} found</span>
              </div>
              {results.map((r, idx) => (
                <button
                  key={`loc-${idx}`}
                  type="button"
                  onClick={() => handleSelectPlace(r)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-primary/5 hover:text-primary transition-colors flex items-start gap-2.5 cursor-pointer group"
                >
                  <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary mt-0.5 shrink-0 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 group-hover:text-primary leading-tight truncate">
                      {r.display_name.split(',')[0]}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {r.display_name.split(',').slice(1).join(',').trim() || `${r.lat.toFixed(3)}°N, ${r.lon.toFixed(3)}°E`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Searched Location Marker on Map */}
      {selectedPlace && (
        <Marker position={[selectedPlace.lat, selectedPlace.lon]} icon={searchPinIcon}>
          <Popup>
            <div className="text-xs p-1 space-y-1">
              <div className="font-extrabold text-blue-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedPlace.display_name.split(',')[0]}</span>
              </div>
              <div className="text-slate-600 text-[11px]">
                {selectedPlace.display_name}
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100">
                Coordinates: {selectedPlace.lat.toFixed(5)}°N, {selectedPlace.lon.toFixed(5)}°E
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}
