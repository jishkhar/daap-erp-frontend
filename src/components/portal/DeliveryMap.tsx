"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";
import type {
  DeliveryMap as MapData,
  ZoneCheck,
} from "@/hooks/useDeliveryZones";

/** One colour per zone, in zone order (wraps after eight). Chosen to stay apart on the light map tiles. */
export const ZONE_COLOURS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#9333ea",
  "#dc2626",
  "#0891b2",
  "#be185d",
  "#65a30d",
];
const INDIA: [[number, number], [number, number]] = [
  [6.5, 68],
  [35.7, 97.4],
];

type Leaflet = typeof import("leaflet");
type Drawn = {
  L: Leaflet;
  map: LeafletMap;
  dots: LayerGroup;
  marks: LayerGroup;
};

/** Draw the zones' pincodes, the branches and the checked pincode on an existing map. */
function paint(
  { L, map, dots, marks }: Drawn,
  data: MapData,
  checked?: ZoneCheck | null,
) {
  dots.clearLayers();
  marks.clearLayers();
  const renderer = L.canvas({ padding: 0.3 });
  const labelled = data.points.length < 3000; // a tooltip per dot is fine for a region, too heavy for all of India
  for (const [pin, lat, lng, zone] of data.points) {
    const dot = L.circleMarker([lat, lng], {
      renderer,
      radius: 2.5,
      stroke: false,
      fillOpacity: 0.75,
      fillColor: ZONE_COLOURS[zone % ZONE_COLOURS.length],
    });
    if (labelled) dot.bindTooltip(`${pin} · ${data.zones[zone]?.name ?? ""}`);
    dot.addTo(dots);
  }
  for (const b of data.branches) {
    L.circleMarker([b.latitude, b.longitude], {
      radius: 8,
      color: "#111827",
      weight: 2,
      fillColor: b.delivers ? "#ffffff" : "#9ca3af",
      fillOpacity: 1,
    })
      .bindTooltip(
        `${b.name}${b.delivers ? "" : " (doesn't deliver online orders)"}`,
        { permanent: data.branches.length <= 6, direction: "top" },
      )
      .addTo(marks);
  }
  const at = checked?.place;
  if (at?.latitude == null || at.longitude == null) return;
  L.circleMarker([at.latitude, at.longitude], {
    radius: 9,
    color: checked?.deliverable ? "#16a34a" : "#dc2626",
    weight: 3,
    fillOpacity: 0.2,
  })
    .bindTooltip(`${checked?.pincode} · ${at.district}`, {
      permanent: true,
      direction: "right",
    })
    .addTo(marks);
  const b = checked?.branch;
  if (b?.latitude != null && b.longitude != null) {
    L.polyline(
      [
        [b.latitude, b.longitude],
        [at.latitude, at.longitude],
      ],
      { color: "#111827", weight: 2, dashArray: "6 6" },
    ).addTo(marks);
    map.fitBounds(
      L.latLngBounds([
        [b.latitude, b.longitude],
        [at.latitude, at.longitude],
      ]).pad(0.6),
      { maxZoom: 10 },
    );
  } else {
    map.setView([at.latitude, at.longitude], 9);
  }
}

/** The owner's delivery map: every pincode a zone covers as a dot in its zone's colour, the branches, and the last checked pincode with a
 * line to the branch that would ship it. Drawn on one canvas so all ~19,000 dots stay quick. Map: OpenStreetMap tiles. */
export function DeliveryMap({
  data,
  checked,
}: {
  data: MapData;
  checked?: ZoneCheck | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drawn = useRef<Drawn | null>(null);
  const latest = useRef({ data, checked });

  useEffect(() => {
    latest.current = { data, checked };
    if (drawn.current) paint(drawn.current, data, checked);
  }, [data, checked]);

  useEffect(() => {
    let gone = false;
    void import("leaflet").then((L) => {
      if (gone || !box.current || drawn.current) return;
      const map = L.map(box.current, {
        preferCanvas: true,
        zoomSnap: 0.5,
        minZoom: 4,
      }).fitBounds(INDIA);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 14,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      drawn.current = {
        L,
        map,
        dots: L.layerGroup().addTo(map),
        marks: L.layerGroup().addTo(map),
      };
      paint(drawn.current, latest.current.data, latest.current.checked);
    });
    return () => {
      gone = true;
      drawn.current?.map.remove();
      drawn.current = null;
    };
  }, []);

  return (
    <div
      ref={box}
      className="h-[420px] w-full overflow-hidden rounded-md border border-line"
      aria-label="Delivery map"
      role="img"
    />
  );
}
