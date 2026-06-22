"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { incidents, Incident } from "@/lib/incidents";

// Estilo oscuro CARTO Dark Matter (raster) — sin token, gratis.
const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "carto", type: "raster", source: "carto" }],
};

type Dept = {
  name: string;
  events: number;
  fatalities: number;
  injuries: number;
  intensity: number; // "tin": muertos*2 + heridos
  lon: number; // centro ponderado hacia lo mas grave
  lat: number;
};

function aggregate(rows: Incident[]): Dept[] {
  const map: Record<string, Dept & { wLon: number; wLat: number; w: number }> =
    {};
  for (const r of rows) {
    const name = r.departamento || "(s/d)";
    const harm = r.fatalities * 2 + r.injuries; // peso para mover el centro
    const w = harm + 1; // siempre cuenta al menos 1
    const d =
      map[name] ??
      (map[name] = {
        name,
        events: 0,
        fatalities: 0,
        injuries: 0,
        intensity: 0,
        lon: 0,
        lat: 0,
        wLon: 0,
        wLat: 0,
        w: 0,
      });
    d.events += 1;
    d.fatalities += r.fatalities;
    d.injuries += r.injuries;
    d.intensity += r.fatalities * 2 + r.injuries;
    d.wLon += r.lon * w;
    d.wLat += r.lat * w;
    d.w += w;
  }
  return Object.values(map).map((d) => ({
    name: d.name,
    events: d.events,
    fatalities: d.fatalities,
    injuries: d.injuries,
    intensity: d.intensity,
    lon: d.wLon / d.w,
    lat: d.wLat / d.w,
  }));
}

function toGeoJSON(depts: Dept[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: depts.map((d) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [d.lon, d.lat] },
      properties: { ...d },
    })),
  };
}

