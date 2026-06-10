import type maplibregl from 'maplibre-gl';

export type GraffitiGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, unknown>>;

/** Draws the default lime glow pin used when a graffiti point has no photo. */
export function createGraffitiPinImage(map: maplibregl.Map): void {
  const size = 28;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  // Outer glow
  const grd = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r + 3);
  grd.addColorStop(0, 'rgba(202,255,0,0.55)');
  grd.addColorStop(1, 'rgba(202,255,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Main circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#CAFF00';
  ctx.fill();

  // Dark inner border
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, size / 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,20,0,0.65)';
  ctx.fill();

  map.addImage('graffiti-pin', ctx.getImageData(0, 0, size, size));
}

/**
 * Builds circular photo markers for graffiti points that carry a photo URL.
 * Deliberately called lazily — only once the graffiti layer first becomes
 * visible — so the photos never cost bandwidth while the layer is off.
 */
export function loadGraffitiPhotoMarkers(
  map: maplibregl.Map,
  geojson: GraffitiGeoJSON,
): void {
  for (const feat of geojson.features) {
    const photoUrl = feat.properties?.photo;
    if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') continue;
    if (map.hasImage(photoUrl)) continue;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = photoUrl;
    img.onload = () => {
      const size = 44;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cx = size / 2;
      const cy = size / 2;
      const r = size / 2 - 2;

      // Glowing border
      ctx.shadowColor = 'rgba(202, 255, 0, 0.75)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#CAFF00';
      ctx.fill();

      // Crop clip
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, r - 2.5, 0, Math.PI * 2);
      ctx.clip();

      // Draw cropped center of the image
      const minS = Math.min(img.width, img.height);
      ctx.drawImage(
        img,
        (img.width - minS) / 2,
        (img.height - minS) / 2,
        minS, minS,
        2, 2,
        size - 4, size - 4,
      );

      const imgData = ctx.getImageData(0, 0, size, size);
      if (map.getStyle() && !map.hasImage(photoUrl)) {
        map.addImage(photoUrl, imgData);
        map.triggerRepaint();
      }
    };
    // Loading failures fall back silently to the default pin
    img.onerror = () => {};
  }
}
