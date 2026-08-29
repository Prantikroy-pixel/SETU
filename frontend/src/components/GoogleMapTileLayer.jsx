import React from 'react';
import { TileLayer } from 'react-leaflet';

export default function GoogleMapTileLayer({ defaultLayer = 'roadmap' }) {
  // Google Maps tile URLs for different layer types
  const tileUrls = {
    roadmap: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    hybrid: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    terrain: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
  };

  const url = tileUrls[defaultLayer] || tileUrls.roadmap;

  return (
    <TileLayer
      url={url}
      attribution="&copy; Google Maps"
      maxNativeZoom={20}
      maxZoom={21}
      tileSize={256}
    />
  );
}