export default function Map() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [hover, setHover] = useState<{
    dept: Dept;
    x: number;
    y: number;
  } | null>(null);

  const depts = useMemo(() => aggregate(incidents), []);

  const stats = useMemo(() => {
    const events = incidents.length;
    const fatalities = incidents.reduce((s, r) => s + r.fatalities, 0);
    const injuries = incidents.reduce((s, r) => s + r.injuries, 0);
    const ranking = [...depts].sort((a, b) => b.intensity - a.intensity);
    const maxIntensity = Math.max(...depts.map((d) => d.intensity), 1);
    return { events, fatalities, injuries, ranking, maxIntensity };
  }, [depts]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [-74.3, 4.2],
      zoom: 5.2,
      attributionControl: false,
      // gestos cooperativos: Ctrl + rueda hace zoom, arrastrar mueve;
      // la rueda sola sigue desplazando la pagina (scroll por secciones)
      cooperativeGestures: true,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on("load", () => {
      // Contorno de Colombia (linea roja)
      map.addSource("colombia", { type: "geojson", data: "/colombia.geojson" });
      map.addLayer({
        id: "colombia-fill",
        type: "fill",
        source: "colombia",
        paint: { "fill-color": "#ef4444", "fill-opacity": 0.04 },
      });
      map.addLayer({
        id: "colombia-outline",
        type: "line",
        source: "colombia",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#ef4444",
          "line-width": 2.5,
          "line-opacity": 0.85,
        },
      });

      // Encuadrar Colombia con padding (en movil el panel ya no tapa el mapa)
      const isMobile = window.innerWidth < 640;
      map.fitBounds(
        [
          [-79.1, -4.4],
          [-66.7, 13.6],
        ],
        {
          padding: isMobile
            ? { top: 40, bottom: 40, left: 24, right: 24 }
            : { top: 90, bottom: 90, left: 90, right: 360 },
          duration: 0,
        }
      );

      map.addSource("depts", {
        type: "geojson",
        data: toGeoJSON(depts),
        generateId: true, // necesario para feature-state (hover)
      });

      // Halo difuso
      map.addLayer({
        id: "depts-glow",
        type: "circle",
        source: "depts",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "intensity"],
            0, 8, 5, 14, 20, 24, 50, 36,
          ],
          "circle-color": "#ef4444",
          "circle-opacity": 0.15,
          "circle-blur": 0.9,
        },
      });

      // Circulos por departamento (con estado hover en WebGL)
      map.addLayer({
        id: "depts-circles",
        type: "circle",
        source: "depts",
        paint: {
          // crece un poco al hacer hover
          "circle-radius": [
            "+",
            [
              "interpolate", ["linear"], ["get", "intensity"],
              0, 4, 5, 7, 20, 13, 50, 20,
            ],
            ["case", ["boolean", ["feature-state", "hover"], false], 4, 0],
          ],
          "circle-color": [
            "interpolate", ["linear"], ["get", "intensity"],
            0, "#fca5a5", 5, "#f87171", 12, "#ef4444", 25, "#b91c1c",
          ],
          // al hacer hover queda totalmente opaco
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1,
            [
              "interpolate", ["linear"], ["get", "intensity"],
              0, 0.7, 12, 0.88, 25, 1,
            ],
          ],
          // borde rojo mas grueso al hacer hover
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            4,
            2,
          ],
          "circle-stroke-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#fca5a5",
            "#ef4444",
          ],
          "circle-stroke-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1,
            [
              "interpolate", ["linear"], ["get", "intensity"],
              0, 0.5, 12, 0.8, 25, 1,
            ],
          ],
          // transiciones suaves
          "circle-radius-transition": { duration: 180, delay: 0 },
          "circle-stroke-width-transition": { duration: 180, delay: 0 },
          "circle-opacity-transition": { duration: 180, delay: 0 },
        },
      });

      let hoveredId: string | number | null = null;
      let hoveredCoords: [number, number] | null = null;

      map.on("mousemove", "depts-circles", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = "pointer";

        if (hoveredId !== null && hoveredId !== f.id) {
          map.setFeatureState({ source: "depts", id: hoveredId }, { hover: false });
        }
        hoveredId = f.id ?? null;
        if (hoveredId !== null) {
          map.setFeatureState({ source: "depts", id: hoveredId }, { hover: true });
        }

        const p = f.properties as unknown as Dept;
        const coords = (f.geometry as GeoJSON.Point).coordinates.slice() as [
          number,
          number
        ];
        hoveredCoords = coords;
        const pt = map.project(coords);
        setHover({ dept: p, x: pt.x, y: pt.y });
      });

      map.on("mouseleave", "depts-circles", () => {
        map.getCanvas().style.cursor = "";
        if (hoveredId !== null) {
          map.setFeatureState({ source: "depts", id: hoveredId }, { hover: false });
        }
        hoveredId = null;
        hoveredCoords = null;
        setHover(null);
      });

      // mantener el tooltip pegado al punto al mover/zoom el mapa
      map.on("move", () => {
        if (!hoveredCoords) return;
        const pt = map.project(hoveredCoords);
        setHover((h) => (h ? { ...h, x: pt.x, y: pt.y } : h));
      });
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [depts]);

  // tarjetas reutilizables (overlay en desktop / seccion en movil)
  const statsCard = (
    <div className="rounded-3xl border border-white/10 bg-black/80 p-4 backdrop-blur-md sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Todos los incidentes
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat value={stats.events} label="Eventos" color="text-red-300" />
        <Stat value={stats.fatalities} label="Muertos" color="text-red-500" />
        <Stat value={stats.injuries} label="Heridos" color="text-red-400" />
      </div>
    </div>
  );

  const rankingCard = (maxH: string) => (
    <div className="rounded-3xl border border-white/10 bg-black/80 p-4 backdrop-blur-md sm:p-5">
      <div className="mb-3 text-sm font-medium text-zinc-200">
        Intensidad por departamento
      </div>
      <div className={`no-scrollbar flex flex-col gap-2 overflow-y-auto pr-1 ${maxH}`}>
        {stats.ranking.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm sm:gap-3">
            <span className="w-20 shrink-0 truncate text-zinc-300 sm:w-28">
              {d.name}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-300 via-red-400 to-red-600"
                style={{
                  width: `${Math.max(
                    (d.intensity / stats.maxIntensity) * 100,
                    6
                  )}%`,
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right tabular-nums text-zinc-400">
              {d.intensity}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const legendCard = (
    <div className="rounded-3xl border border-white/10 bg-black/80 px-3 py-2.5 text-xs backdrop-blur-md sm:px-4 sm:py-3">
      <div className="mb-2 font-medium text-zinc-200">
        Intensidad (muertos×2 + heridos)
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <Dot size={9} color="#fca5a5" /> <span className="text-zinc-400">baja</span>
        <Dot size={14} color="#f87171" /> <span className="text-zinc-400">media</span>
        <Dot size={20} color="#b91c1c" /> <span className="text-zinc-400">alta</span>
      </div>
    </div>
  );

  return (
    <div className="map-dark relative flex min-h-screen w-full flex-col bg-[#0b0f14] text-zinc-100 sm:block sm:h-screen sm:min-h-0">
      {/* MAPA: altura fija en movil, llena la seccion en desktop */}
      <div className="relative h-[58vh] w-full sm:absolute sm:inset-0 sm:h-full">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />

        {/* Tooltip de los puntos (componente shadcn) */}
        <TooltipProvider delayDuration={0} disableHoverableContent>
          <Tooltip open={!!hover}>
            <TooltipTrigger asChild>
              <div
                className="pointer-events-none absolute"
                style={{
                  left: hover?.x ?? -9999,
                  top: hover?.y ?? -9999,
                  width: 1,
                  height: 1,
                }}
              />
            </TooltipTrigger>
            {hover && (
              <TooltipContent
                side="top"
                sideOffset={12}
                className="pointer-events-none max-w-[260px] rounded-2xl border-0 bg-black px-4 py-3 text-zinc-200 shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
              >
                <div className="text-[13px] font-semibold text-white">
                  {hover.dept.name}
                </div>
                <div className="mt-0.5 text-xs text-red-400">
                  {hover.dept.events} evento(s) · intensidad{" "}
                  {hover.dept.intensity}
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs font-semibold">
                  <span className="text-red-400">
                    {hover.dept.fatalities} muertos
                  </span>
                  <span className="text-red-300/80">
                    {hover.dept.injuries} heridos
                  </span>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Overlay derecho (solo desktop) */}
        <div className="absolute right-5 top-16 z-10 hidden w-[320px] max-w-[calc(100%-2.5rem)] flex-col gap-4 sm:flex">
          {statsCard}
          {rankingCard("max-h-[50vh]")}
        </div>

        {/* Leyenda (solo desktop) */}
        <div className="absolute bottom-6 left-5 z-10 hidden max-w-[calc(100%-2.5rem)] sm:block">
          {legendCard}
        </div>
      </div>

      {/* Panel como seccion aparte (solo movil) */}
      <div className="flex flex-col gap-3 px-4 py-6 sm:hidden">
        {statsCard}
        {rankingCard("")}
        {legendCard}
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div>
      <div className={`text-xl font-bold tabular-nums sm:text-2xl ${color}`}>
        {value.toLocaleString("es-CO")}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 sm:text-[11px]">
        {label}
      </div>
    </div>
  );
}

function Dot({ size, color }: { size: number; color: string }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: size, height: size, background: color, opacity: 0.85 }}
    />
  );
}
