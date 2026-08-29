import React, { useState } from 'react';
import { useMap } from 'react-leaflet';
import { Search, X } from 'lucide-react';

export default function MapPlaceSearchControl({ onSelectLocation }) {
  const map = useMap();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Using Nominatim (OpenStreetMap) for place search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=IN`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.warn('Place search error:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    // Center map on selected location
    if (map) {
      map.setView([lat, lon], 12);
    }

    // Callback to parent
    if (onSelectLocation) {
      onSelectLocation(lat, lon);
    }

    // Clear search
    setSearchQuery('');
    setSuggestions([]);
  };

  return (
    <div className="absolute top-3 left-3 z-400 w-64">
      <div className="relative">
        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 shadow-md px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 outline-none text-xs bg-transparent placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSuggestions([]);
              }}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {suggestions.map((place, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPlace(place)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs border-b border-slate-100 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-slate-900 line-clamp-1">{place.name}</div>
                <div className="text-[11px] text-slate-500 line-clamp-1">{place.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
