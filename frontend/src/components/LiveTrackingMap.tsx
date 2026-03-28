"use client";

// This component is always loaded via dynamic() with ssr:false,
// so top-level Leaflet imports are safe here.
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface TrackingData {
  rider_lat: number | null;
  rider_lon: number | null;
  rider_name: string | null;
  dest_lat: number | null;
  dest_lon: number | null;
  dest_address: string | null;
  origin_lat: number | null;
  origin_lon: number | null;
  distance_km: number | null;
  eta_minutes: number | null;
  status: string;
  rider_updated_at: string | null;
}

interface Props {
  data: TrackingData;
  className?: string;
  height?: string;
}

// Fix Leaflet default icon broken by webpack/Next.js
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// Addis Ababa center
const DEFAULT_CENTER: [number, number] = [9.0054, 38.7636];

function makeRiderIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:44px;height:44px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(249,115,22,0.25);animation:lm-ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 8px rgba(249,115,22,0.5);display:flex;align-items:center;justify-content:center;font-size:18px;">🚴</div>
    </div>
    <style>@keyframes lm-ping{75%,100%{transform:scale(2);opacity:0}}</style>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function makeDestIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:44px;display:flex;flex-direction:column;align-items:center;">
      <div style="width:32px;height:32px;border-radius:50%;background:#10b981;border:3px solid white;box-shadow:0 2px 8px rgba(16,185,129,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;">📍</div>
      <div style="width:2px;height:10px;background:#10b981;"></div>
    </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  });
}

function makeOriginIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:8px;background:#6366f1;border:3px solid white;box-shadow:0 2px 8px rgba(99,102,241,0.5);display:flex;align-items:center;justify-content:center;font-size:16px;">🏪</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function LiveTrackingMap({ data, className = "", height = "400px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const riderRef     = useRef<L.Marker | null>(null);
  const routeRef     = useRef<L.Polyline | null>(null);
  const [routeError, setRouteError] = useState(false);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    fixLeafletIcons();

    const center: [number, number] =
      data.rider_lat && data.rider_lon ? [data.rider_lat, data.rider_lon]
      : data.dest_lat && data.dest_lon ? [data.dest_lat, data.dest_lon]
      : DEFAULT_CENTER;

    const map = L.map(containerRef.current, { center, zoom: 14, zoomControl: true });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current  = null;
      riderRef.current = null;
      routeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update markers + route when data changes ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Rider marker
    if (data.rider_lat && data.rider_lon) {
      const pos: [number, number] = [data.rider_lat, data.rider_lon];
      if (riderRef.current) {
        riderRef.current.setLatLng(pos);
      } else {
        riderRef.current = L.marker(pos, { icon: makeRiderIcon() })
          .addTo(map)
          .bindPopup(`<b>🚴 ${data.rider_name || "Rider"}</b><br/><small>Live location</small>`);
      }
    }

    // Destination marker
    if (data.dest_lat && data.dest_lon) {
      L.marker([data.dest_lat, data.dest_lon], { icon: makeDestIcon() })
        .addTo(map)
        .bindPopup(`<b>📍 Delivery Address</b><br/><small>${data.dest_address || "Destination"}</small>`);
    }

    // Origin marker
    if (data.origin_lat && data.origin_lon) {
      L.marker([data.origin_lat, data.origin_lon], { icon: makeOriginIcon() })
        .addTo(map)
        .bindPopup("<b>🏪 Pickup Point</b>");
    }

    // Route via OSRM (free, no API key)
    const drawRoute = async () => {
      if (routeRef.current) { map.removeLayer(routeRef.current); routeRef.current = null; }

      const from = data.rider_lat && data.rider_lon
        ? { lat: data.rider_lat, lon: data.rider_lon }
        : data.origin_lat && data.origin_lon
        ? { lat: data.origin_lat, lon: data.origin_lon }
        : null;
      const to = data.dest_lat && data.dest_lon
        ? { lat: data.dest_lat, lon: data.dest_lon }
        : null;

      if (!from || !to) return;

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error("OSRM error");
        const json = await res.json();
        const coords: [number, number][] = json.routes?.[0]?.geometry?.coordinates;
        if (!coords?.length) throw new Error("No route");

        const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);
        routeRef.current = L.polyline(latLngs, {
          color: "#f97316", weight: 5, opacity: 0.85,
          dashArray: data.status === "assigned" ? "10,6" : undefined,
        }).addTo(map);
        setRouteError(false);
      } catch {
        setRouteError(true);
        if (from && to) {
          routeRef.current = L.polyline(
            [[from.lat, from.lon], [to.lat, to.lon]],
            { color: "#f97316", weight: 3, opacity: 0.6, dashArray: "8,6" }
          ).addTo(map);
        }
      }
    };

    drawRoute();

    // Fit bounds
    const pts: [number, number][] = [];
    if (data.rider_lat && data.rider_lon) pts.push([data.rider_lat, data.rider_lon]);
    if (data.dest_lat   && data.dest_lon)  pts.push([data.dest_lat,  data.dest_lon]);
    if (data.origin_lat && data.origin_lon) pts.push([data.origin_lat, data.origin_lon]);

    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
    } else if (pts.length === 1) {
      map.setView(pts[0], 15);
    }
  }, [data]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />
      {routeError && (
        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-gray-500 shadow backdrop-blur-sm dark:bg-gray-900/90">
          ⚠️ Showing straight-line route
        </div>
      )}
    </div>
  );
}
