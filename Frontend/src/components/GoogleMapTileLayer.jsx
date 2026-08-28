import React, { useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { Layers, Map as MapIcon, Globe, Mountain } from 'lucide-react';

export const GOOGLE_MAP_LAYERS = {
  roadmap: {
    id: 'roadmap',
    name: 'Google Roadmap',
    icon: '🗺️',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 21,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>',
  },
  satellite: {
    id: 'satellite',
    name: 'Google Satellite (Hybrid)',
    icon: '🛰️',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 21,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Satellite</a>',
  },
  terrain: {
    id: 'terrain',
    name: 'Google Terrain',
    icon: '⛰️',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Terrain</a>',
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: '🌐',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

export default function GoogleMapTileLayer({ defaultLayer = 'roadmap', showSwitcher = true }) {
  const [activeLayerId, setActiveLayerId] = useState(defaultLayer);
  const [isOpen, setIsOpen] = useState(false);

  const activeLayer = GOOGLE_MAP_LAYERS[activeLayerId] || GOOGLE_MAP_LAYERS.roadmap;

  return (
    <>
      <TileLayer
        key={activeLayer.id}
        url={activeLayer.url}
        subdomains={activeLayer.subdomains}
        maxZoom={activeLayer.maxZoom}
        attribution={activeLayer.attribution}
      />

      {showSwitcher && (
        <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto', marginTop: '12px', marginRight: '12px' }}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 p-2 rounded-xl shadow-lg border border-slate-200/90 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:shadow-xl active:scale-95"
              title="Switch Google Maps Style"
            >
              <span className="text-base leading-none">{activeLayer.icon}</span>
              <span className="hidden sm:inline text-[11px] font-extrabold">{activeLayer.name}</span>
              <Layers className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
            </button>

            {isOpen && (
              <div
                className="absolute right-0 top-11 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/90 p-2 z-[1000] w-48 space-y-1 animate-in fade-in zoom-in-95 duration-150 select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-slate-100">
                  Google Map Layers
                </div>

                {Object.values(GOOGLE_MAP_LAYERS).map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      setActiveLayerId(layer.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                      activeLayerId === layer.id
                        ? 'bg-blue-50 text-blue-700 font-extrabold shadow-2xs border border-blue-200/80'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{layer.icon}</span>
                      <span className="text-[11px]">{layer.name}</span>
                    </span>
                    {activeLayerId === layer.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
