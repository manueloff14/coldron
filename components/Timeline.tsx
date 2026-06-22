"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { incidents, type Incident } from "@/lib/incidents";

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const TARGET_ES: Record<string, string> = {
  military: "objetivos militares",
  civilian: "civiles",
  infrastructure: "infraestructura",
  mixed: "objetivos mixtos",
  na: "objetivo s/d",
};

const METHOD_ES: Record<string, string> = {
  attack: "Ataque",
  bombing: "Bombardeo",
  surveillance: "Vigilancia",
  na: "Evento",
};

// "6/1/2018" o "2024-10..." -> Date | null
function parseDate(date: string): Date | null {
  const s = date.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 15);
  return null;
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

const impactOf = (i: Incident) => i.fatalities * 2 + i.injuries;

const H = 380; // alto del lienzo en px
const PAD = 28; // margen horizontal en px
const GAP = 1.5; // separacion entre puntos
const GOLDEN = 2.399963; // angulo aureo (rad)

type Pt = {
  inc: Incident;
  date: Date;
  r: number;
  impact: number;
  x: number; // px
  y: number; // px desde la linea central
};

export default function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const { points, ticks } = useMemo(() => {
    const parsed = incidents
      .map((inc) => ({ inc, date: parseDate(inc.date) }))
      .filter((p): p is { inc: Incident; date: Date } => p.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (parsed.length === 0) return { points: [] as Pt[], ticks: [] };

    const minT = parsed[0].date.getTime();
    const maxT = parsed[parsed.length - 1].date.getTime();
    const span = Math.max(1, maxT - minT);
    const maxImp = Math.max(1, ...parsed.map((p) => impactOf(p.inc)));
    const inner = Math.max(1, width - PAD * 2);

    // radio pequeno por impacto (escala de area)
    const radius = (imp: number) => 2.5 + Math.sqrt(imp / maxImp) * 7;

    // empaquetado 2D: cada punto busca un hueco cerca de (targetX, 0)
    // recorriendo una espiral; la componente horizontal se comprime
    // (X_STRETCH < 1) para no alejarse mucho de su fecha.
    const X_STRETCH = 0.45;
    const placed: Pt[] = [];

    for (const p of parsed) {
      const imp = impactOf(p.inc);
      const r = radius(imp);
      const tx = PAD + ((p.date.getTime() - minT) / span) * inner;

      let x = tx;
      let y = 0;
      // espiral aurea: distancia crece, angulo rota
      for (let k = 0; k < 600; k++) {
        const dist = Math.sqrt(k) * (r + GAP) * 0.9;
        const ang = k * GOLDEN;
        const cx = tx + Math.cos(ang) * dist * X_STRETCH;
        const cy = Math.sin(ang) * dist;
        if (Math.abs(cy) > H / 2 - r) continue;
        let ok = true;
        for (const q of placed) {
          const dx = cx - q.x;
          const dy = cy - q.y;
          if (dx * dx + dy * dy < (r + q.r + GAP) ** 2) {
            ok = false;
            break;
          }
        }
        if (ok) {
          x = cx;
          y = cy;
          break;
        }
      }
      placed.push({ inc: p.inc, date: p.date, r, impact: imp, x, y });
    }

    const N = width < 520 ? 4 : width < 820 ? 6 : 8;
    const tk = Array.from({ length: N }, (_, i) => {
      const t = minT + (span * i) / (N - 1);
      const d = new Date(t);
      return {
        x: PAD + (i / (N - 1)) * inner,
        label: `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      };
    });

    return { points: placed, ticks: tk };
  }, [width]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Eventos de mayor impacto
      </h2>
      <p className="mt-2 text-sm text-zinc-400 sm:text-base">
        Cada punto es un incidente · el tamaño refleja{" "}
        <span className="font-medium text-red-400">víctimas</span> (muertes y
        heridos). Pasa el cursor para ver el detalle.
      </p>

      <TooltipProvider delayDuration={80} disableHoverableContent>
        <div
          ref={ref}
          className="relative mt-12 w-full"
          style={{ height: H }}
        >
          {/* linea central del eje */}
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-px bg-white/10" />

          {/* puntos */}
          {points.map((p, i) => (
            <Tooltip key={`${p.inc.id}-${i}`}>
              <TooltipTrigger asChild>
                <button
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-300/30 bg-red-500/70 outline-none transition-all duration-150 hover:z-20 hover:border-red-200 hover:bg-red-500 hover:shadow-[0_0_12px_rgba(239,68,68,0.7)] focus-visible:border-red-200"
                  style={{
                    left: p.x,
                    top: `calc(50% + ${p.y}px)`,
                    width: p.r * 2,
                    height: p.r * 2,
                  }}
                  aria-label={`${p.inc.municipio} ${fmtDate(p.date)}`}
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="pointer-events-none max-w-[260px] rounded-2xl border border-white/10 bg-[#0f141b] px-4 py-3 text-zinc-200 shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
              >
                <div className="text-[13px] font-semibold text-white">
                  {METHOD_ES[p.inc.method] ?? "Evento"} en {p.inc.municipio}
                  <span className="font-normal text-zinc-500">
                    {" "}· {fmtDate(p.date)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {p.inc.departamento} · involucra{" "}
                  <span className="font-medium text-zinc-200">
                    {p.inc.perpetrator}
                  </span>{" "}
                  contra{" "}
                  <span className="font-medium text-zinc-200">
                    {TARGET_ES[p.inc.target] ?? p.inc.target}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs font-semibold">
                  <span className="text-red-400">
                    {p.inc.fatalities} muertes
                  </span>
                  <span className="text-red-300/80">
                    {p.inc.injuries} heridos
                  </span>
                </div>
                {p.inc.notes && (
                  <div className="mt-2 border-t border-white/8 pt-2 text-[11px] leading-relaxed text-zinc-500">
                    {p.inc.notes}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* eje X */}
          <div className="absolute -bottom-8 left-0 right-0">
            {ticks.map((t, i) => (
              <span
                key={i}
                className="absolute -translate-x-1/2 text-[11px] text-zinc-500"
                style={{ left: t.x }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
